import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  fingerprintAccount,
  loadLocalPassageCredential,
  normalizeCredentialScope,
  readLocalPassageCredentialSummary,
} from './passage-local-credentials.js';

export const PASSAGE_ORIGIN = 'https://clinical.passagehealth.com';
export const PASSAGE_DASHBOARD_URL = `${PASSAGE_ORIGIN}/dashboard`;
export const PASSAGE_SIGNIN_URL = `${PASSAGE_ORIGIN}/signin`;
export const DEFAULT_PASSAGE_CDP_URL = 'http://127.0.0.1:9233';

const SHARED_BROWSER_DEBUG_PORT = 9223;
const CONNECT_TIMEOUT_MS = 2500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeMessage(error) {
  return error instanceof Error ? error.message : String(error || 'Unknown Passage session error.');
}

function getLocalAppDataRoot() {
  return process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
}

function getDefaultProfileDir() {
  return (
    process.env.REPORT_HELPER_PASSAGE_CHROME_PROFILE_DIR ||
    path.join(getLocalAppDataRoot(), 'SkillCascade', 'ReportGenerator', 'PassageChrome')
  );
}

function parseCdpUrl(raw) {
  const value = String(raw || DEFAULT_PASSAGE_CDP_URL).trim() || DEFAULT_PASSAGE_CDP_URL;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Passage browser debug URL must use http://127.0.0.1.');
  }
  const host = parsed.hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('Passage browser debug URL must point to this computer only.');
  }
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Passage browser debug URL must include a valid port.');
  }
  return { url: `${parsed.protocol}//${parsed.host}`, port };
}

export function normalizePassageCdpUrl(raw) {
  return parseCdpUrl(raw).url;
}

function assertSafeCdpPort(cdpUrl) {
  const { port } = parseCdpUrl(cdpUrl);
  if (port === SHARED_BROWSER_DEBUG_PORT) {
    throw new Error('Passage tree setup cannot use the shared browser debug port. Use the managed Passage port 9233.');
  }
  return port;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || CONNECT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function probePassageCdp(cdpUrl = DEFAULT_PASSAGE_CDP_URL) {
  let normalized;
  try {
    normalized = normalizePassageCdpUrl(cdpUrl);
    assertSafeCdpPort(normalized);
  } catch (error) {
    return {
      ready: false,
      cdpUrl: cdpUrl || DEFAULT_PASSAGE_CDP_URL,
      blocker: safeMessage(error),
    };
  }

  try {
    const version = await fetchJson(`${normalized}/json/version`);
    return {
      ready: true,
      cdpUrl: normalized,
      browser: version.Browser || version['User-Agent'] || 'Chrome',
      webSocketDebuggerUrl: version.webSocketDebuggerUrl || '',
    };
  } catch (error) {
    return {
      ready: false,
      cdpUrl: normalized,
      blocker: safeMessage(error),
    };
  }
}

function findChromeExecutable() {
  const candidates = [
    process.env.REPORT_HELPER_CHROME_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(getLocalAppDataRoot(), 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

export async function ensurePassageDebugBrowser({ cdpUrl, startUrl = PASSAGE_DASHBOARD_URL, profileDir } = {}) {
  const normalized = normalizePassageCdpUrl(cdpUrl || DEFAULT_PASSAGE_CDP_URL);
  const port = assertSafeCdpPort(normalized);
  const existing = await probePassageCdp(normalized);
  if (existing.ready) return existing;

  const available = await isPortAvailable(port);
  if (!available) {
    throw new Error(`The managed Passage browser port ${port} is already in use by another local app.`);
  }

  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error('Chrome or Edge was not found on this computer.');
  }

  const safeProfileDir = profileDir || getDefaultProfileDir();
  await fs.mkdir(safeProfileDir, { recursive: true });

  const args = [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--remote-allow-origins=*',
    `--user-data-dir=${safeProfileDir}`,
    '--profile-directory=Default',
    '--no-first-run',
    '--no-default-browser-check',
    startUrl,
  ];
  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(500);
    const launched = await probePassageCdp(normalized);
    if (launched.ready) return launched;
  }

  throw new Error('The managed Passage browser did not become ready.');
}

async function listChromeTabs(cdpUrl) {
  return fetchJson(`${normalizePassageCdpUrl(cdpUrl)}/json/list`, { timeoutMs: 5000 });
}

async function openChromeTab(cdpUrl, url) {
  const target = `${normalizePassageCdpUrl(cdpUrl)}/json/new?${encodeURIComponent(url)}`;
  try {
    await fetchJson(target, { method: 'PUT', timeoutMs: 5000 });
  } catch {
    await fetchJson(target, { method: 'GET', timeoutMs: 5000 });
  }
}

async function getOrCreatePassageTab(cdpUrl) {
  const normalized = normalizePassageCdpUrl(cdpUrl);
  let tabs = await listChromeTabs(normalized);
  let tab = tabs.find((candidate) => candidate.type === 'page' && String(candidate.url || '').startsWith(PASSAGE_ORIGIN));
  if (!tab) {
    await openChromeTab(normalized, PASSAGE_DASHBOARD_URL);
    await sleep(750);
    tabs = await listChromeTabs(normalized);
    tab = tabs.find((candidate) => candidate.type === 'page' && String(candidate.url || '').startsWith(PASSAGE_ORIGIN));
  }
  if (!tab?.webSocketDebuggerUrl) {
    throw new Error('No controllable Passage tab was available in the managed browser.');
  }
  return tab;
}

async function withCdpSession(cdpUrl, callback) {
  if (typeof WebSocket !== 'function') {
    throw new Error('This helper runtime does not support browser automation sockets. Install the latest helper.');
  }
  const tab = await getOrCreatePassageTab(cdpUrl);
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  let counter = 0;
  const pending = new Map();

  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out connecting to the Passage browser.')), 5000);
    socket.addEventListener('open', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('Could not connect to the Passage browser tab.'));
    });
  });

  socket.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(message.error.message || 'Chrome DevTools command failed.'));
    } else {
      resolve(message.result || {});
    }
  });

  await ready;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  try {
    return await callback(send);
  } finally {
    try {
      socket.close();
    } catch {
      // Browser socket cleanup is best effort.
    }
  }
}

