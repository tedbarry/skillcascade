-- One-time Report Generator credits.
-- The Stripe checkout session adds positive credits; each generated draft consumes one credit.

CREATE TABLE IF NOT EXISTS report_generator_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  workflow_pack_id text NOT NULL DEFAULT 'report-generator',
  credits_delta integer NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('purchase', 'consume', 'manual_adjustment')),
  bundle_id text,
  amount_cents integer,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  external_event_id text UNIQUE,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_generator_credit_ledger_user
  ON report_generator_credit_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_generator_credit_ledger_org
  ON report_generator_credit_ledger(org_id, created_at DESC);

ALTER TABLE report_generator_credit_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "report_generator_credit_ledger_self_read" ON report_generator_credit_ledger;
  DROP POLICY IF EXISTS "report_generator_credit_ledger_admin_read" ON report_generator_credit_ledger;

  CREATE POLICY "report_generator_credit_ledger_self_read" ON report_generator_credit_ledger
    FOR SELECT
    USING (user_id = auth.uid());

  CREATE POLICY "report_generator_credit_ledger_admin_read" ON report_generator_credit_ledger
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.org_id = report_generator_credit_ledger.org_id
          AND (p.role = 'admin' OR p.is_super_admin = true)
      )
    );
END $$;
