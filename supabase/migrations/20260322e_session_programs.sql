-- Session-Programs junction: which programs are assigned to each session
CREATE TABLE IF NOT EXISTS session_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  program_id uuid REFERENCES client_programs(id) ON DELETE CASCADE,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, program_id)
);

ALTER TABLE session_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage session programs" ON session_programs
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_session_programs_session ON session_programs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_programs_program ON session_programs(program_id);
