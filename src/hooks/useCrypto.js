/**
 * React hook for PHI encryption/decryption.
 *
 * Usage:
 *   const { encrypt, decrypt, encryptObj, decryptObj, isReady } = useCrypto()
 *   const safeName = await encrypt("Hershy Cohen")
 *   const realName = await decrypt(safeName)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getSessionKey,
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  PHI_FIELDS,
  logEncryption,
} from '../lib/crypto.js'

export function useCrypto() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if master key is in session
    setIsReady(!!getSessionKey())
  }, [])

  const encrypt = useCallback(async (plaintext) => {
    const key = getSessionKey()
    if (!key) {
      console.warn('🔒 [HIPAA] No encryption key — data will be stored unencrypted!')
      return plaintext
    }
    return await encryptField(key, plaintext)
  }, [])

  const decrypt = useCallback(async (encrypted) => {
    const key = getSessionKey()
    if (!key) return encrypted
    return await decryptField(key, encrypted)
  }, [])

  /**
   * Encrypt PHI fields in an object based on table name.
   * Automatically uses the PHI_FIELDS registry.
   *
   * Usage: const safeClient = await encryptObj('clients', { name: "Hershy", notes: "..." })
   */
  const encryptObj = useCallback(async (tableName, obj) => {
    const key = getSessionKey()
    if (!key || !obj) return obj
    const fields = PHI_FIELDS[tableName]
    if (!fields) return obj

    const result = await encryptFields(key, obj, fields)
    fields.forEach(f => {
      if (obj[f] != null) logEncryption(tableName, f, 'encrypt')
    })
    return result
  }, [])

  /**
   * Decrypt PHI fields in an object based on table name.
   *
   * Usage: const client = await decryptObj('clients', rawFromSupabase)
   */
  const decryptObj = useCallback(async (tableName, obj) => {
    const key = getSessionKey()
    if (!key || !obj) return obj
    const fields = PHI_FIELDS[tableName]
    if (!fields) return obj

    const result = await decryptFields(key, obj, fields)
    fields.forEach(f => {
      if (obj[f] != null && typeof obj[f] === 'string' && obj[f].startsWith('enc:')) {
        logEncryption(tableName, f, 'decrypt')
      }
    })
    return result
  }, [])

  /**
   * Decrypt an array of objects (e.g., list of clients from Supabase).
   */
  const decryptList = useCallback(async (tableName, arr) => {
    if (!arr || !Array.isArray(arr)) return arr
    return await Promise.all(arr.map(obj => decryptObj(tableName, obj)))
  }, [decryptObj])

  return { encrypt, decrypt, encryptObj, decryptObj, decryptList, isReady }
}
