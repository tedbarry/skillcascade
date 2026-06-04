-- DB-backed Stripe price IDs for sellable SkillCascade workflow packs.
-- Price IDs are identifiers, not Stripe secrets; the secret key stays in the Worker.

CREATE TABLE IF NOT EXISTS workflow_pack_price_configs (
  pack_id text PRIMARY KEY,
  checkout_plan text NOT NULL,
  stripe_product_id text,
  monthly_price_id text,
  annual_price_id text,
  monthly_amount_cents integer NOT NULL,
  annual_amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  provisioned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  provisioned_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_pack_price_configs_checkout_plan
  ON workflow_pack_price_configs(checkout_plan);

ALTER TABLE workflow_pack_price_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "workflow_pack_price_configs_admin_read" ON workflow_pack_price_configs;
  DROP POLICY IF EXISTS "workflow_pack_price_configs_worker_only" ON workflow_pack_price_configs;

  CREATE POLICY "workflow_pack_price_configs_admin_read" ON workflow_pack_price_configs
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.is_super_admin = true
      )
    );
END $$;

DROP TRIGGER IF EXISTS workflow_pack_price_configs_touch_updated_at ON workflow_pack_price_configs;
CREATE OR REPLACE FUNCTION touch_workflow_pack_price_configs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workflow_pack_price_configs_touch_updated_at
  BEFORE UPDATE ON workflow_pack_price_configs
  FOR EACH ROW
  EXECUTE FUNCTION touch_workflow_pack_price_configs_updated_at();
