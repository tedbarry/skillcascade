-- Copy this entire SQL into Supabase SQL Editor and click Run

ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS program_type text DEFAULT 'skill_acquisition';
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS data_method text DEFAULT 'trial';
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS phase_criteria jsonb DEFAULT '{}';
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS min_trials int;
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS max_trials int;
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS mastery_window int DEFAULT 3;
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS mastery_criteria_text text;
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS ltg_mastery_criteria text;
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS maintenance_frequency int;
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS phase_changed_at timestamptz;
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS session_count int DEFAULT 0;

CREATE TABLE IF NOT EXISTS program_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  color text DEFAULT '#9ca3af',
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE program_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage labels" ON program_labels
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS program_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES client_programs(id) ON DELETE CASCADE,
  label_id uuid REFERENCES program_labels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, label_id)
);
ALTER TABLE program_label_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage label assignments" ON program_label_assignments
  FOR ALL USING (program_id IN (SELECT id FROM client_programs WHERE client_id IN (
    SELECT id FROM clients WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  )));

CREATE TABLE IF NOT EXISTS program_phase_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES client_programs(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  triggered_by text,
  session_id uuid REFERENCES sessions(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE program_phase_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view phase logs" ON program_phase_log
  FOR ALL USING (program_id IN (SELECT id FROM client_programs WHERE client_id IN (
    SELECT id FROM clients WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  )));

CREATE INDEX IF NOT EXISTS idx_phase_log_program ON program_phase_log(program_id);
CREATE INDEX IF NOT EXISTS idx_labels_org ON program_labels(org_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_program ON program_label_assignments(program_id);
