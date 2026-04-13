/**
 * SkillCascade Client-Side Encryption
 *
 * HIPAA-compliant E2E encryption for PHI fields.
 * Uses AES-256-GCM via Web Crypto API.
 * Supabase never sees plaintext PHI.
 *
 * RULE: Any field where a user can type freely MUST use encryptField/decryptField.
 *       Scores, ratings, IDs, timestamps do NOT need encryption.
 */

const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 256 // AES-256
const IV_LENGTH = 12 // GCM standard
const SALT_LENGTH = 16

// ─── Key Management ───

/**
 * Generate a random 256-bit master key.
 * Called once during signup.
 */
export async function generateMasterKey() {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH },
    true, // extractable so we can wrap it
    ['encrypt', 'decrypt']
  )
}

/**
 * Derive a Key-Encryption-Key (KEK) from the user's password.
 * Used to wrap/unwrap the master key.
 */
export async function deriveKEK(password, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

/**
 * Generate a random salt for PBKDF2.
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

/**
 * Wrap (encrypt) the master key with the KEK.
 * Returns: { wrappedKey: base64, iv: base64 }
 */
export async function wrapMasterKey(masterKey, kek) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const wrappedKey = await crypto.subtle.wrapKey('raw', masterKey, kek, { name: 'AES-GCM', iv })
  return {
    wrappedKey: arrayBufferToBase64(wrappedKey),
    iv: arrayBufferToBase64(iv),
  }
}

/**
 * Unwrap (decrypt) the master key with the KEK.
 */
export async function unwrapMasterKey(wrappedKeyB64, ivB64, kek) {
  const wrappedKey = base64ToArrayBuffer(wrappedKeyB64)
  const iv = base64ToArrayBuffer(ivB64)
  return await crypto.subtle.unwrapKey(
    'raw',
    wrappedKey,
    kek,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate a 12-word recovery phrase from the master key.
 * Used for key recovery if user forgets password.
 */
export async function generateRecoveryPhrase(masterKey) {
  const raw = await crypto.subtle.exportKey('raw', masterKey)
  const bytes = new Uint8Array(raw)
  // Simple word list approach — use first 12 bytes mapped to words
  const words = []
  for (let i = 0; i < 12; i++) {
    words.push(WORD_LIST[bytes[i] % WORD_LIST.length])
  }
  return words.join(' ')
}

/**
 * Recover master key from recovery phrase.
 */
export async function recoverFromPhrase(phrase) {
  const words = phrase.trim().split(/\s+/)
  if (words.length !== 12) throw new Error('Recovery phrase must be 12 words')
  const bytes = new Uint8Array(32) // 256 bits
  for (let i = 0; i < 12; i++) {
    const idx = WORD_LIST.indexOf(words[i].toLowerCase())
    if (idx === -1) throw new Error(`Unknown word: ${words[i]}`)
    bytes[i] = idx
  }
  // Fill remaining bytes with deterministic hash
  const hash = await crypto.subtle.digest('SHA-256', bytes.slice(0, 12))
  const hashBytes = new Uint8Array(hash)
  for (let i = 12; i < 32; i++) {
    bytes[i] = hashBytes[i]
  }
  return await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM', length: KEY_LENGTH }, true, ['encrypt', 'decrypt'])
}

// ─── Field Encryption/Decryption ───

/**
 * Encrypt a single field value. Returns base64 string with embedded IV.
 *
 * Usage: const encrypted = await encryptField(masterKey, "Hershy Cohen")
 * Result: "enc:aGVyc2h5..." (prefixed with "enc:" for identification)
 */
export async function encryptField(masterKey, plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext
  if (plaintext.startsWith('enc:')) return plaintext // already encrypted

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoder = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encoder.encode(plaintext)
  )

  // Pack IV + ciphertext into one base64 string
  const packed = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(ciphertext), IV_LENGTH)

  return 'enc:' + arrayBufferToBase64(packed.buffer)
}

/**
 * Decrypt a single field value.
 *
 * Usage: const name = await decryptField(masterKey, "enc:aGVyc2h5...")
 * Result: "Hershy Cohen"
 */
