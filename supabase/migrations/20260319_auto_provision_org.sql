-- Auto-provision an organization for users who signed up without one,
-- then create the client in the same function to avoid RLS caching issues.

CREATE OR REPLACE FUNCTION ensure_user_org()
RETURNS uuid AS $$
DECLARE
  existing_org_id uuid;
  new_org_id uuid;
  user_name text;
BEGIN
  -- Check if user already has an org
  SELECT org_id INTO existing_org_id
  FROM profiles WHERE id = auth.uid();

  IF existing_org_id IS NOT NULL THEN
    RETURN existing_org_id;
  END IF;

  -- Get display name for org naming
  SELECT COALESCE(display_name, split_part(email, '@', 1), 'My Practice')
  INTO user_name
  FROM profiles p JOIN auth.users u ON u.id = p.id
  WHERE p.id = auth.uid();

  -- Create org
  INSERT INTO organizations (name)
  VALUES (user_name || '''s Practice')
  RETURNING id INTO new_org_id;

  -- Link profile to new org
  UPDATE profiles SET org_id = new_org_id WHERE id = auth.uid();

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a client bypassing RLS (called after ensure_user_org when org was just created)
CREATE OR REPLACE FUNCTION create_client_for_user(client_name text)
RETURNS jsonb AS $$
DECLARE
  user_org_id uuid;
  new_client jsonb;
BEGIN
  SELECT org_id INTO user_org_id FROM profiles WHERE id = auth.uid();

  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for user';
  END IF;

  INSERT INTO clients (name, org_id)
  VALUES (client_name, user_org_id)
  RETURNING jsonb_build_object('id', id, 'name', name, 'org_id', org_id) INTO new_client;

  RETURN new_client;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soft-delete a client bypassing RLS role checks
CREATE OR REPLACE FUNCTION delete_client_for_user(client_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE clients SET deleted_at = now()
  WHERE id = client_id
  AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
