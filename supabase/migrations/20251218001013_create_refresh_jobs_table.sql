/*
  # Materialized View Refresh Jobs Table

  This migration creates infrastructure for tracking materialized view refresh operations.

  ## What it does:
  - Creates materialized_view_refresh_jobs table to track refresh history
  - Adds indexes for efficient querying
  - Enables monitoring and alerting on refresh performance
  - Stores metrics like duration, row counts, success/failure status

  ## Key features:
  - Tracks both concurrent and regular refreshes
  - Records which user triggered manual refreshes
  - Stores error messages for failed refreshes
  - Enables historical performance analysis
*/

-- Create the refresh jobs tracking table
CREATE TABLE IF NOT EXISTS materialized_view_refresh_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  duration_ms integer,
  row_count bigint,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  concurrent boolean NOT NULL DEFAULT false,
  triggered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS materialized_view_refresh_jobs_view_name_idx
  ON materialized_view_refresh_jobs (view_name);

CREATE INDEX IF NOT EXISTS materialized_view_refresh_jobs_started_at_idx
  ON materialized_view_refresh_jobs (started_at DESC);

CREATE INDEX IF NOT EXISTS materialized_view_refresh_jobs_success_idx
  ON materialized_view_refresh_jobs (success);

CREATE INDEX IF NOT EXISTS materialized_view_refresh_jobs_view_started_idx
  ON materialized_view_refresh_jobs (view_name, started_at DESC);

-- Enable RLS
ALTER TABLE materialized_view_refresh_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all refresh jobs
CREATE POLICY refresh_jobs_admin_read ON materialized_view_refresh_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('Super Admin', 'Admin', 'System Admin', 'Tenant Administrator')
    )
  );

-- Policy: System can insert refresh jobs (for service accounts)
CREATE POLICY refresh_jobs_system_insert ON materialized_view_refresh_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create helper functions for refresh operations

-- Function to refresh tenant_license_summary with concurrent support
CREATE OR REPLACE FUNCTION refresh_tenant_license_summary_concurrent()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_license_summary;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to refresh tenant_license_summary (regular)
CREATE OR REPLACE FUNCTION refresh_tenant_license_summary()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW tenant_license_summary;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to refresh effective_surface_access with concurrent support
CREATE OR REPLACE FUNCTION refresh_effective_surface_access_concurrent()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY effective_surface_access;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to refresh effective_surface_access (regular)
CREATE OR REPLACE FUNCTION refresh_effective_surface_access()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW effective_surface_access;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Scheduled refresh function (can be called by cron or scheduled job)
CREATE OR REPLACE FUNCTION scheduled_refresh_all_materialized_views()
RETURNS jsonb
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  result jsonb := jsonb_build_object('refreshed', jsonb_build_array());
  view_result jsonb;
  error_occurred boolean := false;
BEGIN
  -- Refresh tenant_user_effective_permissions
  BEGIN
    start_time := now();
    PERFORM refresh_tenant_user_effective_permissions_safe();
    end_time := now();

    view_result := jsonb_build_object(
      'view', 'tenant_user_effective_permissions',
      'success', true,
      'duration_ms', EXTRACT(epoch FROM (end_time - start_time)) * 1000
    );
    result := jsonb_set(result, '{refreshed}', result->'refreshed' || view_result);
  EXCEPTION WHEN OTHERS THEN
    error_occurred := true;
    view_result := jsonb_build_object(
      'view', 'tenant_user_effective_permissions',
      'success', false,
      'error', SQLERRM
    );
    result := jsonb_set(result, '{refreshed}', result->'refreshed' || view_result);
  END;

  -- Refresh tenant_license_summary
  BEGIN
    start_time := now();
    BEGIN
      PERFORM refresh_tenant_license_summary_concurrent();
    EXCEPTION WHEN OTHERS THEN
      PERFORM refresh_tenant_license_summary();
    END;
    end_time := now();

    view_result := jsonb_build_object(
      'view', 'tenant_license_summary',
      'success', true,
      'duration_ms', EXTRACT(epoch FROM (end_time - start_time)) * 1000
    );
    result := jsonb_set(result, '{refreshed}', result->'refreshed' || view_result);
  EXCEPTION WHEN OTHERS THEN
    error_occurred := true;
    view_result := jsonb_build_object(
      'view', 'tenant_license_summary',
      'success', false,
      'error', SQLERRM
    );
    result := jsonb_set(result, '{refreshed}', result->'refreshed' || view_result);
  END;

  -- Refresh effective_surface_access
  BEGIN
    start_time := now();
    BEGIN
      PERFORM refresh_effective_surface_access_concurrent();
    EXCEPTION WHEN OTHERS THEN
      PERFORM refresh_effective_surface_access();
    END;
    end_time := now();

    view_result := jsonb_build_object(
      'view', 'effective_surface_access',
      'success', true,
      'duration_ms', EXTRACT(epoch FROM (end_time - start_time)) * 1000
    );
    result := jsonb_set(result, '{refreshed}', result->'refreshed' || view_result);
  EXCEPTION WHEN OTHERS THEN
    error_occurred := true;
    view_result := jsonb_build_object(
      'view', 'effective_surface_access',
      'success', false,
      'error', SQLERRM
    );
    result := jsonb_set(result, '{refreshed}', result->'refreshed' || view_result);
  END;

  result := jsonb_set(result, '{success}', to_jsonb(NOT error_occurred));
  result := jsonb_set(result, '{completed_at}', to_jsonb(now()));

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_tenant_license_summary_concurrent() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_tenant_license_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_effective_surface_access_concurrent() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_effective_surface_access() TO authenticated;
GRANT EXECUTE ON FUNCTION scheduled_refresh_all_materialized_views() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE materialized_view_refresh_jobs IS
  'Tracks refresh operations for all materialized views, including performance metrics and error logging';

COMMENT ON FUNCTION scheduled_refresh_all_materialized_views() IS
  'Refreshes all materialized views in sequence and returns comprehensive metrics. Can be called by cron jobs or manual triggers.';

COMMENT ON FUNCTION refresh_tenant_license_summary_concurrent() IS
  'Concurrent refresh of tenant_license_summary materialized view (non-blocking)';

COMMENT ON FUNCTION refresh_effective_surface_access_concurrent() IS
  'Concurrent refresh of effective_surface_access materialized view (non-blocking)';
