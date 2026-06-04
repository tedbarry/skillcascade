import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preflightLocalReportPilot, runLocalReportPilot } from './local-report-pilot.js'
import { profileTemplate, SUPPORTED_TEMPLATE_FIELDS } from './template-profile.js'
import { listTemplateProfiles, saveTemplateProfile } from './template-profile-store.js'
import { helperInstallState } from './helper-metadata.js'
import { localLicenseReadiness } from './license-readiness.js'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const webDir = join(rootDir, 'web')
const port = Number(process.env.PORT || 4181)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://www.skillcascade.com',
  'https://skillcascade.com',
]
const configuredAllowedOrigins = (process.env.REPORT_HELPER_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins])
const helperApiPrefix = '/api/local-report-generator'
const legacyHelperApiPrefix = '/api/local-report-pilot'

function isHelperEndpoint(pathname, endpoint) {
  return pathname === `${helperApiPrefix}${endpoint}` || pathname === `${legacyHelperApiPrefix}${endpoint}`
}

function helperEndpoint(endpoint) {
  return `${helperApiPrefix}${endpoint}`
}

function legacyHelperEndpoint(endpoint) {
  return `${legacyHelperApiPrefix}${endpoint}`
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

function buildCorsHeaders(req) {
  const origin = req.headers.origin
  if (!origin || !allowedOrigins.has(origin)) return {}

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': req.headers['access-control-request-headers'] || 'content-type, authorization',
    'access-control-max-age': '86400',
    'access-control-allow-private-network': 'true',
    vary: 'Origin',
  }
}

function sendJson(res, value, headers = {}) {
  res.writeHead(200, { ...headers, 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value, null, 2))
}

function sendError(res, statusCode, message, headers = {}) {
  res.writeHead(statusCode, { ...headers, 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ ok: false, error: message }, null, 2))
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text.trim()) return {}
  return JSON.parse(text)
}

function safePath(urlPath) {
  const pathOnly = (urlPath || '/').split('?')[0]
  const requested = pathOnly === '/' ? '/index.html' : pathOnly
  const decoded = decodeURIComponent(requested)
  const resolved = normalize(join(webDir, decoded))
  if (!resolved.startsWith(webDir)) return null
  return resolved
}

createServer(async (req, res) => {
  const corsHeaders = buildCorsHeaders(req)

  try {
    const method = req.method || 'GET'
    const url = req.url || '/'
    const requestUrl = new URL(url, `http://${req.headers.host || '127.0.0.1'}`)
    const pathname = requestUrl.pathname

    if (method === 'OPTIONS') {
      const statusCode = req.headers.origin && !Object.keys(corsHeaders).length ? 403 : 204
      res.writeHead(statusCode, corsHeaders)
      res.end()
      return
    }

    if (isHelperEndpoint(pathname, '/status')) {
      const installState = await helperInstallState()
      const licenseReadiness = await localLicenseReadiness()
      sendJson(res, {
        ok: true,
        localOnly: true,
        mode: 'skillcascade-report-generator-release-v1',
        helperVersion: installState.helperVersion,
        installState,
        licenseReadiness,
        supportedSourceExtensions: ['.docx', '.txt', '.md'],
        sourceScanning: 'recursive-with-output-folder-exclusion',
        unsupportedFileBehavior: 'warn-do-not-extract',
        output: 'editable-docx',
        endpoints: {
          installState: helperEndpoint('/install-state'),
          licenseReadiness: helperEndpoint('/license-readiness'),
          templateProfile: helperEndpoint('/template-profile'),
          templateProfiles: helperEndpoint('/template-profiles'),
          preflight: helperEndpoint('/preflight'),
          run: helperEndpoint('/run'),
        },
        legacyEndpoints: {
          installState: legacyHelperEndpoint('/install-state'),
          licenseReadiness: legacyHelperEndpoint('/license-readiness'),
          templateProfile: legacyHelperEndpoint('/template-profile'),
          templateProfiles: legacyHelperEndpoint('/template-profiles'),
          preflight: legacyHelperEndpoint('/preflight'),
          run: legacyHelperEndpoint('/run'),
        },
        supportedTemplateFields: SUPPORTED_TEMPLATE_FIELDS,
        safety: {
          cloudUpload: false,
          liveExternalWrites: false,
          autoSign: false,
          autoSubmit: false,
        },
        skillCascadeBridge: {
          allowedOrigins: defaultAllowedOrigins,
          extraOriginsEnv: 'REPORT_HELPER_ALLOWED_ORIGINS',
        },
      }, corsHeaders)
      return
    }

    if (isHelperEndpoint(pathname, '/install-state') && method === 'GET') {
      try {
        const result = await helperInstallState()
        sendJson(res, { ok: true, result }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    if (isHelperEndpoint(pathname, '/license-readiness') && method === 'GET') {
      try {
        const result = await localLicenseReadiness()
        sendJson(res, { ok: true, result }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    if (isHelperEndpoint(pathname, '/template-profile') && method === 'POST') {
      try {
        const body = await readJsonBody(req)
        const profile = await profileTemplate(body)
        sendJson(res, { ok: true, profile }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    if (isHelperEndpoint(pathname, '/template-profiles') && method === 'GET') {
      try {
        const result = await listTemplateProfiles()
        sendJson(res, { ok: true, result }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    if (isHelperEndpoint(pathname, '/template-profiles') && method === 'POST') {
      try {
        const body = await readJsonBody(req)
        const result = await saveTemplateProfile(body)
        sendJson(res, { ok: true, result }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    if (isHelperEndpoint(pathname, '/preflight') && method === 'POST') {
      try {
        const body = await readJsonBody(req)
        const result = await preflightLocalReportPilot(body)
        sendJson(res, { ok: true, result }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    if (isHelperEndpoint(pathname, '/run') && method === 'POST') {
      try {
        const body = await readJsonBody(req)
        const result = await runLocalReportPilot(body)
        sendJson(res, { ok: true, result }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    const path = safePath(req.url || '/')
    if (!path) {
      res.writeHead(403, corsHeaders)
      res.end('Forbidden')
      return
    }

    const body = await readFile(path)
    res.writeHead(200, { ...corsHeaders, 'content-type': contentTypes[extname(path)] || 'application/octet-stream' })
    res.end(body)
  } catch (error) {
    res.writeHead(404, { ...corsHeaders, 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Not found: ${error.message}`)
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`SkillCascade Report Generator helper running at http://127.0.0.1:${port}`)
})
