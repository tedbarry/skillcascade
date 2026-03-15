-- Add seats and trial tracking to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS seats integer NOT NULL DEFAULT 1;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Index for trial expiry queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial ON subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
