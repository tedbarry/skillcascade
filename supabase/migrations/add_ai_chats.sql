-- Migration: Add ai_chats table for org-scoped AI conversation history
-- Run this in the Supabase SQL Editor if the database already exists.

CREATE TABLE IF NOT EXISTS ai_chats (
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

CREATE INDEX IF NOT EXISTS idx_ai_chats_org_tool ON ai_chats(org_id, tool_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_user ON ai_chats(user_id);

CREATE TRIGGER ai_chats_updated_at
  BEFORE UPDATE ON ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read ai_chats"
  ON ai_chats FOR SELECT
  USING (org_id = get_my_org_id());

CREATE POLICY "Users insert ai_chats"
  ON ai_chats FOR INSERT
  WITH CHECK (org_id = get_my_org_id() AND user_id = auth.uid());

CREATE POLICY "Users update own ai_chats"
  ON ai_chats FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own ai_chats"
  ON ai_chats FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER audit_ai_chats
  AFTER INSERT OR UPDATE OR DELETE ON ai_chats
  FOR EACH ROW EXECUTE FUNCTION audit_change();
