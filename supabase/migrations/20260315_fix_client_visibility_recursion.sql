-- Fix infinite recursion in client visibility RLS policies.
-- The original policies referenced client_assignments, which had RLS
-- that referenced clients, causing infinite recursion.
-- Fix: use SECURITY DEFINER functions that bypass RLS.

-- Helper: get client IDs assigned to current user (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_assigned_client_ids()
RETURNS SETOF UUID AS $$
  SELECT client_id FROM client_assignments WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is super admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_my_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_super_admin, false) FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the simplified stopgap policy
DROP POLICY IF EXISTS "Org members read clients" ON clients;

-- Admins + super admins see all org clients
CREATE POLICY "Admins read all org clients" ON clients
  FOR SELECT USING (
    deleted_at IS NULL
    AND org_id = get_my_org_id()
    AND (get_my_role() = 'admin' OR is_my_super_admin())
  );

-- BCBAs only see clients assigned to them
CREATE POLICY "BCBAs read assigned clients" ON clients
  FOR SELECT USING (
    deleted_at IS NULL
    AND org_id = get_my_org_id()
    AND get_my_role() = 'bcba'
    AND id IN (SELECT get_my_assigned_client_ids())
  );

-- Parents only see clients assigned to them
CREATE POLICY "Parents read assigned clients" ON clients
  FOR SELECT USING (
    deleted_at IS NULL
    AND org_id = get_my_org_id()
    AND get_my_role() = 'parent'
    AND id IN (SELECT get_my_assigned_client_ids())
  );
