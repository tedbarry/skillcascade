import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = 'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  if (import.meta.env.PROD) throw new Error(msg)
  console.error(msg)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    // Bypass navigator.locks which hangs on page reload in dev
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
})

/**
 * Merge a partial settings object into the user_settings row.
 * Reads existing settings first, merges the new keys, then upserts.
 * This prevents different components from overwriting each other.
 */
export async function mergeUserSettings(userId, partial) {
  const { data } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single()

  const merged = { ...(data?.settings || {}), ...partial }

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, settings: merged }, { onConflict: 'user_id' })

  if (error) console.error('Failed to save user settings:', error.message)
}
