-- Emergency Supabase Security Advisor fix for rls_disabled_in_public.
--
-- Rationale:
-- Supabase exposes the public schema through the Data API. Any public table
-- without RLS can be read/written/deleted with the public anon key. SkillCascade
-- now routes app data writes through the Cloudflare Worker, so this migration
-- enables RLS everywhere and preserves existing policies instead of adding
-- broad permissive policies. It also tries to install a small future-table
-- guard so newly-created public tables do not silently reopen the same risk.
-- Some hosted Postgres roles cannot create event triggers, so that guard is
-- best-effort and must not block the emergency RLS fix.

DO $$
DECLARE
  app_table record;
BEGIN
  FOR app_table IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname NOT IN ('spatial_ref_sys')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table.table_name);
  END LOOP;
END $$;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.enable_rls_for_new_public_tables()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  ddl_command record;
BEGIN
  FOR ddl_command IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF ddl_command.schema_name = 'public'
      AND ddl_command.object_identity <> 'public.spatial_ref_sys' THEN
      EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY', ddl_command.object_identity);
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  DROP EVENT TRIGGER IF EXISTS ensure_public_table_rls;

  CREATE EVENT TRIGGER ensure_public_table_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION private.enable_rls_for_new_public_tables();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping future-table RLS guard because this role cannot create event triggers. Existing public tables were still protected.';
END $$;

DO $$
DECLARE
  remaining text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
    INTO remaining
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('spatial_ref_sys')
    AND c.relrowsecurity = false;

  IF remaining IS NOT NULL THEN
    RAISE EXCEPTION 'RLS remains disabled on public tables: %', remaining;
  END IF;
END $$;
