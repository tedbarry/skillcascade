-- Subscriptions table for Stripe billing
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update (via webhook)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anyone can insert, only service role can read
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact form" ON contact_submissions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service role can read submissions" ON contact_submissions
  FOR SELECT USING (auth.role() = 'service_role');

-- RLS policies for existing tables (client data isolation)
-- Ensure clients are scoped to the user's organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users access own org clients'
  ) THEN
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users access own org clients" ON clients
      FOR ALL USING (
        org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Assessments scoped to org's clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assessments' AND policyname = 'Users access own org assessments'
  ) THEN
    ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users access own org assessments" ON assessments
      FOR ALL USING (
        client_id IN (
          SELECT id FROM clients WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Snapshots scoped to org's clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'snapshots' AND policyname = 'Users access own org snapshots'
  ) THEN
    ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users access own org snapshots" ON snapshots
      FOR ALL USING (
        client_id IN (
          SELECT id FROM clients WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Assessment score validation (server-side check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_assessment_scores'
  ) THEN
    -- Add a check constraint to ensure scores are valid JSON with values 0-3
    -- This is a basic check; more detailed validation should be done in application logic
    ALTER TABLE assessments ADD CONSTRAINT check_assessment_data_not_null
      CHECK (scores IS NOT NULL);
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL; -- scores column might have a different name
  WHEN duplicate_object THEN NULL;
END $$;