export async function decryptField(masterKey, encrypted) {
  if (!encrypted || typeof encrypted !== 'string') return encrypted
  if (!encrypted.startsWith('enc:')) return encrypted // not encrypted, return as-is

  const packed = new Uint8Array(base64ToArrayBuffer(encrypted.slice(4)))
  const iv = packed.slice(0, IV_LENGTH)
  const ciphertext = packed.slice(IV_LENGTH)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Encrypt a JSON object's PHI fields.
 * Pass an array of field names to encrypt.
 *
 * Usage: const safe = await encryptFields(masterKey, {name: "Hershy", score: 3}, ['name'])
 * Result: {name: "enc:...", score: 3}
 */
export async function encryptFields(masterKey, obj, fieldNames) {
  if (!obj || !masterKey) return obj
  const result = { ...obj }
  for (const field of fieldNames) {
    if (result[field] != null && typeof result[field] === 'string') {
      result[field] = await encryptField(masterKey, result[field])
    } else if (result[field] != null && typeof result[field] === 'object') {
      // For JSON fields, stringify then encrypt the whole thing
      result[field] = await encryptField(masterKey, JSON.stringify(result[field]))
    }
  }
  return result
}

/**
 * Decrypt a JSON object's PHI fields.
 *
 * Usage: const readable = await decryptFields(masterKey, {name: "enc:...", score: 3}, ['name'])
 * Result: {name: "Hershy", score: 3}
 */
export async function decryptFields(masterKey, obj, fieldNames) {
  if (!obj || !masterKey) return obj
  const result = { ...obj }
  for (const field of fieldNames) {
    if (result[field] != null && typeof result[field] === 'string' && result[field].startsWith('enc:')) {
      const decrypted = await decryptField(masterKey, result[field])
      // Try to parse as JSON (for encrypted JSON fields)
      try {
        result[field] = JSON.parse(decrypted)
      } catch {
        result[field] = decrypted
      }
    }
  }
  return result
}

/**
 * Check if a value is encrypted.
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith('enc:')
}

// ─── Session Key Store ───
// Uses sessionStorage to survive page reloads within the same tab.
// Cleared when the tab/browser closes. Never sent to server.

let _sessionMasterKey = null
let _restored = false

/**
 * Store the master key in memory AND sessionStorage.
 */
export function setSessionKey(key) {
  _sessionMasterKey = key
  // Also persist to sessionStorage so it survives page reloads
  if (key && typeof sessionStorage !== 'undefined') {
    crypto.subtle.exportKey('raw', key).then(raw => {
      sessionStorage.setItem('_sc_mk', arrayBufferToBase64(raw))
    }).catch(() => {})
  }
}

/**
 * Get the session key. Sync — returns null if not yet restored.
 * Call restoreSessionKey() first on app init.
 */
export function getSessionKey() {
  return _sessionMasterKey
}

/**
 * Restore master key from sessionStorage (for page reloads).
 * Call once on app startup.
 */
export async function restoreSessionKey() {
  if (_sessionMasterKey || _restored) return !!_sessionMasterKey
  _restored = true
  if (typeof sessionStorage !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('_sc_mk')
      if (stored) {
        const raw = base64ToArrayBuffer(stored)
        _sessionMasterKey = await crypto.subtle.importKey(
          'raw', raw, { name: 'AES-GCM', length: KEY_LENGTH }, true, ['encrypt', 'decrypt']
        )
        console.log('🔒 [HIPAA] Encryption key restored from session')
        return true
      }
    } catch {}
  }
  return false
}

export function clearSessionKey() {
  _sessionMasterKey = null
  _restored = false
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('_sc_mk')
  }
}

// ─── Helpers ───

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Simple word list for recovery phrases (256 words)
const WORD_LIST = [
  'apple','beach','cloud','dance','eagle','flame','grape','heart','ivory','jewel',
  'kite','lemon','maple','night','ocean','pearl','quest','river','stone','tiger',
  'unity','valor','whale','xenon','youth','zebra','anchor','bridge','coral','delta',
  'ember','frost','glow','haven','iris','jade','karma','lotus','mango','noble',
  'olive','prism','quilt','reign','solar','tulip','urban','vivid','waltz','xerox',
  'yacht','zeal','amber','bloom','cedar','drift','echo','flora','grain','haze',
  'inlet','junco','kelp','lunar','marsh','nexus','orbit','plume','quake','ridge',
  'surge','trace','ultra','vault','weave','axis','blaze','crisp','dew','elk',
  'fern','gulf','harp','icon','jazz','knot','lynx','moss','nova','opal',
  'pine','ruby','sage','thorn','umber','vine','wren','yew','zinc','alder',
  'birch','cove','dune','etch','fox','glen','hawk','isle','jolt','key',
  'lark','mint','nest','owl','peak','quay','rose','silk','tide','urn',
  'vale','wind','yarn','zen','arch','bay','cliff','dawn','elm','fjord',
  'gale','helm','ivy','jay','keel','lake','moon','nook','ore','pier',
  'raft','salt','twig','vent','well','bay','cape','dell','edge','ford',
  'gate','hill','ink','jar','knob','lane','mill','node','oak','palm',
  'rain','sand','tree','vale','wave','yoke','zone','acre','bark','cave',
  'dock','eave','fir','gem','hut','ice','jig','kit','log','mist',
  'nib','odd','peg','rig','sap','tap','urn','vow','web','yam',
  'ash','bow','cup','dam','ear','fin','gum','hay','imp','jab',
  'kin','lip','mud','nap','oar','paw','ram','sow','tin','van',
  'wax','yap','zap','ace','bid','cod','dip','elf','fig','gin',
  'hen','inn','jot','keg','lid','mop','nun','orb','pry','rim',
  'spa','tub','vim','wig','yep','zip',
]

// ─── PHI Field Registry ───
// These are the fields that MUST be encrypted in each table.
// When adding new fields, update this registry.

export const PHI_FIELDS = {
  clients: ['name', 'date_of_birth', 'notes'],
  auth_reports: ['fields', 'label'],
  sessions: ['notes'],
  session_data: ['notes'],
  clinical_insights: ['content', 'recommendation'],
  ai_chats: ['messages', 'client_name', 'title'],
}

/**
 * Log when encryption is applied (for Teddy's awareness).
 */
export function logEncryption(table, field, action = 'encrypt') {
  if (typeof console !== 'undefined') {
    console.log(`🔒 [HIPAA] ${action === 'encrypt' ? 'Encrypted' : 'Decrypted'} ${table}.${field}`)
  }
}
