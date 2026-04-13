-- Add stg_name column to client_programs for 4-tier hierarchy display
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS stg_name text;
