import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const targetArg = process.argv[2]

if (!targetArg) {
  console.error('Usage: node scripts/clean-build-dir.mjs <directory>')
  process.exit(1)
}

const targetDir = resolve(process.cwd(), targetArg)
const retries = 5
const delayMs = 750

for (let attempt = 1; attempt <= retries; attempt += 1) {
  if (!existsSync(targetDir)) process.exit(0)

  try {
    rmSync(targetDir, { recursive: true, force: true })
    process.exit(0)
  } catch (error) {
    if (attempt === retries) {
      console.error(`Failed to remove ${targetDir} after ${retries} attempts.`)
      throw error
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs))
  }
}
