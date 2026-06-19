import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCHEMA_VERSION = 'skillcascade-report-generator-passage-credential-v1';
const FALLBACK_KEY_BYTES = 32;

function getLocalAppDataRoot() {
  return process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
}

export function getLocalPassageCredentialDir(rootDir) {
  if (process.env.REPORT_HELPER_PASSAGE_LOCAL_CREDENTIAL_DIR) {
    return process.env.REPORT_HELPER_PASSAGE_LOCAL_CREDENTIAL_DIR;
  }
  if (process.env.PASSAGE_LOCAL_CREDENTIAL_DIR) {
    return process.env.PASSAGE_LOCAL_CREDENTIAL_DIR;
  }
  if (rootDir) {
    return path.join(rootDir, '.local', 'passage-credentials');
  }
  return path.join(getLocalAppDataRoot(), 'SkillCascade', 'ReportGenerator', 'passage-credentials');
}

export function normalizeCredentialScope(value) {
  const raw = String(value || 'default').trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'default';
}

function getCredentialPaths({ rootDir, credentialScope }) {
  const dir = getLocalPassageCredentialDir(rootDir);
  const scope = normalizeCredentialScope(credentialScope);
  return {
    dir,
    scope,
    credentialPath: path.join(dir, `${scope}.json`),
    keyPath: path.join(dir, '.fallback-key'),
  };
}

export function fingerprintAccount(account) {
  const normalized = String(account || '').trim().toLowerCase();
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function maskAccount(account) {
  const normalized = String(account || '').trim();
  if (!normalized) return '';
  const [name, domain] = normalized.split('@');
  if (!domain) return `${normalized.slice(0, 2)}***`;
  const visible = name.length <= 2 ? name[0] || '' : name.slice(0, 2);
  return `${visible}***@${domain}`;
}

function encodeDpapiJson(payload) {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, 'utf8').toString('base64');
  const script = [
    "$ErrorActionPreference='Stop'",
    `$bytes=[Convert]::FromBase64String('${encoded}')`,
    '$protected=[System.Security.Cryptography.ProtectedData]::Protect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
    '[Convert]::ToBase64String($protected)',
  ].join(';');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'DPAPI protect failed').trim());
  }
  return result.stdout.trim();
}

function decodeDpapiJson(cipherText) {
  const safeText = String(cipherText || '').replace(/'/g, "''");
  const script = [
    "$ErrorActionPreference='Stop'",
    `$protected=[Convert]::FromBase64String('${safeText}')`,
    '$bytes=[System.Security.Cryptography.ProtectedData]::Unprotect($protected,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
    '[Text.Encoding]::UTF8.GetString($bytes)',
  ].join(';');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'DPAPI unprotect failed').trim());
  }
  return JSON.parse(result.stdout.trim());
}

async function getFallbackKey(keyPath) {
  try {
    const existing = await fs.readFile(keyPath);
    if (existing.length >= FALLBACK_KEY_BYTES) return existing.subarray(0, FALLBACK_KEY_BYTES);
  } catch {
    // Missing fallback key is expected on first setup.
  }
  const key = crypto.randomBytes(FALLBACK_KEY_BYTES);
  await fs.mkdir(path.dirname(keyPath), { recursive: true });
  await fs.writeFile(keyPath, key, { mode: 0o600 });
  return key;
}

async function encodeFallbackJson(payload, keyPath) {
  const key = await getFallbackKey(keyPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

async function decodeFallbackJson(record, keyPath) {
  const key = await getFallbackKey(keyPath);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.data, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function saveLocalPassageCredential({ rootDir, credentialScope, email, username, password }) {
  const account = normalizeEmail(email || username);
  const secret = String(password || '');
  if (!account) throw new Error('Passage login email is required.');
  if (!secret) throw new Error('Passage password is required.');

  const { dir, credentialPath, keyPath, scope } = getCredentialPaths({ rootDir, credentialScope });
  await fs.mkdir(dir, { recursive: true });

  const payload = {
    schema: SCHEMA_VERSION,
    account,
    password: secret,
    savedAt: new Date().toISOString(),
  };

  let record;
  try {
    record = {
      schema: SCHEMA_VERSION,
      scope,
      protectedBy: 'windows-dpapi-current-user',
      accountFingerprint: fingerprintAccount(account),
      accountMasked: maskAccount(account),
      savedAt: payload.savedAt,
      payload: encodeDpapiJson(payload),
    };
  } catch {
    record = {
      schema: SCHEMA_VERSION,
      scope,
      protectedBy: 'local-aes-256-gcm',
      accountFingerprint: fingerprintAccount(account),
      accountMasked: maskAccount(account),
      savedAt: payload.savedAt,
      payload: await encodeFallbackJson(payload, keyPath),
    };
  }

  await fs.writeFile(credentialPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  return readLocalPassageCredentialSummary({ rootDir, credentialScope: scope });
}

export async function loadLocalPassageCredential({ rootDir, credentialScope } = {}) {
  const { credentialPath, keyPath, scope } = getCredentialPaths({ rootDir, credentialScope });
  if (!existsSync(credentialPath)) return null;
  const record = JSON.parse(await fs.readFile(credentialPath, 'utf8'));
  if (record.schema !== SCHEMA_VERSION) {
    throw new Error('Saved Passage credential uses an unsupported schema.');
  }

  let payload;
  if (record.protectedBy === 'windows-dpapi-current-user') {
    payload = decodeDpapiJson(record.payload);
  } else if (record.protectedBy === 'local-aes-256-gcm') {
    payload = await decodeFallbackJson(record.payload, keyPath);
  } else {
    throw new Error('Saved Passage credential uses an unsupported protection mode.');
  }

  const account = normalizeEmail(payload.account);
  return {
    credentialScope: scope,
    account,
    email: account,
    username: account,
    password: String(payload.password || ''),
    accountFingerprint: fingerprintAccount(account),
    accountMasked: maskAccount(account),
    savedAt: record.savedAt || payload.savedAt || null,
    protectedBy: record.protectedBy,
  };
}

export async function readLocalPassageCredentialSummary({ rootDir, credentialScope } = {}) {
  const { credentialPath, scope } = getCredentialPaths({ rootDir, credentialScope });
  if (!existsSync(credentialPath)) {
    return {
      configured: false,
      credentialScope: scope,
      accountMasked: '',
      accountFingerprint: '',
      savedAt: null,
      protectedBy: '',
    };
  }

  const record = JSON.parse(await fs.readFile(credentialPath, 'utf8'));
  return {
    configured: true,
    credentialScope: scope,
    accountMasked: record.accountMasked || '',
    accountFingerprint: record.accountFingerprint || '',
    savedAt: record.savedAt || null,
    protectedBy: record.protectedBy || '',
  };
}

export async function deleteLocalPassageCredential({ rootDir, credentialScope } = {}) {
  const { credentialPath, scope } = getCredentialPaths({ rootDir, credentialScope });
  try {
    await fs.rm(credentialPath, { force: true });
  } catch {
    // Missing credentials are already cleared.
  }
  return readLocalPassageCredentialSummary({ rootDir, credentialScope: scope });
}
