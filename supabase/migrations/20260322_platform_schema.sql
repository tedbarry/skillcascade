-- ═══════════════════════════════════════════════════════════════
-- SkillCascade Platform Schema — ABA Practice Management
-- Created: 2026-03-22
-- ═══════════════════════════════════════════════════════════════

-- ═══ GOAL LIBRARY (4-tier hierarchy) ═══

CREATE TABLE IF NOT EXISTS goal_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  scope text DEFAULT 'system',
  org_id uuid REFERENCES organizations(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_ltgs (
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

CREATE TABLE IF NOT EXISTS goal_stgs (
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

CREATE TABLE IF NOT EXISTS goal_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stg_id uuid NOT NULL REFERENCES goal_stgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stg_id uuid NOT NULL REFERENCES goal_stgs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stg_id)
);

-- ═══ CLIENT PROGRAMS (Learning Trees) ═══

CREATE TABLE IF NOT EXISTS client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stg_id uuid REFERENCES goal_stgs(id),
  domain text NOT NULL,
  ltg_name text,
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
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES client_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'acquisition',
  mastered_at timestamptz,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ═══ SESSIONS & DATA COLLECTION ═══

CREATE TABLE IF NOT EXISTS sessions (
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

CREATE TABLE IF NOT EXISTS session_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES client_programs(id),
  target_id uuid REFERENCES client_targets(id),
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

-- ═══ SCHEDULING ═══

CREATE TABLE IF NOT EXISTS schedule_templates (
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

CREATE TABLE IF NOT EXISTS schedule_exceptions (
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

-- ═══ AUTHORIZATIONS ═══

CREATE TABLE IF NOT EXISTS authorizations (
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

-- ═══ CLINICAL INSIGHTS ═══

CREATE TABLE IF NOT EXISTS skill_working_estimates (
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

CREATE TABLE IF NOT EXISTS clinical_insights (
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

-- ═══ INDEXES ═══

CREATE INDEX IF NOT EXISTS idx_goal_ltgs_domain ON goal_ltgs(domain_id);
CREATE INDEX IF NOT EXISTS idx_goal_stgs_ltg ON goal_stgs(ltg_id);
CREATE INDEX IF NOT EXISTS idx_goal_targets_stg ON goal_targets(stg_id);
CREATE INDEX IF NOT EXISTS idx_client_programs_client ON client_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_targets_program ON client_targets(program_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON sessions(client_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_staff ON sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_session_data_session ON session_data(session_id);
CREATE INDEX IF NOT EXISTS idx_session_data_program ON session_data(program_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_client ON schedule_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_client ON authorizations(client_id);
CREATE INDEX IF NOT EXISTS idx_skill_working_client ON skill_working_estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_clinical_insights_client ON clinical_insights(client_id);

-- ═══ RLS POLICIES ═══

ALTER TABLE goal_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_ltgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_stgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_working_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_insights ENABLE ROW LEVEL SECURITY;

-- Goal library readable by all authenticated users
CREATE POLICY "goal_domains_read" ON goal_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "goal_ltgs_read" ON goal_ltgs FOR SELECT TO authenticated USING (true);
CREATE POLICY "goal_stgs_read" ON goal_stgs FOR SELECT TO authenticated USING (true);
CREATE POLICY "goal_targets_read" ON goal_targets FOR SELECT TO authenticated USING (true);

-- Company/personal goals writable by org members
CREATE POLICY "goal_domains_insert" ON goal_domains FOR INSERT TO authenticated
  WITH CHECK (scope != 'system');
CREATE POLICY "goal_ltgs_insert" ON goal_ltgs FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "goal_stgs_insert" ON goal_stgs FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "goal_targets_insert" ON goal_targets FOR INSERT TO authenticated
  WITH CHECK (true);

-- Favorites
CREATE POLICY "favorites_own" ON goal_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Client data scoped to org
CREATE POLICY "programs_org" ON client_programs FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "targets_org" ON client_targets FOR ALL TO authenticated
  USING (program_id IN (SELECT id FROM client_programs WHERE client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))));
CREATE POLICY "sessions_org" ON sessions FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "session_data_org" ON session_data FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM sessions WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "schedules_org" ON schedule_templates FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "schedule_exceptions_org" ON schedule_exceptions FOR ALL TO authenticated
  USING (template_id IN (SELECT id FROM schedule_templates WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "auths_org" ON authorizations FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "working_estimates_org" ON skill_working_estimates FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "insights_org" ON clinical_insights FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));
