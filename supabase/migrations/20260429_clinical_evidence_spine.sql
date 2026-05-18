-- Clinical Evidence Spine V1: persisted BCBA decisions on assessment-to-goal recommendations.

CREATE TABLE IF NOT EXISTS client_goal_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_assessment_id text,
  source_assessment_date date,
  canonical_target_id text NOT NULL,
  decision_status text NOT NULL DEFAULT 'pending',
  client_program_id uuid REFERENCES client_programs(id) ON DELETE SET NULL,
  decided_by_user_id uuid REFERENCES profiles(id),
  decided_at timestamptz,
  reason_code text,
  reason_text text,
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT client_goal_decisions_status_check
    CHECK (decision_status IN ('pending', 'imported', 'excluded', 'linked', 'needs_prerequisite', 'needs_assessment')),
  CONSTRAINT client_goal_decisions_client_target_unique
    UNIQUE (client_id, canonical_target_id)
);

CREATE INDEX IF NOT EXISTS idx_client_goal_decisions_client
  ON client_goal_decisions(client_id);

CREATE INDEX IF NOT EXISTS idx_client_goal_decisions_status
  ON client_goal_decisions(decision_status);

CREATE INDEX IF NOT EXISTS idx_client_goal_decisions_target
  ON client_goal_decisions(canonical_target_id);

CREATE INDEX IF NOT EXISTS idx_client_goal_decisions_program
  ON client_goal_decisions(client_program_id);

ALTER TABLE client_goal_decisions ENABLE ROW LEVEL SECURITY;

-- Production currently runs through the Cloudflare Worker against AWS RDS, where
-- app-level authorization is enforced before DB writes and Supabase auth.uid()
-- is not installed. Keep the Supabase policy path conditional so this migration
-- remains safe in both environments.
DO $$
BEGIN
  DROP POLICY IF EXISTS "client_goal_decisions_org" ON client_goal_decisions;

  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    CREATE POLICY "client_goal_decisions_org" ON client_goal_decisions
      FOR ALL TO authenticated
      USING (
        client_id IN (
          SELECT id FROM clients
          WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
          )
        )
      )
      WITH CHECK (
        client_id IN (
          SELECT id FROM clients
          WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION touch_client_goal_decisions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_goal_decisions_touch_updated_at ON client_goal_decisions;
CREATE TRIGGER client_goal_decisions_touch_updated_at
  BEFORE UPDATE ON client_goal_decisions
  FOR EACH ROW
  EXECUTE FUNCTION touch_client_goal_decisions_updated_at();
