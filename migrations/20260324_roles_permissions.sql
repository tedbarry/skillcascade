-- ═══════════════════════════════════════════════════════════════════════════
-- SkillCascade — Roles & Permissions Migration
-- Date: 2026-03-24
-- Adds: roles table, role_id on profiles, seeds default system roles per org
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_org_slug ON roles(org_id, slug);
CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(org_id);

-- 2. Add role_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role_id);

-- 3. Seed default system roles for every existing org
-- Using a DO block to iterate orgs and insert roles
DO $$
DECLARE
  org RECORD;
  master_role_id uuid;
  bcba_role_id uuid;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    -- master_admin
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'Master Admin', 'master_admin', true,
      '{
        "clients": {"view": true, "edit": true, "create": true, "delete": true},
        "scheduling": {"view": true, "edit": true},
        "billing": {"view": true, "edit": true},
        "reports": {"view": true, "edit": true, "finalize": true},
        "programs": {"view": true, "edit": true},
        "sessions": {"view": true, "edit": true, "run": true},
        "goals": {"view": true, "edit": true},
        "team": {"view": true, "edit": true},
        "settings": {"view": true, "edit": true},
        "ai": {"use": true},
        "clinical": {"access": true}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING
    RETURNING id INTO master_role_id;

    -- bcba
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'BCBA', 'bcba', true,
      '{
        "clients": {"view": true, "edit": true, "create": true, "delete": true},
        "scheduling": {"view": true, "edit": true},
        "billing": {"view": false, "edit": false},
        "reports": {"view": true, "edit": true, "finalize": true},
        "programs": {"view": true, "edit": true},
        "sessions": {"view": true, "edit": true, "run": true},
        "goals": {"view": true, "edit": true},
        "team": {"view": false, "edit": false},
        "settings": {"view": false, "edit": false},
        "ai": {"use": true},
        "clinical": {"access": true}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING
    RETURNING id INTO bcba_role_id;

    -- rbt
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'RBT', 'rbt', true,
      '{
        "clients": {"view": true, "edit": false, "create": false, "delete": false},
        "scheduling": {"view": true, "edit": false},
        "billing": {"view": false, "edit": false},
        "reports": {"view": false, "edit": false, "finalize": false},
        "programs": {"view": true, "edit": false},
        "sessions": {"view": true, "edit": false, "run": true},
        "goals": {"view": false, "edit": false},
        "team": {"view": false, "edit": false},
        "settings": {"view": false, "edit": false},
        "ai": {"use": false},
        "clinical": {"access": false}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING;

    -- office_staff
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'Office Staff', 'office_staff', true,
      '{
        "clients": {"view": true, "edit": false, "create": false, "delete": false},
        "scheduling": {"view": true, "edit": true},
        "billing": {"view": true, "edit": true},
        "reports": {"view": false, "edit": false, "finalize": false},
        "programs": {"view": false, "edit": false},
        "sessions": {"view": false, "edit": false, "run": false},
        "goals": {"view": false, "edit": false},
        "team": {"view": false, "edit": false},
        "settings": {"view": false, "edit": false},
        "ai": {"use": false},
        "clinical": {"access": false}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING;

    -- billing_admin
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'Billing Admin', 'billing_admin', true,
      '{
        "clients": {"view": true, "edit": false, "create": false, "delete": false},
        "scheduling": {"view": true, "edit": false},
        "billing": {"view": true, "edit": true},
        "reports": {"view": false, "edit": false, "finalize": false},
        "programs": {"view": false, "edit": false},
        "sessions": {"view": false, "edit": false, "run": false},
        "goals": {"view": false, "edit": false},
        "team": {"view": false, "edit": false},
        "settings": {"view": false, "edit": false},
        "ai": {"use": false},
        "clinical": {"access": false}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING;

    -- qa_admin
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'QA Admin', 'qa_admin', true,
      '{
        "clients": {"view": false, "edit": false, "create": false, "delete": false},
        "scheduling": {"view": false, "edit": false},
        "billing": {"view": false, "edit": false},
        "reports": {"view": true, "edit": true, "finalize": true},
        "programs": {"view": true, "edit": false},
        "sessions": {"view": true, "edit": false, "run": false},
        "goals": {"view": false, "edit": false},
        "team": {"view": false, "edit": false},
        "settings": {"view": false, "edit": false},
        "ai": {"use": false},
        "clinical": {"access": true}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING;

    -- scheduling_admin
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'Scheduling Admin', 'scheduling_admin', true,
      '{
        "clients": {"view": true, "edit": false, "create": false, "delete": false},
        "scheduling": {"view": true, "edit": true},
        "billing": {"view": false, "edit": false},
        "reports": {"view": false, "edit": false, "finalize": false},
        "programs": {"view": false, "edit": false},
        "sessions": {"view": true, "edit": false, "run": false},
        "goals": {"view": false, "edit": false},
        "team": {"view": false, "edit": false},
        "settings": {"view": false, "edit": false},
        "ai": {"use": false},
        "clinical": {"access": false}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING;

    -- parent
    INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES (
      org.id, 'Parent', 'parent', true,
      '{
        "clients": {"view": true, "edit": false, "create": false, "delete": false},
        "scheduling": {"view": false, "edit": false},
        "billing": {"view": false, "edit": false},
        "reports": {"view": false, "edit": false, "finalize": false},
        "programs": {"view": true, "edit": false},
        "sessions": {"view": true, "edit": false, "run": false},
        "goals": {"view": false, "edit": false},
        "team": {"view": false, "edit": false},
        "settings": {"view": false, "edit": false},
        "ai": {"use": false},
        "clinical": {"access": false}
      }'::jsonb
    ) ON CONFLICT (org_id, slug) DO NOTHING;

    -- Auto-assign existing profiles to matching roles
    -- admins/super_admins → master_admin
    IF master_role_id IS NOT NULL THEN
      UPDATE profiles SET role_id = master_role_id
      WHERE org_id = org.id AND (role = 'admin' OR is_super_admin = true) AND role_id IS NULL;
    END IF;

    -- bcba → bcba role
    IF bcba_role_id IS NOT NULL THEN
      UPDATE profiles SET role_id = bcba_role_id
      WHERE org_id = org.id AND role = 'bcba' AND is_super_admin = false AND role_id IS NULL;
    END IF;

    -- parent → parent role (fetch the parent role_id)
    UPDATE profiles SET role_id = (
      SELECT id FROM roles WHERE org_id = org.id AND slug = 'parent' LIMIT 1
    )
    WHERE org_id = org.id AND role = 'parent' AND role_id IS NULL;

  END LOOP;
