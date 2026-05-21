-- Product Workflow Spine V1
-- Stores guarded assessment/report/goal/CentralReach workflow state.
-- PHI-capable payloads belong only in the approved AWS/RDS path; the UI should
-- prefer operator-safe summaries unless a clinician opens a specific job.

CREATE TABLE IF NOT EXISTS product_workflow_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'initial_assessment',
  status text NOT NULL DEFAULT 'draft',
  current_phase text NOT NULL DEFAULT 'intake',
  guardrail_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  operator_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_workflow_jobs_type_check
    CHECK (job_type IN ('initial_assessment', 'authorization_report', 'goal_plan', 'centralreach_tree')),
  CONSTRAINT product_workflow_jobs_status_check
    CHECK (status IN ('draft', 'intake', 'review', 'approved', 'blocked', 'exported', 'archived'))
);

CREATE TABLE IF NOT EXISTS product_workflow_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES product_workflow_jobs(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'supporting_document',
  source_label text,
  source_fingerprint text,
  storage_ref text,
  classification_status text NOT NULL DEFAULT 'pending',
  extraction_status text NOT NULL DEFAULT 'pending',
  extracted_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_workflow_sources_job_fingerprint_unique
    UNIQUE (job_id, source_fingerprint),
  CONSTRAINT product_workflow_sources_classification_check
    CHECK (classification_status IN ('pending', 'classified', 'needs_review', 'blocked')),
  CONSTRAINT product_workflow_sources_extraction_check
    CHECK (extraction_status IN ('pending', 'extracted', 'verified', 'blocked'))
);

CREATE TABLE IF NOT EXISTS product_workflow_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES product_workflow_jobs(id) ON DELETE CASCADE,
  gate text NOT NULL,
  action_type text NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending',
  requested_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason_text text,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_workflow_approvals_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired', 'not_required')),
  CONSTRAINT product_workflow_approvals_job_gate_unique
    UNIQUE (job_id, gate, action_type)
);

CREATE TABLE IF NOT EXISTS product_workflow_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES product_workflow_jobs(id) ON DELETE CASCADE,
  artifact_type text NOT NULL,
  artifact_status text NOT NULL DEFAULT 'draft',
  storage_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_workflow_artifacts_status_check
    CHECK (artifact_status IN ('draft', 'ready_for_review', 'approved', 'exported', 'superseded', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_product_workflow_jobs_org
  ON product_workflow_jobs(org_id);

CREATE INDEX IF NOT EXISTS idx_product_workflow_jobs_client
  ON product_workflow_jobs(client_id);

CREATE INDEX IF NOT EXISTS idx_product_workflow_jobs_status
  ON product_workflow_jobs(status, current_phase);

CREATE INDEX IF NOT EXISTS idx_product_workflow_sources_job
  ON product_workflow_sources(job_id);

CREATE INDEX IF NOT EXISTS idx_product_workflow_approvals_job
  ON product_workflow_approvals(job_id);

CREATE INDEX IF NOT EXISTS idx_product_workflow_approvals_status
  ON product_workflow_approvals(approval_status, gate);

CREATE INDEX IF NOT EXISTS idx_product_workflow_artifacts_job
  ON product_workflow_artifacts(job_id);

ALTER TABLE product_workflow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_workflow_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_workflow_artifacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "product_workflow_jobs_org" ON product_workflow_jobs;
  DROP POLICY IF EXISTS "product_workflow_sources_org" ON product_workflow_sources;
  DROP POLICY IF EXISTS "product_workflow_approvals_org" ON product_workflow_approvals;
  DROP POLICY IF EXISTS "product_workflow_artifacts_org" ON product_workflow_artifacts;

  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    CREATE POLICY "product_workflow_jobs_org" ON product_workflow_jobs
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

    CREATE POLICY "product_workflow_sources_org" ON product_workflow_sources
      FOR ALL TO authenticated
      USING (
        job_id IN (
          SELECT id FROM product_workflow_jobs
          WHERE client_id IN (
            SELECT id FROM clients
            WHERE org_id IN (
              SELECT org_id FROM profiles WHERE id = auth.uid()
            )
          )
        )
      )
      WITH CHECK (
        job_id IN (
          SELECT id FROM product_workflow_jobs
          WHERE client_id IN (
            SELECT id FROM clients
            WHERE org_id IN (
              SELECT org_id FROM profiles WHERE id = auth.uid()
            )
          )
        )
      );

    CREATE POLICY "product_workflow_approvals_org" ON product_workflow_approvals
      FOR ALL TO authenticated
      USING (
        job_id IN (
          SELECT id FROM product_workflow_jobs
          WHERE client_id IN (
            SELECT id FROM clients
            WHERE org_id IN (
              SELECT org_id FROM profiles WHERE id = auth.uid()
            )
          )
        )
      )
      WITH CHECK (
        job_id IN (
          SELECT id FROM product_workflow_jobs
          WHERE client_id IN (
            SELECT id FROM clients
            WHERE org_id IN (
              SELECT org_id FROM profiles WHERE id = auth.uid()
            )
          )
        )
      );

    CREATE POLICY "product_workflow_artifacts_org" ON product_workflow_artifacts
      FOR ALL TO authenticated
      USING (
        job_id IN (
          SELECT id FROM product_workflow_jobs
          WHERE client_id IN (
            SELECT id FROM clients
            WHERE org_id IN (
              SELECT org_id FROM profiles WHERE id = auth.uid()
            )
          )
        )
      )
      WITH CHECK (
        job_id IN (
          SELECT id FROM product_workflow_jobs
          WHERE client_id IN (
            SELECT id FROM clients
            WHERE org_id IN (
              SELECT org_id FROM profiles WHERE id = auth.uid()
            )
          )
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION touch_product_workflow_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_workflow_jobs_touch_updated_at ON product_workflow_jobs;
CREATE TRIGGER product_workflow_jobs_touch_updated_at
  BEFORE UPDATE ON product_workflow_jobs
  FOR EACH ROW
  EXECUTE FUNCTION touch_product_workflow_updated_at();

DROP TRIGGER IF EXISTS product_workflow_sources_touch_updated_at ON product_workflow_sources;
CREATE TRIGGER product_workflow_sources_touch_updated_at
  BEFORE UPDATE ON product_workflow_sources
  FOR EACH ROW
  EXECUTE FUNCTION touch_product_workflow_updated_at();

DROP TRIGGER IF EXISTS product_workflow_approvals_touch_updated_at ON product_workflow_approvals;
CREATE TRIGGER product_workflow_approvals_touch_updated_at
  BEFORE UPDATE ON product_workflow_approvals
  FOR EACH ROW
  EXECUTE FUNCTION touch_product_workflow_updated_at();

DROP TRIGGER IF EXISTS product_workflow_artifacts_touch_updated_at ON product_workflow_artifacts;
CREATE TRIGGER product_workflow_artifacts_touch_updated_at
  BEFORE UPDATE ON product_workflow_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION touch_product_workflow_updated_at();