async function navigatePassageTab(cdpUrl, url) {
  await withCdpSession(cdpUrl, async (send) => {
    await send('Page.enable');
    await send('Page.navigate', { url });
  });
  await sleep(1250);
}

async function evaluatePassageTab(cdpUrl, expression) {
  return withCdpSession(cdpUrl, async (send) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    return result.result?.value;
  });
}

async function getCookieHeaderFromCdp(cdpUrl) {
  return withCdpSession(cdpUrl, async (send) => {
    await send('Network.enable');
    const result = await send('Network.getCookies', { urls: [PASSAGE_ORIGIN] });
    const cookies = Array.isArray(result.cookies) ? result.cookies : [];
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  });
}

async function clearPassageSession(cdpUrl) {
  await withCdpSession(cdpUrl, async (send) => {
    await send('Network.enable');
    await send('Network.clearBrowserCookies');
    await send('Runtime.evaluate', {
      expression: `(() => {
        try { window.localStorage.clear(); } catch {}
        try { window.sessionStorage.clear(); } catch {}
        return true;
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
  });
}

async function fetchPassageProfile(cookieHeader) {
  if (!cookieHeader) return null;
  const encodedInput = encodeURIComponent(JSON.stringify({ json: null, meta: { values: ['undefined'] } }));
  const response = await fetch(`${PASSAGE_ORIGIN}/api/trpc/users.profile?batch=1&input=${encodedInput}`, {
    headers: {
      Accept: 'application/json',
      Cookie: cookieHeader,
      Referer: `${PASSAGE_ORIGIN}/dashboard`,
    },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.[0]?.result?.data?.json || null;
}

function collectStrings(value, strings = []) {
  if (value == null) return strings;
  if (typeof value === 'string') {
    strings.push(value);
    return strings;
  }
  if (typeof value !== 'object') return strings;
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, strings));
    return strings;
  }
  Object.values(value).forEach((item) => collectStrings(item, strings));
  return strings;
}

function findProfileEmail(profile) {
  const values = collectStrings(profile);
  return values.find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))?.trim().toLowerCase() || '';
}

function buildAccountProof(profile, credentialSummary) {
  const profileEmail = findProfileEmail(profile);
  const profileFingerprint = fingerprintAccount(profileEmail);
  const configuredFingerprint = credentialSummary?.accountFingerprint || '';
  const safe = Boolean(profileFingerprint && configuredFingerprint && profileFingerprint === configuredFingerprint);
  return {
    safe,
    profileDetected: Boolean(profile),
    profileEmailMasked: profileEmail ? profileEmail.replace(/^(.{0,2}).*(@.*)$/, '$1***$2') : '',
    profileFingerprint,
    configuredFingerprint,
    reason: safe
      ? 'configured_account_verified'
      : profileEmail
        ? 'browser_account_does_not_match_saved_credential'
        : 'passage_account_not_detected',
  };
}

function buildLoginExpression(email, password) {
  return `(() => {
    const email = ${JSON.stringify(email)};
    const password = ${JSON.stringify(password)};
    const setValue = (element, value) => {
      const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor && descriptor.set) descriptor.set.call(element, value);
      else element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const emailInput = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
    const passwordInput = document.querySelector('input[type="password"], input[name*="password" i], input[id*="password" i]');
    if (!emailInput || !passwordInput) {
      return { ok: false, reason: 'login_fields_not_found', url: location.href, title: document.title };
    }
    setValue(emailInput, email);
    setValue(passwordInput, password);
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    const submit = buttons.find((button) => /sign\\s*in|log\\s*in|continue|submit/i.test(button.textContent || button.value || ''))
      || document.querySelector('button[type="submit"], input[type="submit"]');
    if (submit) {
      submit.click();
      return { ok: true, clicked: true, url: location.href, title: document.title };
    }
    const form = passwordInput.closest('form') || emailInput.closest('form');
    if (form && form.requestSubmit) {
      form.requestSubmit();
      return { ok: true, submitted: true, url: location.href, title: document.title };
    }
    return { ok: false, reason: 'submit_button_not_found', url: location.href, title: document.title };
  })()`;
}

export function getReportPassageCredentialContract() {
  return {
    accessMode: 'configured_account_verified_browser_session',
    credentialStorage: 'local-current-user-vault',
    credentialNeverReturnedToWebsite: true,
    accountGateRequired: true,
    defaultCdpUrl: DEFAULT_PASSAGE_CDP_URL,
    sharedBrowserPortBlocked: SHARED_BROWSER_DEBUG_PORT,
    endpoints: {
      status: '/api/local-report-generator/passage-credential/status',
      setup: '/api/local-report-generator/passage-credential/setup',
      verify: '/api/local-report-generator/passage-credential/verify',
      clear: '/api/local-report-generator/passage-credential/clear',
      startBrowser: '/api/local-report-generator/passage-browser/start',
    },
  };
}

export async function buildPassageAccountGate({ rootDir, credentialScope, cdpUrl, verifyLogin = false } = {}) {
  const scope = normalizeCredentialScope(credentialScope);
  const normalizedCdpUrl = normalizePassageCdpUrl(cdpUrl || process.env.REPORT_HELPER_PASSAGE_CDP_URL || process.env.PASSAGE_CDP_URL || DEFAULT_PASSAGE_CDP_URL);
  const credentialSetup = await readLocalPassageCredentialSummary({ rootDir, credentialScope: scope });

  if (verifyLogin) {
    const verified = await ensureVerifiedPassageSession({ rootDir, credentialScope: scope, cdpUrl: normalizedCdpUrl });
    return {
      ready: verified.accountProof.safe,
      cdpUrl: normalizedCdpUrl,
      credentialScope: scope,
      credentialSetup,
      chromeDebug: verified.chromeDebug,
      accountProof: verified.accountProof,
    };
  }

  const chromeDebug = await probePassageCdp(normalizedCdpUrl);
  let accountProof = null;
  if (chromeDebug.ready && credentialSetup.configured) {
    try {
      const cookieHeader = await getCookieHeaderFromCdp(normalizedCdpUrl);
      const profile = await fetchPassageProfile(cookieHeader);
      accountProof = buildAccountProof(profile, credentialSetup);
    } catch (error) {
      accountProof = {
        safe: false,
        profileDetected: false,
        reason: safeMessage(error),
        profileFingerprint: '',
        configuredFingerprint: credentialSetup.accountFingerprint || '',
      };
    }
  }

  return {
    ready: Boolean(accountProof?.safe),
    cdpUrl: normalizedCdpUrl,
    credentialScope: scope,
    credentialSetup,
    chromeDebug,
    accountProof,
  };
}

export async function ensureVerifiedPassageSession({ rootDir, credentialScope, cdpUrl } = {}) {
  const scope = normalizeCredentialScope(credentialScope);
  const normalizedCdpUrl = normalizePassageCdpUrl(cdpUrl || process.env.REPORT_HELPER_PASSAGE_CDP_URL || process.env.PASSAGE_CDP_URL || DEFAULT_PASSAGE_CDP_URL);
  const credential = await loadLocalPassageCredential({ rootDir, credentialScope: scope });
  if (!credential?.email || !credential?.password) {
    throw new Error('Set up the saved Passage login before creating a live learning tree.');
  }

  const chromeDebug = await ensurePassageDebugBrowser({ cdpUrl: normalizedCdpUrl });
  let cookieHeader = await getCookieHeaderFromCdp(normalizedCdpUrl);
  let profile = await fetchPassageProfile(cookieHeader);
  let accountProof = buildAccountProof(profile, credential);
  if (accountProof.safe) {
    return { cookieHeader, accountProof, chromeDebug, cdpUrl: normalizedCdpUrl };
  }

  if (accountProof.profileDetected && accountProof.profileFingerprint && accountProof.profileFingerprint !== credential.accountFingerprint) {
    await clearPassageSession(normalizedCdpUrl);
  }

  await navigatePassageTab(normalizedCdpUrl, PASSAGE_SIGNIN_URL);
  const loginResult = await evaluatePassageTab(normalizedCdpUrl, buildLoginExpression(credential.email, credential.password));
  if (!loginResult?.ok) {
    throw new Error(`Could not start Passage login automatically (${loginResult?.reason || 'unknown login form'}). Open the managed Passage browser, sign in with the saved account, then try again.`);
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(1500);
    cookieHeader = await getCookieHeaderFromCdp(normalizedCdpUrl);
    profile = await fetchPassageProfile(cookieHeader);
    accountProof = buildAccountProof(profile, credential);
    if (accountProof.safe) {
      return { cookieHeader, accountProof, chromeDebug, cdpUrl: normalizedCdpUrl };
    }
  }

  throw new Error('Passage login was not verified. If MFA is required, complete it in the managed Passage browser and click Verify saved login.');
}
