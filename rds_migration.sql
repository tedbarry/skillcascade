-- ═══════════════════════════════════════════════════════════════════════════
-- SkillCascade — Combined AWS RDS PostgreSQL Migration
-- Generated: 2026-03-23
-- Source: supabase/schema.sql + 18 migration files
--
-- Removes: RLS, policies, auth.uid()/auth.role()/auth.users references
-- Keeps: All tables, indexes, triggers, constraints, utility functions
-- ═══════════════════════════════════════════════════════════════════════════

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════
-- UTILITY FUNCTIONS (must exist before tables/triggers that reference them)
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mark a message as read by a user (appends to read_by array if not already present)
CREATE OR REPLACE FUNCTION mark_message_read(message_id uuid, reader_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET read_by = array_append(read_by, reader_id)
  WHERE id = message_id
  AND NOT (read_by @> ARRAY[reader_id]);
END;
$$ LANGUAGE plpgsql;

-- Audit change trigger function
-- Original used auth.uid(); replaced with session variable or NULL
CREATE OR REPLACE FUNCTION audit_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Application should SET LOCAL app.current_user_id = '<uuid>' before operations
  BEGIN
    current_user_id := current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    current_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Auto-assign client to creating BCBA
-- Original used auth.uid(); replaced with session variable
CREATE OR REPLACE FUNCTION auto_assign_client()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
  current_role text;
BEGIN
  BEGIN
    current_user_id := current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF current_user_id IS NOT NULL THEN
    SELECT role INTO current_role FROM profiles WHERE id = current_user_id;
    INSERT INTO client_assignments (client_id, user_id, role)
    VALUES (NEW.id, current_user_id, COALESCE(current_role, 'bcba'))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure user has an org; create one if not
-- Original used auth.uid(); now takes user_id as parameter
CREATE OR REPLACE FUNCTION ensure_user_org(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  existing_org_id uuid;
  new_org_id uuid;
  user_name text;
BEGIN
  SELECT org_id INTO existing_org_id
  FROM profiles WHERE id = p_user_id;

  IF existing_org_id IS NOT NULL THEN
    RETURN existing_org_id;
  END IF;

  SELECT COALESCE(display_name, 'My Practice')
  INTO user_name
  FROM profiles WHERE id = p_user_id;

  INSERT INTO organizations (name)
  VALUES (user_name || '''s Practice')
  RETURNING id INTO new_org_id;

  UPDATE profiles SET org_id = new_org_id WHERE id = p_user_id;

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql;

-- Create a client for a user (bypasses RLS in Supabase; here just a helper)
CREATE OR REPLACE FUNCTION create_client_for_user(p_user_id uuid, client_name text)
RETURNS jsonb AS $$
DECLARE
  user_org_id uuid;
  new_client jsonb;
BEGIN
  SELECT org_id INTO user_org_id FROM profiles WHERE id = p_user_id;

  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for user';
  END IF;

  INSERT INTO clients (name, org_id)
  VALUES (client_name, user_org_id)
  RETURNING jsonb_build_object('id', id, 'name', name, 'org_id', org_id) INTO new_client;

  RETURN new_client;
END;
$$ LANGUAGE plpgsql;

-- Soft-delete a client for a user
CREATE OR REPLACE FUNCTION delete_client_for_user(p_user_id uuid, p_client_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE clients SET deleted_at = now()
  WHERE id = p_client_id
  AND org_id = (SELECT org_id FROM profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- CORE TABLES (from schema.sql)
-- ═══════════════════════════════════════════════════════════════════════════

-- Organizations (multi-tenant root)
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branding jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Profiles (user accounts — no FK to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id),
  role text NOT NULL DEFAULT 'bcba' CHECK (role IN ('admin', 'bcba', 'parent')),
  display_name text,
  is_super_admin boolean NOT NULL DEFAULT false,
  encrypted_master_key text,
  kek_salt text,
  kek_iv text,
  recovery_phrase_hash text,
  encryption_version integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Clients (therapy clients)
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  date_of_birth date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client assignments (which BCBAs/parents see which clients)
CREATE TABLE client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('bcba', 'parent')),
  UNIQUE (client_id, user_id)
);

-- Assessments (skill ratings per client)
CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  level smallint NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 3),
  assessed_by uuid REFERENCES profiles(id),
  assessed_at timestamptz DEFAULT now(),
  scores jsonb,
  UNIQUE (client_id, skill_id),
  CONSTRAINT check_assessment_data_not_null CHECK (scores IS NOT NULL OR true)
);

-- Snapshots (progress timeline captures)
CREATE TABLE snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label text,
  data jsonb NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Messages (per-client messaging)
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  text text NOT NULL CHECK (char_length(text) <= 500),
  read_by uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- User settings (accessibility, dark mode, onboarding)
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  settings jsonb DEFAULT '{}'
);

-- Audit log (HIPAA audit trail)
CREATE TABLE audit_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS & CONTACT (from 20260228)
-- ═══════════════════════════════════════════════════════════════════════════

-- Subscriptions (Stripe billing — FK to profiles instead of auth.users)
CREATE TABLE subscriptions (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  seats integer NOT NULL DEFAULT 1,
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contact form submissions
CREATE TABLE contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INVITE TOKENS (from 20260302_add_admin)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  email text,
  role text NOT NULL DEFAULT 'bcba',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid REFERENCES profiles(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- REPORTS (from 20260302b)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  title text NOT NULL,
  assessments jsonb NOT NULL,
  config jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- USAGE ANALYTICS (from 20260314)
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM SCHEMA — GOAL LIBRARY (from 20260322)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE goal_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  scope text DEFAULT 'system',
  org_id uuid REFERENCES organizations(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE goal_ltgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES goal_domains(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  scope text DEFAULT 'system',
  org_id uuid REFERENCES organizations(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE goal_stgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ltg_id uuid NOT NULL REFERENCES goal_ltgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text,
  operational_definition text,
  examples text,
  non_examples text,
  measurement_type text DEFAULT 'percentage',
  default_criteria text,
  probable_function text,
  proactive_strategies text,
  ferb text,
  deescalation text,
  goal_type text DEFAULT 'increase',
  skill_mappings text[],
  display_order int DEFAULT 0,
  scope text DEFAULT 'system',
  org_id uuid REFERENCES organizations(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE goal_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stg_id uuid NOT NULL REFERENCES goal_stgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE goal_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stg_id uuid NOT NULL REFERENCES goal_stgs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stg_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM SCHEMA — CLIENT PROGRAMS / LEARNING TREES (from 20260322 + 20260322b + 20260322d)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stg_id uuid REFERENCES goal_stgs(id),
  domain text NOT NULL,
  ltg_name text,
  stg_name text,
  name text NOT NULL,
  objective text,
  criteria text,
  measurement_type text DEFAULT 'percentage',
  goal_type text DEFAULT 'increase',
  skill_mappings text[],
  status text DEFAULT 'acquisition',
  baseline text,
  baseline_date date,
  mastered_at timestamptz,
  display_order int DEFAULT 0,
  -- Phase management columns (from 20260322d)
  program_type text DEFAULT 'skill_acquisition',
  data_method text DEFAULT 'trial',
  phase_criteria jsonb DEFAULT '{}',
  min_trials int,
  max_trials int,
  mastery_window int DEFAULT 3,
  mastery_criteria_text text,
  ltg_mastery_criteria text,
  maintenance_frequency int,
  phase_changed_at timestamptz,
  session_count int DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE client_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES client_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'acquisition',
  mastered_at timestamptz,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM SCHEMA — SESSIONS & DATA COLLECTION (from 20260322)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES profiles(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  session_date date NOT NULL,
  start_time time,
  end_time time,
  duration_minutes int,
  session_type text DEFAULT 'direct',
  cpt_code text,
  location text,
  status text DEFAULT 'in_progress',
  notes_structured jsonb,
  narrative text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session runs (referenced by session_data.run_id — table was missing from migrations)
CREATE TABLE session_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES profiles(id),
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes int,
  status text DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE session_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES client_programs(id),
  target_id uuid REFERENCES client_targets(id),
  run_id uuid REFERENCES session_runs(id) ON DELETE SET NULL,
  trial_data jsonb,
  correct_count int DEFAULT 0,
  incorrect_count int DEFAULT 0,
  prompted_count int DEFAULT 0,
  total_trials int DEFAULT 0,
  percentage numeric(5,2),
  frequency_count int,
  duration_seconds int,
  interval_data jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Session-Programs junction (from 20260322e)
CREATE TABLE session_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  program_id uuid REFERENCES client_programs(id) ON DELETE CASCADE,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, program_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM SCHEMA — SCHEDULING (from 20260322)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES profiles(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  day_of_week int NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  session_type text DEFAULT 'direct',
  location text,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES schedule_templates(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  action text NOT NULL,
  substitute_staff_id uuid REFERENCES profiles(id),
  new_start_time time,
  new_end_time time,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM SCHEMA — AUTHORIZATIONS (from 20260322)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id),
  insurance_name text,
  auth_number text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'active',
  approved_hours jsonb NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM SCHEMA — CLINICAL INSIGHTS (from 20260322)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE skill_working_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  formal_level int,
  working_level int,
  evidence text,
  last_formal_date timestamptz,
  last_updated timestamptz DEFAULT now(),
  confirmed_by uuid REFERENCES profiles(id),
  confirmed_at timestamptz,
  UNIQUE(client_id, skill_id)
);

CREATE TABLE clinical_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'info',
  related_program_id uuid REFERENCES client_programs(id),
  related_skill_id text,
  status text DEFAULT 'active',
  dismissed_by uuid REFERENCES profiles(id),
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTH REPORTS (from 20260322c)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE auth_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  label text,
  fields jsonb NOT NULL DEFAULT '{}',
  goal_graphs jsonb DEFAULT '{}',
  is_draft boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PROGRAM LABELS & PHASE LOG (from 20260322d)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE program_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  color text DEFAULT '#9ca3af',
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE program_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES client_programs(id) ON DELETE CASCADE,
  label_id uuid REFERENCES program_labels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, label_id)
);

CREATE TABLE program_phase_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES client_programs(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  triggered_by text,
  session_id uuid REFERENCES sessions(id),
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLES & PERMISSIONS (from 20260324)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_roles_org_slug ON roles(org_id, slug);
CREATE INDEX idx_roles_org ON roles(org_id);

-- Add role_id to profiles (FK to roles)
-- ALTER TABLE profiles ADD COLUMN role_id uuid REFERENCES roles(id);
-- CREATE INDEX idx_profiles_role ON profiles(role_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- AI CHATS (from schema.sql / add_ai_chats migration)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  client_name text,
  tool_id text NOT NULL,
  title text,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Core tables
CREATE INDEX idx_profiles_org ON profiles(org_id);
CREATE INDEX idx_clients_org ON clients(org_id);
CREATE INDEX idx_clients_deleted ON clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_assignments_client ON client_assignments(client_id);
CREATE INDEX idx_client_assignments_user ON client_assignments(user_id);
CREATE INDEX idx_assessments_client ON assessments(client_id);
CREATE INDEX idx_snapshots_client ON snapshots(client_id);
CREATE INDEX idx_messages_client ON messages(client_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_trial ON subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Invite tokens
CREATE INDEX idx_invite_tokens_token ON invite_tokens(token) WHERE used_at IS NULL;

-- Reports
CREATE INDEX idx_reports_client ON reports(client_id, created_at DESC);

-- Usage analytics
CREATE INDEX idx_usage_sessions_user ON usage_sessions(user_id);
CREATE INDEX idx_usage_sessions_org ON usage_sessions(org_id);
CREATE INDEX idx_usage_sessions_started ON usage_sessions(started_at);
CREATE INDEX idx_usage_events_session ON usage_events(session_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type, event_name);
CREATE INDEX idx_usage_events_created ON usage_events(created_at);
CREATE INDEX idx_usage_events_user ON usage_events(user_id);

-- Goal library
CREATE INDEX idx_goal_ltgs_domain ON goal_ltgs(domain_id);
CREATE INDEX idx_goal_stgs_ltg ON goal_stgs(ltg_id);
CREATE INDEX idx_goal_targets_stg ON goal_targets(stg_id);

-- Client programs & targets
CREATE INDEX idx_client_programs_client ON client_programs(client_id);
CREATE INDEX idx_client_targets_program ON client_targets(program_id);

-- Sessions & data
CREATE INDEX idx_sessions_client_date ON sessions(client_id, session_date);
CREATE INDEX idx_sessions_staff ON sessions(staff_id);
CREATE INDEX idx_session_data_session ON session_data(session_id);
CREATE INDEX idx_session_data_program ON session_data(program_id);
CREATE INDEX idx_session_data_run ON session_data(run_id);
CREATE UNIQUE INDEX idx_session_data_unique_run
  ON session_data(session_id, program_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Session programs
CREATE INDEX idx_session_programs_session ON session_programs(session_id);
CREATE INDEX idx_session_programs_program ON session_programs(program_id);

-- Scheduling
CREATE INDEX idx_schedule_templates_client ON schedule_templates(client_id);

-- Authorizations
CREATE INDEX idx_authorizations_client ON authorizations(client_id);

-- Clinical insights
CREATE INDEX idx_skill_working_client ON skill_working_estimates(client_id);
CREATE INDEX idx_clinical_insights_client ON clinical_insights(client_id);

-- Auth reports
CREATE INDEX idx_auth_reports_client ON auth_reports(client_id);
CREATE INDEX idx_auth_reports_created_by ON auth_reports(created_by);

-- Program labels & phase log
CREATE INDEX idx_phase_log_program ON program_phase_log(program_id);
CREATE INDEX idx_labels_org ON program_labels(org_id);
CREATE INDEX idx_label_assignments_program ON program_label_assignments(program_id);

-- AI chats
CREATE INDEX idx_ai_chats_org_tool ON ai_chats(org_id, tool_id);
CREATE INDEX idx_ai_chats_user ON ai_chats(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- updated_at triggers
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ai_chats_updated_at
  BEFORE UPDATE ON ai_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-assign client to creator
CREATE TRIGGER trg_auto_assign_client
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION auto_assign_client();

-- Audit triggers (HIPAA)
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_change();

CREATE TRIGGER audit_assessments
  AFTER INSERT OR UPDATE OR DELETE ON assessments
  FOR EACH ROW EXECUTE FUNCTION audit_change();

CREATE TRIGGER audit_snapshots
  AFTER INSERT OR UPDATE OR DELETE ON snapshots
  FOR EACH ROW EXECUTE FUNCTION audit_change();

CREATE TRIGGER audit_ai_chats
  AFTER INSERT OR UPDATE OR DELETE ON ai_chats
  FOR EACH ROW EXECUTE FUNCTION audit_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- SESSION NOTES, CLIENT FILES, CLIENT CONTACTS (added 2026-03-24)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  staff_id uuid NOT NULL REFERENCES profiles(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  session_date date NOT NULL,
  cpt_code text,
  start_time time,
  end_time time,
  duration_minutes integer,
  location text,
  narrative text,
  structured_data jsonb,
  status text DEFAULT 'draft',
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_notes_client ON session_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_staff ON session_notes(staff_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_org ON session_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_date ON session_notes(session_date);
CREATE INDEX IF NOT EXISTS idx_session_notes_status ON session_notes(status);

CREATE TABLE IF NOT EXISTS client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  filename text NOT NULL,
  file_type text,
  file_size integer,
  storage_key text NOT NULL,
  category text DEFAULT 'general',
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_files_client ON client_files(client_id);

CREATE TABLE IF NOT EXISTS client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  relationship text,
  email text,
  phone text,
  organization_name text,
  notes text,
  is_primary boolean DEFAULT false,
  access_level text DEFAULT 'none',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);

CREATE TRIGGER session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER client_contacts_updated_at
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Auth context: Instead of Supabase's auth.uid(), this schema uses PostgreSQL
-- session variables. Application code should execute:
--   SET LOCAL app.current_user_id = '<user-uuid>';
-- before any database operations that need user context (audit logging,
-- auto-assign triggers). This is typically done in a transaction wrapper.
--
-- RLS replacement: Row-level security policies have been removed. Access
-- control should be enforced at the application layer (API middleware).
--
-- The handle_new_user() trigger (which fired on auth.users INSERT) has been
-- removed. Profile creation should be handled by the application on signup.
--
-- session_runs table was not in original migrations but is used by the app.
-- It has been added here based on application code usage patterns.
-- ═══════════════════════════════════════════════════════════════════════════
