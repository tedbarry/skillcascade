-- Usage analytics: track how users interact with the app
-- HIPAA-safe: no clinical data, only feature names and view names

-- Sessions (one row per browser session)
CREATE TABLE usage_sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id),
  role text,
  plan text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  event_count integer DEFAULT 0,
  device_type text,
  screen_width smallint,
  screen_height smallint,
  user_agent text
);

-- Events (individual interactions)
CREATE TABLE usage_events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id text NOT NULL REFERENCES usage_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id),
  event_type text NOT NULL,
  event_name text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for dashboard queries
CREATE INDEX idx_usage_sessions_user ON usage_sessions(user_id);
CREATE INDEX idx_usage_sessions_org ON usage_sessions(org_id);
CREATE INDEX idx_usage_sessions_started ON usage_sessions(started_at);
CREATE INDEX idx_usage_events_session ON usage_events(session_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type, event_name);
CREATE INDEX idx_usage_events_created ON usage_events(created_at);
CREATE INDEX idx_usage_events_user ON usage_events(user_id);

-- RLS
ALTER TABLE usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert their own sessions
CREATE POLICY "Users insert own sessions" ON usage_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions (for duration/event_count updates)
CREATE POLICY "Users update own sessions" ON usage_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Only super admins can read all sessions
CREATE POLICY "Super admins read sessions" ON usage_sessions
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid())
  );

-- Any authenticated user can insert their own events
CREATE POLICY "Users insert own events" ON usage_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Only super admins can read all events
CREATE POLICY "Super admins read events" ON usage_events
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid())
  );
