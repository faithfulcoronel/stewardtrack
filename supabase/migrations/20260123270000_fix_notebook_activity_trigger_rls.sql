-- =====================================================
-- Fix Notebook Activity Trigger to Bypass RLS
-- =====================================================
--
-- The log_notebook_activity trigger function needs SECURITY DEFINER
-- and row_security = off to bypass RLS when inserting activity logs.
-- This is necessary because triggers run in the context of the
-- triggering user, and RLS policies would block the insert.

CREATE OR REPLACE FUNCTION log_notebook_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
SET row_security = off
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notebook_activity_log (tenant_id, notebook_id, action, actor_id, details)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'created',
      NEW.created_by,
      jsonb_build_object('title', NEW.title)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO notebook_activity_log (tenant_id, notebook_id, action, actor_id, details)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'updated',
      NEW.updated_by,
      jsonb_build_object('title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION log_notebook_activity() IS
  'Logs notebook creation and updates to activity log. '
  'Uses SECURITY DEFINER and row_security=off to bypass RLS policies.';
