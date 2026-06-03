-- Clinical/workflow pack access fields used by SkillCascade clinical tools and Passage Runner.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_access boolean NOT NULL DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_plan text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS clinical_seats integer NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS workflow_pack_access jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_subscriptions_clinical_access
  ON subscriptions(clinical_access)
  WHERE clinical_access = true;

CREATE INDEX IF NOT EXISTS idx_subscriptions_workflow_pack_access
  ON subscriptions USING gin(workflow_pack_access);
