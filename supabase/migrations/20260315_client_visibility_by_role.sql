-- BCBAs should only see clients assigned to them. Admins see all org clients.
-- Drop the old blanket policy and replace with role-aware ones.

DROP POLICY IF EXISTS "Org members read clients" ON clients;
DROP POLICY IF EXISTS "Users access own org clients" ON clients;

-- Admins + super admins see all org clients
CREATE POLICY "Admins read all org clients" ON clients
  FOR SELECT USING (
    deleted_at IS NULL
    AND org_id = get_my_org_id()
    AND (
      get_my_role() = 'admin'
      OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid())
    )
  );

-- BCBAs only see clients assigned to them
CREATE POLICY "BCBAs read assigned clients" ON clients
  FOR SELECT USING (
    deleted_at IS NULL
    AND org_id = get_my_org_id()
    AND get_my_role() = 'bcba'
    AND id IN (SELECT client_id FROM client_assignments WHERE user_id = auth.uid())
  );

-- Parents only see clients assigned to them
CREATE POLICY "Parents read assigned clients" ON clients
  FOR SELECT USING (
    deleted_at IS NULL
    AND org_id = get_my_org_id()
    AND get_my_role() = 'parent'
    AND id IN (SELECT client_id FROM client_assignments WHERE user_id = auth.uid())
  );

-- Auto-assign client to the creating BCBA
CREATE OR REPLACE FUNCTION auto_assign_client()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_assignments (client_id, user_id, role)
  VALUES (NEW.id, auth.uid(), COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), 'bcba'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_assign_client ON clients;
CREATE TRIGGER trg_auto_assign_client
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_client();