END $$;

-- 4. Add roles table to rds_migration.sql reference
-- (roles table should also be accessible via generic handler)

-- 5. Create function to seed roles for new orgs (called on org creation)
CREATE OR REPLACE FUNCTION seed_org_roles(p_org_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO roles (org_id, name, slug, is_system, permissions) VALUES
    (p_org_id, 'Master Admin', 'master_admin', true,
     '{"clients":{"view":true,"edit":true,"create":true,"delete":true},"scheduling":{"view":true,"edit":true},"billing":{"view":true,"edit":true},"reports":{"view":true,"edit":true,"finalize":true},"programs":{"view":true,"edit":true},"sessions":{"view":true,"edit":true,"run":true},"goals":{"view":true,"edit":true},"team":{"view":true,"edit":true},"settings":{"view":true,"edit":true},"ai":{"use":true},"clinical":{"access":true}}'::jsonb),
    (p_org_id, 'BCBA', 'bcba', true,
     '{"clients":{"view":true,"edit":true,"create":true,"delete":true},"scheduling":{"view":true,"edit":true},"billing":{"view":false,"edit":false},"reports":{"view":true,"edit":true,"finalize":true},"programs":{"view":true,"edit":true},"sessions":{"view":true,"edit":true,"run":true},"goals":{"view":true,"edit":true},"team":{"view":false,"edit":false},"settings":{"view":false,"edit":false},"ai":{"use":true},"clinical":{"access":true}}'::jsonb),
    (p_org_id, 'RBT', 'rbt', true,
     '{"clients":{"view":true,"edit":false,"create":false,"delete":false},"scheduling":{"view":true,"edit":false},"billing":{"view":false,"edit":false},"reports":{"view":false,"edit":false,"finalize":false},"programs":{"view":true,"edit":false},"sessions":{"view":true,"edit":false,"run":true},"goals":{"view":false,"edit":false},"team":{"view":false,"edit":false},"settings":{"view":false,"edit":false},"ai":{"use":false},"clinical":{"access":false}}'::jsonb),
    (p_org_id, 'Office Staff', 'office_staff', true,
     '{"clients":{"view":true,"edit":false,"create":false,"delete":false},"scheduling":{"view":true,"edit":true},"billing":{"view":true,"edit":true},"reports":{"view":false,"edit":false,"finalize":false},"programs":{"view":false,"edit":false},"sessions":{"view":false,"edit":false,"run":false},"goals":{"view":false,"edit":false},"team":{"view":false,"edit":false},"settings":{"view":false,"edit":false},"ai":{"use":false},"clinical":{"access":false}}'::jsonb),
    (p_org_id, 'Billing Admin', 'billing_admin', true,
     '{"clients":{"view":true,"edit":false,"create":false,"delete":false},"scheduling":{"view":true,"edit":false},"billing":{"view":true,"edit":true},"reports":{"view":false,"edit":false,"finalize":false},"programs":{"view":false,"edit":false},"sessions":{"view":false,"edit":false,"run":false},"goals":{"view":false,"edit":false},"team":{"view":false,"edit":false},"settings":{"view":false,"edit":false},"ai":{"use":false},"clinical":{"access":false}}'::jsonb),
    (p_org_id, 'QA Admin', 'qa_admin', true,
     '{"clients":{"view":false,"edit":false,"create":false,"delete":false},"scheduling":{"view":false,"edit":false},"billing":{"view":false,"edit":false},"reports":{"view":true,"edit":true,"finalize":true},"programs":{"view":true,"edit":false},"sessions":{"view":true,"edit":false,"run":false},"goals":{"view":false,"edit":false},"team":{"view":false,"edit":false},"settings":{"view":false,"edit":false},"ai":{"use":false},"clinical":{"access":true}}'::jsonb),
    (p_org_id, 'Scheduling Admin', 'scheduling_admin', true,
     '{"clients":{"view":true,"edit":false,"create":false,"delete":false},"scheduling":{"view":true,"edit":true},"billing":{"view":false,"edit":false},"reports":{"view":false,"edit":false,"finalize":false},"programs":{"view":false,"edit":false},"sessions":{"view":true,"edit":false,"run":false},"goals":{"view":false,"edit":false},"team":{"view":false,"edit":false},"settings":{"view":false,"edit":false},"ai":{"use":false},"clinical":{"access":false}}'::jsonb),
    (p_org_id, 'Parent', 'parent', true,
     '{"clients":{"view":true,"edit":false,"create":false,"delete":false},"scheduling":{"view":false,"edit":false},"billing":{"view":false,"edit":false},"reports":{"view":false,"edit":false,"finalize":false},"programs":{"view":true,"edit":false},"sessions":{"view":true,"edit":false,"run":false},"goals":{"view":false,"edit":false},"team":{"view":false,"edit":false},"settings":{"view":false,"edit":false},"ai":{"use":false},"clinical":{"access":false}}'::jsonb)
  ON CONFLICT (org_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMIT;
