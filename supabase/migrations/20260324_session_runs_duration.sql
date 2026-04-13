-- Add duration_minutes to session_runs so each run tracks its own duration
ALTER TABLE session_runs ADD COLUMN IF NOT EXISTS duration_minutes int;
