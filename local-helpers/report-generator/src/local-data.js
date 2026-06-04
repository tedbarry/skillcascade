import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DEFAULT_DATA_DIR = join(homedir(), '.skillcascade', 'report-generator-helper')
export const DATA_DIR = process.env.REPORT_HELPER_DATA_DIR || DEFAULT_DATA_DIR

export function dataPath(...segments) {
  return join(DATA_DIR, ...segments)
}

export async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true })
  return DATA_DIR
}
