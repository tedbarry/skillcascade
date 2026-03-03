-- Super-admin flag on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Invite tokens for team management
CREATE TABLE IF NOT EXISTS invite_tokens (
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

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token) WHERE used_at IS NULL;

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Admins in the same org can manage invites
CREATE POLICY "Admins manage invites" ON invite_tokens FOR ALL
  USING (org_id = get_my_org_id() AND get_my_role() IN ('admin'));

-- Super-admins can also manage invites (they might not have 'admin' role text)
CREATE POLICY "Super admins manage invites" ON invite_tokens FOR ALL
  USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()));

-- Allow admins to update org name
CREATE POLICY "Admins update own org" ON organizations FOR UPDATE
  USING (id = get_my_org_id() AND (get_my_role() = 'admin' OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid())));

-- Allow admins to update other profiles in their org (role changes)
CREATE POLICY "Admins update org profiles" ON profiles FOR UPDATE
  USING (
    org_id = get_my_org_id()
    AND (get_my_role() = 'admin' OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()))
  );
