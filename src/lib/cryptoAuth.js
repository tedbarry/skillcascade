/**
 * Crypto + Auth integration.
 * Handles master key lifecycle: setup on signup, retrieve on login, recovery.
 */

import { supabase } from './supabase.js'
import {
  generateMasterKey,
  generateSalt,
  deriveKEK,
  wrapMasterKey,
  unwrapMasterKey,
  generateRecoveryPhrase,
  setSessionKey,
  clearSessionKey,
  getSessionKey,
} from './crypto.js'

/**
 * Setup encryption keys for a new user.
 * Called ONCE after signup, BEFORE the password is cleared from memory.
 *
 * Returns the recovery phrase — MUST be shown to the user.
 */
export async function setupEncryptionKeys(password, userId) {
  // 1. Generate random master key
  const masterKey = await generateMasterKey()

  // 2. Generate salt for PBKDF2
  const salt = generateSalt()

  // 3. Derive KEK from password
  const kek = await deriveKEK(password, salt)

  // 4. Wrap master key with KEK
  const { wrappedKey, iv } = await wrapMasterKey(masterKey, kek)

  // 5. Generate recovery phrase
  const recoveryPhrase = await generateRecoveryPhrase(masterKey)

  // 6. Hash the recovery phrase for verification later
  const encoder = new TextEncoder()
  const phraseHash = await crypto.subtle.digest('SHA-256', encoder.encode(recoveryPhrase))
  const phraseHashB64 = btoa(String.fromCharCode(...new Uint8Array(phraseHash)))

  // 7. Store encrypted key material in profile (Supabase can't decrypt this)
  // Uses the shared supabase client (inherits user session)
  const { error } = await supabase
    .from('profiles')
    .update({
      encrypted_master_key: wrappedKey,
      kek_salt: btoa(String.fromCharCode(...salt)),
      kek_iv: iv,
      recovery_phrase_hash: phraseHashB64,
      encryption_version: 1,
    })
    .eq('id', userId)

  if (error) {
    console.error('Failed to store encryption keys:', error)
    throw new Error('Failed to setup encryption. Please try again.')
  }

  // 8. Set master key in session
  setSessionKey(masterKey)

  // 9. Return recovery phrase — UI must show this to user
  return recoveryPhrase
}

/**
 * Retrieve and unlock the master key on login.
 * Called after successful Supabase Auth login.
 *
 * Returns true if successful, false if user needs to set up encryption.
 */
export async function unlockEncryption(password, userId) {
  // Uses the shared supabase client (inherits user session)

  // Fetch encrypted key material
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('encrypted_master_key, kek_salt, kek_iv, encryption_version')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    console.error('Failed to fetch encryption keys:', error)
    return false
  }

  // If no encryption keys set up yet, user needs to go through setup
  if (!profile.encrypted_master_key || !profile.kek_salt || !profile.kek_iv) {
    return false // Signal to UI: show encryption setup
  }

  try {
    // Reconstruct salt from base64
    const saltStr = atob(profile.kek_salt)
    const salt = new Uint8Array(saltStr.length)
    for (let i = 0; i < saltStr.length; i++) salt[i] = saltStr.charCodeAt(i)

    // Derive KEK from password
    const kek = await deriveKEK(password, salt)

    // Unwrap master key
    const masterKey = await unwrapMasterKey(
      profile.encrypted_master_key,
      profile.kek_iv,
      kek
    )

    // Store in session
    setSessionKey(masterKey)
    return true
  } catch (err) {
    console.error('Failed to unlock encryption:', err)
    // This usually means wrong password — but Supabase Auth would have caught that
    // So it might mean corrupted key material
    return false
  }
}

/**
 * Check if current session has an active encryption key.
 */
export function isEncryptionReady() {
  return !!getSessionKey()
}

/**
 * Clear encryption key on logout.
 */
export function lockEncryption() {
  clearSessionKey()
}

/**
 * Change password — re-wrap master key with new password.
 * Must be called AFTER Supabase Auth password change succeeds.
 */
export async function changeEncryptionPassword(oldPassword, newPassword, userId) {
  // Uses the shared supabase client (inherits user session)

  const { data: profile } = await supabase
    .from('profiles')
    .select('encrypted_master_key, kek_salt, kek_iv')
    .eq('id', userId)
    .single()

  if (!profile?.encrypted_master_key) throw new Error('No encryption keys found')

  // Unwrap with old password
  const saltStr = atob(profile.kek_salt)
  const oldSalt = new Uint8Array(saltStr.length)
  for (let i = 0; i < saltStr.length; i++) oldSalt[i] = saltStr.charCodeAt(i)

  const oldKEK = await deriveKEK(oldPassword, oldSalt)
  const masterKey = await unwrapMasterKey(profile.encrypted_master_key, profile.kek_iv, oldKEK)

  // Re-wrap with new password
  const newSalt = generateSalt()
  const newKEK = await deriveKEK(newPassword, newSalt)
  const { wrappedKey, iv } = await wrapMasterKey(masterKey, newKEK)

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update({
      encrypted_master_key: wrappedKey,
      kek_salt: btoa(String.fromCharCode(...newSalt)),
      kek_iv: iv,
    })
    .eq('id', userId)

  if (error) throw new Error('Failed to update encryption keys')

  // Update session key (same master key, just re-wrapped)
  setSessionKey(masterKey)
}
