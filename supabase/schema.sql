-- SkillCascade Database Schema
-- Run this in the Supabase SQL Editor to set up all tables, RLS, and audit triggers.

-- ═══════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════

-- Organizations (multi-tenant root)
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branding jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id),
  role text NOT NULL DEFAULT 'bcba' CHECK (role IN ('admin', 'bcba', 'parent')),
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- Clients (therapy clients)
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  date_of_birth date,
  notes text,
  deleted_at timestamptz, -- soft delete for HIPAA
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

-- Assessments (skill ratings per client — upsert pattern)
CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  level smallint NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 3),
  assessed_by uuid REFERENCES profiles(id),
  assessed_at timestamptz DEFAULT now(),
  UNIQUE (client_id, skill_id)
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

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at ON clients
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Create org if org_name provided in metadata
  IF NEW.raw_user_meta_data->>'org_name' IS NOT NULL AND NEW.raw_user_meta_data->>'org_name' != '' THEN
    INSERT INTO organizations (name) VALUES (NEW.raw_user_meta_data->>'org_name')
    RETURNING id INTO new_org_id;
  END IF;

  INSERT INTO profiles (id, display_name, role, org_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'bcba'),
    COALESCE(new_org_id, (NEW.raw_user_meta_data->>'org_id')::uuid)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- RLS HELPER FUNCTIONS (avoid infinite recursion on profiles)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read their own org
CREATE POLICY "Members read own org"
  ON organizations FOR SELECT
  USING (id = get_my_org_id());

-- Profiles: users see their own profile + profiles in same org
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR org_id = get_my_org_id());

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Clients: org members can read non-deleted clients in their org
CREATE POLICY "Org members read clients"
  ON clients FOR SELECT
  USING (deleted_at IS NULL AND org_id = get_my_org_id());

-- Clients: only BCBAs/admins can insert
CREATE POLICY "BCBAs insert clients"
  ON clients FOR INSERT
  WITH CHECK (org_id = get_my_org_id() AND get_my_role() IN ('bcba', 'admin'));

-- Clients: only BCBAs/admins can update
CREATE POLICY "BCBAs update clients"
  ON clients FOR UPDATE
  USING (org_id = get_my_org_id() AND get_my_role() IN ('bcba', 'admin'));

-- Clients: only admins can hard delete (prefer soft delete)
CREATE POLICY "Admins delete clients"
  ON clients FOR DELETE
  USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- Client assignments: org members can read
CREATE POLICY "Org members read assignments"
  ON client_assignments FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()));

-- Client assignments: BCBAs/admins can manage
CREATE POLICY "BCBAs manage assignments"
  ON client_assignments FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()) AND get_my_role() IN ('bcba', 'admin'));

-- Assessments: org members can read
CREATE POLICY "Assigned users read assessments"
  ON assessments FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()));

CREATE POLICY "BCBAs manage assessments"
  ON assessments FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()) AND get_my_role() IN ('bcba', 'admin'));

CREATE POLICY "BCBAs update assessments"
  ON assessments FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()) AND get_my_role() IN ('bcba', 'admin'));

CREATE POLICY "BCBAs delete assessments"
  ON assessments FOR DELETE
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()) AND get_my_role() IN ('bcba', 'admin'));

-- Snapshots: org members can read
CREATE POLICY "Org members read snapshots"
  ON snapshots FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()));

CREATE POLICY "BCBAs manage snapshots"
  ON snapshots FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()) AND get_my_role() IN ('bcba', 'admin'));

CREATE POLICY "BCBAs delete snapshots"
  ON snapshots FOR DELETE
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()) AND get_my_role() IN ('bcba', 'admin'));

-- Messages: org members can read
CREATE POLICY "Org members read messages"
  ON messages FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()));

CREATE POLICY "Authenticated users send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()));

CREATE POLICY "Users update own message read_by"
  ON messages FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_my_org_id()));

-- User settings: users access only their own row
CREATE POLICY "Users manage own settings"
  ON user_settings FOR ALL
  USING (user_id = auth.uid());

-- Audit log: insert-only for all authenticated users, select for admins
CREATE POLICY "Authenticated users insert audit"
  ON audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins read audit log"
  ON audit_log FOR SELECT
  USING (get_my_role() = 'admin');

-- ═══════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Mark a message as read by a user (appends to read_by array if not already present)
CREATE OR REPLACE FUNCTION mark_message_read(message_id uuid, reader_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET read_by = array_append(read_by, reader_id)
  WHERE id = message_id
  AND NOT (read_by @> ARRAY[reader_id]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- AUDIT TRIGGERS (HIPAA)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION audit_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_change();

CREATE TRIGGER audit_assessments
  AFTER INSERT OR UPDATE OR DELETE ON assessments
  FOR EACH ROW EXECUTE FUNCTION audit_change();

CREATE TRIGGER audit_snapshots
  AFTER INSERT OR UPDATE OR DELETE ON snapshots
  FOR EACH ROW EXECUTE FUNCTION audit_change();

-- ═══════════════════════════════════════════════════════════
-- AI CHATS (org-scoped, cross-client, cross-user)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  client_name text,          -- context label (not a FK — may be "Sample Client")
  tool_id text NOT NULL,     -- reports, bip, ltg, goals, etc.
  title text,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_chats_org_tool ON ai_chats(org_id, tool_id);
CREATE INDEX idx_ai_chats_user ON ai_chats(user_id);

CREATE TRIGGER ai_chats_updated_at
  BEFORE UPDATE ON ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

-- All org members can read AI chats (cross-user within org)
CREATE POLICY "Org members read ai_chats"
  ON ai_chats FOR SELECT
  USING (org_id = get_my_org_id());

-- Authenticated users create chats in their org
CREATE POLICY "Users insert ai_chats"
  ON ai_chats FOR INSERT
  WITH CHECK (org_id = get_my_org_id() AND user_id = auth.uid());

-- Only the chat creator can update their own chats
CREATE POLICY "Users update own ai_chats"
  ON ai_chats FOR UPDATE
  USING (user_id = auth.uid());

-- Only the chat creator can delete their own chats
CREATE POLICY "Users delete own ai_chats"
  ON ai_chats FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER audit_ai_chats
  AFTER INSERT OR UPDATE OR DELETE ON ai_chats
  FOR EACH ROW EXECUTE FUNCTION audit_change();
