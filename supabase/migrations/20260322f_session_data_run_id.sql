-- Add run_id to session_data so each session run gets its own data rows
ALTER TABLE session_data ADD COLUMN IF NOT EXISTS run_id uuid REFERENCES session_runs(id) ON DELETE SET NULL;

-- Add unique constraint so upsert works correctly per run + program
-- First remove any duplicates (keep the latest row per session_id + program_id + run_id)
DELETE FROM session_data a
USING session_data b
WHERE a.id < b.id
  AND a.session_id = b.session_id
  AND a.program_id = b.program_id
  AND COALESCE(a.run_id::text, '') = COALESCE(b.run_id::text, '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_data_unique_run
  ON session_data(session_id, program_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_session_data_run ON session_data(run_id);
