import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const selfPath = path.resolve(fileURLToPath(import.meta.url))
const startRoot = path.resolve(process.cwd())
const roots = [startRoot]

if (path.basename(startRoot) === '_SkillCascade') {
  const adminRoot = path.resolve(startRoot, '..', '_SkillCascadeAdmin')
  if (fs.existsSync(adminRoot)) roots.push(adminRoot)
}

const ignoreDirs = new Set([
  '.git',
  '.wrangler',
  'node_modules',
  'dist',
  'dist-ssr',
  'playwright-report',
  'test-results',
  'outputs',
])

const ignoredDirPrefixes = [
  'dist-',
]

const scannedExtensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.toml',
  '.yml',
  '.yaml',
])

const ignoredFiles = new Set([
  'package-lock.json',
])

const rules = [
  {
    id: 'hardcoded-postgres-superuser-url',
    pattern: /postgresql:\/\/postgres:[^'"`\s]+/i,
    help: 'Use DATABASE_URL from a managed secret or local ignored env file.',
  },
  {
    id: 'direct-anthropic-endpoint',
    pattern: /https:\/\/api\.anthropic\.com/i,
    help: 'PHI-capable AI must route through AWS Bedrock, not direct Anthropic endpoints.',
  },
  {
    id: 'anthropic-api-key-env',
    pattern: /\bANTHROPIC_API_KEY\b/,
    help: 'Do not wire PHI-capable workflows to direct Anthropic API keys.',
  },
  {
    id: 'direct-openai-api-key-env',
    pattern: /\bOPENAI_API_KEY\b/,
    help: 'Do not wire PHI-capable workflows to direct OpenAI API keys.',
  },
  {
    id: 'deprecated-bedrock-haiku',
    pattern: /claude-3-5-haiku-20241022/i,
    help: 'Use the approved current Bedrock Haiku model alias.',
  },
  {
    id: 'deprecated-bedrock-sonnet',
    pattern: /claude-sonnet-4-20250514/i,
    help: 'Use the approved current Bedrock Sonnet model alias.',
  },
  {
    id: 'centralreach-credential-assignment',
    pattern: /\bCENTRALREACH_(?:USERNAME|PASSWORD)\s*=/i,
    help: 'CentralReach credentials must stay in ignored local secrets or a credential vault.',
  },
  {
    id: 'local-paste-cache-secret-source',
    pattern: /(?:\.claude[/\\]paste-cache|paste-cache)/i,
    help: 'Do not source credentials from local paste-cache files; use explicit ignored env files or managed secrets.',
  },
]

function shouldIgnoreDir(name) {
  if (ignoreDirs.has(name)) return true
  return ignoredDirPrefixes.some(prefix => name.startsWith(prefix))
}

function shouldScanFile(filePath) {
  if (path.resolve(filePath) === selfPath) return false
  const name = path.basename(filePath)
  if (ignoredFiles.has(name)) return false
  return scannedExtensions.has(path.extname(name))
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!shouldIgnoreDir(entry.name)) yield* walk(fullPath)
      continue
    }
    if (entry.isFile() && shouldScanFile(fullPath)) yield fullPath
  }
}

const findings = []

for (const root of roots) {
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8')
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const rule of rules) {
        if (rule.pattern.test(line)) {
          findings.push({
            repo: path.basename(root),
            file,
            line: i + 1,
            rule,
          })
        }
      }
    }
  }
}

if (findings.length > 0) {
  console.error('\nPHI productization guardrails failed.\n')
  for (const finding of findings) {
    const rel = path.relative(path.dirname(finding.file).startsWith(startRoot) ? startRoot : path.dirname(startRoot), finding.file)
    console.error(`- [${finding.repo}] ${rel}:${finding.line} ${finding.rule.id}`)
    console.error(`  ${finding.rule.help}`)
  }
  console.error('\nFix the above before continuing PHI-capable product work.\n')
  process.exit(1)
}

console.log(`PHI productization guardrails passed across ${roots.length} repo(s).`)
