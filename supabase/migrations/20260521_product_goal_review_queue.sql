-- Product Goal Review Queue V1
-- Stores per-goal BCBA review decisions before goals are used for report or
-- CentralReach export planning.

CREATE TABLE IF NOT EXISTS product_workflow_goal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES product_workflow_jobs(id) ON DELETE CASCADE,
  source_goal_id text,
  source_goal_fingerprint text NOT NULL,
  source_goal_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status text NOT NULL DEFAULT 'pending',
  reviewed_goal jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_workflow_goal_reviews_status_check
    CHECK (review_status IN ('pending', 'accepted', 'needs_revision', 'rejected')),
  CONSTRAINT product_workflow_goal_reviews_job_goal_unique
    UNIQUE (job_id, source_goal_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_product_workflow_goal_reviews_job
  ON product_workflow_goal_reviews(job_id);

CREATE INDEX IF NOT EXISTS idx_product_workflow_goal_reviews_status
  ON product_workflow_goal_reviews(review_status);

ALTER TABLE product_workflow_goal_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "product_workflow_goal_reviews_org" ON product_workflow_goal_reviews;

  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    CREATE POLICY "product_workflow_goal_reviews_org" ON product_workflow_goal_reviews
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

DROP TRIGGER IF EXISTS product_workflow_goal_reviews_touch_updated_at ON product_workflow_goal_reviews;
CREATE TRIGGER product_workflow_goal_reviews_touch_updated_at
  BEFORE UPDATE ON product_workflow_goal_reviews
  FOR EACH ROW
  EXECUTE FUNCTION touch_product_workflow_updated_at();
