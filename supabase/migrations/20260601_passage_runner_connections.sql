-- Passage runner product spine
-- Stores non-secret connection metadata for hosted Passage automation runners.
-- Actual Passage credentials and runner bearer tokens belong in managed secrets,
-- not in frontend env vars or database rows.

CREATE TABLE IF NOT EXISTS passage_runner_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  platform text NOT NULL DEFAULT 'passage',
  environment text NOT NULL DEFAULT 'pilot',
  runner_key text NOT NULL DEFAULT 'DEFAULT',
  runner_url text,
  default_cdp_url text NOT NULL DEFAULT 'http://127.0.0.1:9222',
  provider_label text,
  provider_email text,
  credential_secret_ref text,
  status text NOT NULL DEFAULT 'setup',
  last_health_status text,
  last_health_at timestamptz,
  last_run_at timestamptz,
  last_run_status text,
  last_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT passage_runner_connections_platform_check
    CHECK (platform IN ('passage', 'centralreach')),
  CONSTRAINT passage_runner_connections_environment_check
    CHECK (environment IN ('local', 'pilot', 'production')),
  CONSTRAINT passage_runner_connections_status_check
    CHECK (status IN ('setup', 'ready', 'paused', 'blocked', 'retired')),
  CONSTRAINT passage_runner_connections_runner_key_check
    CHECK (runner_key ~ '^[A-Z0-9_]{1,40}$')
);

CREATE TABLE IF NOT EXISTS passage_runner_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES passage_runner_connections(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES profiles(id),
  mode text NOT NULL DEFAULT 'dry-run',
  status text NOT NULL DEFAULT 'queued',
  runner_key text NOT NULL DEFAULT 'DEFAULT',
  run_dir text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT passage_runner_jobs_mode_check
    CHECK (mode IN ('dry-run', 'live', 'open-review-tabs', 'health', 'status')),
  CONSTRAINT passage_runner_jobs_status_check
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_passage_runner_connections_org
  ON passage_runner_connections(org_id, status);

CREATE INDEX IF NOT EXISTS idx_passage_runner_connections_runner_key
  ON passage_runner_connections(org_id, runner_key);

CREATE INDEX IF NOT EXISTS idx_passage_runner_jobs_org
  ON passage_runner_jobs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passage_runner_jobs_connection
  ON passage_runner_jobs(connection_id, created_at DESC);

ALTER TABLE passage_runner_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE passage_runner_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "passage_runner_connections_org" ON passage_runner_connections;
  DROP POLICY IF EXISTS "passage_runner_jobs_org" ON passage_runner_jobs;

  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    CREATE POLICY "passage_runner_connections_org" ON passage_runner_connections
      FOR ALL TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      );

    CREATE POLICY "passage_runner_jobs_org" ON passage_runner_jobs
      FOR ALL TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION touch_passage_runner_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS passage_runner_connections_touch_updated_at ON passage_runner_connections;
CREATE TRIGGER passage_runner_connections_touch_updated_at
  BEFORE UPDATE ON passage_runner_connections
  FOR EACH ROW
  EXECUTE FUNCTION touch_passage_runner_updated_at();
