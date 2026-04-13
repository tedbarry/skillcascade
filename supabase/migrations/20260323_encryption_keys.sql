-- Add encryption key storage columns to profiles
-- The encrypted_master_key is the user's AES-256 master key, wrapped with their password-derived KEK
-- Supabase cannot decrypt this without the user's password
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS encrypted_master_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kek_salt TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kek_iv TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_phrase_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;
