-- Non-PHI local helper install claims for the sellable Report Generator workflow pack.
-- This table stores install fingerprints and readiness metadata only.
-- Do not store source folder paths, template paths, client names, or document text here.

CREATE TABLE IF NOT EXISTS report_generator_install_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  install_fingerprint text NOT NULL,
  helper_version text,
  package_version text,
  helper_url text,
  status text NOT NULL DEFAULT 'claimed',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_claimed_at timestamptz NOT NULL DEFAULT NOW(),
  last_seen_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT report_generator_install_claims_unique_install
    UNIQUE (org_id, user_id, install_fingerprint),
  CONSTRAINT report_generator_install_claims_safe_status
    CHECK (status IN ('claimed', 'revoked', 'expired')),
  CONSTRAINT report_generator_install_claims_safe_fingerprint
    CHECK (install_fingerprint ~ '^[A-Za-z0-9_-]{8,128}$')
);

CREATE INDEX IF NOT EXISTS idx_report_generator_install_claims_user
  ON report_generator_install_claims(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_generator_install_claims_org
  ON report_generator_install_claims(org_id, last_seen_at DESC);

ALTER TABLE report_generator_install_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "report_generator_install_claims_self_read" ON report_generator_install_claims;
  DROP POLICY IF EXISTS "report_generator_install_claims_admin_read" ON report_generator_install_claims;

  CREATE POLICY "report_generator_install_claims_self_read" ON report_generator_install_claims
    FOR SELECT
    USING (user_id = auth.uid());

  CREATE POLICY "report_generator_install_claims_admin_read" ON report_generator_install_claims
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.org_id = report_generator_install_claims.org_id
          AND p.is_super_admin = true
      )
    );
END $$;
