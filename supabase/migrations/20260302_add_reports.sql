-- Saved reports — frozen assessment snapshots with report metadata
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

CREATE INDEX idx_reports_client ON reports(client_id, created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own org reports" ON reports FOR ALL USING (
  client_id IN (
    SELECT id FROM clients WHERE org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  )
);
