import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ASSESSMENT_ADAPTERS,
  REQUIRED_EVIDENCE_CATEGORIES,
  STANDARD_REPORT_TEMPLATE,
  SUPERVISOR_REVIEWED_REPORT_STYLE,
  preflightLocalReportPilot,
  runLocalReportPilot,
} from './local-report-pilot.js'
import { helperInstallState } from './helper-metadata.js'
import { localLicenseReadiness } from './license-readiness.js'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const webDir = join(rootDir, 'web')
const port = Number(process.env.PORT || 4181)
const portDiscovery = {
  host: '127.0.0.1',
  defaultPort: 4181,
  startPort: 4181,
  endPort: 4199,
}
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
const pickerTimeoutMs = 10 * 60 * 1000
const standardTemplateOnlyMessage = 'Customer Word templates are disabled for this workflow. SkillCascade uses the standard initial assessment template automatically.'
let activePicker = null

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
    'access-control-allow-credentials': 'true',
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

function pathPickerSupported() {
  return process.platform === 'win32'
}

function dialogValue(value, fallback = '') {
  return String(value || fallback).slice(0, 500)
}

function runPowerShellPicker(script, envOverrides = {}) {
  if (activePicker) {
    return Promise.reject(new Error('A local folder chooser is already open. Select a folder or cancel the open chooser before trying again.'))
  }

  return new Promise((resolvePicker, rejectPicker) => {
    if (!pathPickerSupported()) {
      rejectPicker(new Error('Local path picker is currently supported on Windows helper installations.'))
      return
    }

    let stdout = ''
    let stderr = ''
    let settled = false
    let timer
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-STA',
      '-WindowStyle',
      'Normal',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script,
    ], {
      env: { ...process.env, ...envOverrides },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: false,
    })
    activePicker = child

    const finish = (callback) => {
      if (settled) return
      settled = true
      if (activePicker === child) activePicker = null
      clearTimeout(timer)
      callback()
    }

    timer = setTimeout(() => {
      child.kill()
      finish(() => rejectPicker(new Error('Path chooser timed out before a selection was made.')))
    }, pickerTimeoutMs)

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })
    child.on('error', (error) => {
      finish(() => rejectPicker(error))
    })
    child.on('close', (code) => {
      finish(() => {
        if (code === 0) {
          const selectedPath = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) || ''
          resolvePicker(selectedPath)
          return
        }
        rejectPicker(new Error(stderr.trim() || `Path chooser exited with code ${code}.`))
      })
    })
  })
}

async function chooseLocalFolder({ title, defaultPath } = {}) {
  return runPowerShellPicker(`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Windows.Forms.Application]::EnableVisualStyles()
$owner = New-Object System.Windows.Forms.Form
$owner.Text = 'SkillCascade folder chooser'
$owner.StartPosition = 'CenterScreen'
$owner.Size = New-Object System.Drawing.Size(320, 90)
$owner.TopMost = $true
$owner.ShowInTaskbar = $true
$owner.Show()
$owner.Activate()

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = if ($env:SC_PICKER_TITLE) { $env:SC_PICKER_TITLE } else { 'Choose folder' }
$dialog.CheckFileExists = $false
$dialog.CheckPathExists = $true
$dialog.ValidateNames = $false
$dialog.Multiselect = $false
$dialog.FileName = 'Select this folder'
if ($env:SC_PICKER_DEFAULT -and (Test-Path -LiteralPath $env:SC_PICKER_DEFAULT)) {
  $item = Get-Item -LiteralPath $env:SC_PICKER_DEFAULT
  if ($item.PSIsContainer) {
    $dialog.InitialDirectory = $item.FullName
  } else {
    $dialog.InitialDirectory = $item.DirectoryName
  }
}
try {
  if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
    $selectedPath = $dialog.FileName
    if (Test-Path -LiteralPath $selectedPath -PathType Container) {
      Write-Output $selectedPath
    } else {
      Write-Output (Split-Path -Parent $selectedPath)
    }
  }
} finally {
  $owner.Close()
  $owner.Dispose()
}
`, {
    SC_PICKER_TITLE: dialogValue(title, 'Choose folder'),
    SC_PICKER_DEFAULT: dialogValue(defaultPath),
  })
}

