-- Auth reports storage — replaces localStorage/IndexedDB for authorization report drafts and saved reports
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

-- RLS
ALTER TABLE auth_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reports" ON auth_reports
  FOR ALL USING (created_by = auth.uid());

CREATE INDEX idx_auth_reports_client ON auth_reports(client_id);
CREATE INDEX idx_auth_reports_created_by ON auth_reports(created_by);