async function chooseLocalFile({ title, defaultPath, filter } = {}) {
  return runPowerShellPicker(`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = if ($env:SC_PICKER_TITLE) { $env:SC_PICKER_TITLE } else { 'Choose file' }
$dialog.Filter = if ($env:SC_PICKER_FILTER) { $env:SC_PICKER_FILTER } else { 'Word documents (*.docx)|*.docx|All files (*.*)|*.*' }
$dialog.CheckFileExists = $true
$dialog.Multiselect = $false
if ($env:SC_PICKER_DEFAULT -and (Test-Path -LiteralPath $env:SC_PICKER_DEFAULT)) {
  $item = Get-Item -LiteralPath $env:SC_PICKER_DEFAULT
  if ($item.PSIsContainer) {
    $dialog.InitialDirectory = $item.FullName
  } else {
    $dialog.InitialDirectory = $item.DirectoryName
    $dialog.FileName = $item.Name
  }
}
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.FileName }
`, {
    SC_PICKER_TITLE: dialogValue(title, 'Choose file'),
    SC_PICKER_DEFAULT: dialogValue(defaultPath),
    SC_PICKER_FILTER: dialogValue(filter, 'Word documents (*.docx)|*.docx|All files (*.*)|*.*'),
  })
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
        helperUrl: `http://127.0.0.1:${port}`,
        port,
        portDiscovery,
        helperVersion: installState.helperVersion,
        installState,
        licenseReadiness,
        supportedSourceExtensions: ['.docx', '.txt', '.md'],
        sourceScanning: 'recursive-with-output-folder-exclusion-and-same-folder-artifact-skip',
        unsupportedFileBehavior: 'warn-do-not-extract',
        output: 'editable-docx',
        standardTemplate: STANDARD_REPORT_TEMPLATE,
        supervisorReviewedStyle: SUPERVISOR_REVIEWED_REPORT_STYLE,
        templateMode: STANDARD_REPORT_TEMPLATE.mode,
        customerTemplateUpload: false,
        requiredEvidenceCategories: REQUIRED_EVIDENCE_CATEGORIES,
        assessmentAdapters: ASSESSMENT_ADAPTERS.map((adapter) => ({
          id: adapter.id,
          label: adapter.label,
          kind: adapter.kind,
          use: adapter.use,
        })),
        endpoints: {
          installState: helperEndpoint('/install-state'),
          licenseReadiness: helperEndpoint('/license-readiness'),
          pickFolder: helperEndpoint('/pick-folder'),
          preflight: helperEndpoint('/preflight'),
          run: helperEndpoint('/run'),
        },
        legacyEndpoints: {
          installState: legacyHelperEndpoint('/install-state'),
          licenseReadiness: legacyHelperEndpoint('/license-readiness'),
          pickFolder: legacyHelperEndpoint('/pick-folder'),
          preflight: legacyHelperEndpoint('/preflight'),
          run: legacyHelperEndpoint('/run'),
        },
        pathPickers: {
          supported: pathPickerSupported(),
          platform: process.platform,
          mode: 'local-native-dialog',
          folderEndpoint: helperEndpoint('/pick-folder'),
          returnsPathOnly: true,
        },
        templatePolicy: {
          customerTemplateUpload: false,
          customTemplateAccepted: false,
          mode: STANDARD_REPORT_TEMPLATE.mode,
          message: standardTemplateOnlyMessage,
        },
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

    if (isHelperEndpoint(pathname, '/pick-folder') && method === 'POST') {
      try {
        const body = await readJsonBody(req)
        const selectedPath = await chooseLocalFolder(body)
        sendJson(res, {
          ok: true,
          result: {
            kind: 'folder',
            canceled: !selectedPath,
            path: selectedPath,
          },
        }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
      return
    }

    if (isHelperEndpoint(pathname, '/pick-file') && method === 'POST') {
      try {
        const body = await readJsonBody(req)
        const selectedPath = await chooseLocalFile(body)
        sendJson(res, {
          ok: true,
          result: {
            kind: 'file',
            canceled: !selectedPath,
            path: selectedPath,
          },
        }, corsHeaders)
      } catch (error) {
        sendError(res, 400, error.message, corsHeaders)
      }
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
      sendError(res, 410, standardTemplateOnlyMessage, corsHeaders)
      return
    }

    if (isHelperEndpoint(pathname, '/template-profiles') && method === 'GET') {
      sendError(res, 410, standardTemplateOnlyMessage, corsHeaders)
      return
    }

    if (isHelperEndpoint(pathname, '/template-profiles') && method === 'POST') {
      sendError(res, 410, standardTemplateOnlyMessage, corsHeaders)
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
