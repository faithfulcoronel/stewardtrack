/*
  # Performance Metrics Table

  This migration creates infrastructure for tracking performance metrics.

  ## What it does:
  - Creates performance_metrics table for storing metrics
  - Adds indexes for efficient querying and aggregation
  - Enables historical performance analysis
  - Supports metrics for permission checks, API latency, and more

  ## Key features:
  - Stores metric name, value, unit, and metadata
  - Tracks per-tenant and per-user metrics
  - Partitioned by time for efficient querying
  - Supports percentile calculations
*/

-- Create the performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text NOT NULL CHECK (metric_unit IN ('ms', 'seconds', 'count', 'percentage')),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS performance_metrics_metric_name_idx
  ON performance_metrics (metric_name);

CREATE INDEX IF NOT EXISTS performance_metrics_recorded_at_idx
  ON performance_metrics (recorded_at DESC);

CREATE INDEX IF NOT EXISTS performance_metrics_tenant_id_idx
  ON performance_metrics (tenant_id);

CREATE INDEX IF NOT EXISTS performance_metrics_composite_idx
  ON performance_metrics (metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS performance_metrics_tenant_metric_idx
  ON performance_metrics (tenant_id, metric_name, recorded_at DESC);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own metrics
CREATE POLICY performance_metrics_insert ON performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admins can read all metrics
CREATE POLICY performance_metrics_admin_read ON performance_metrics
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

-- Policy: Users can read their own tenant metrics
CREATE POLICY performance_metrics_tenant_read ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT DISTINCT ur.tenant_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- Function to get percentile latency
CREATE OR REPLACE FUNCTION get_latency_percentiles(
  p_metric_name text,
  p_tenant_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT now() - interval '24 hours',
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH ordered_metrics AS (
    SELECT
      metric_value,
      ROW_NUMBER() OVER (ORDER BY metric_value) as row_num,
      COUNT(*) OVER () as total_count
    FROM performance_metrics
    WHERE metric_name = p_metric_name
      AND recorded_at BETWEEN p_start_date AND p_end_date
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  )
  SELECT jsonb_build_object(
    'p50', (SELECT metric_value FROM ordered_metrics WHERE row_num = GREATEST(1, FLOOR(total_count * 0.5)::int) LIMIT 1),
    'p95', (SELECT metric_value FROM ordered_metrics WHERE row_num = GREATEST(1, FLOOR(total_count * 0.95)::int) LIMIT 1),
    'p99', (SELECT metric_value FROM ordered_metrics WHERE row_num = GREATEST(1, FLOOR(total_count * 0.99)::int) LIMIT 1),
    'avg', (SELECT AVG(metric_value) FROM ordered_metrics),
    'min', (SELECT MIN(metric_value) FROM ordered_metrics),
    'max', (SELECT MAX(metric_value) FROM ordered_metrics),
    'count', (SELECT COUNT(*) FROM ordered_metrics)
  ) INTO result;

  RETURN COALESCE(result, jsonb_build_object(
    'p50', 0, 'p95', 0, 'p99', 0, 'avg', 0, 'min', 0, 'max', 0, 'count', 0
  ));
END;
$$;

-- Function to get metrics summary
CREATE OR REPLACE FUNCTION get_performance_metrics_summary(
  p_start_date timestamptz DEFAULT now() - interval '24 hours',
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'permission_check_latency', get_latency_percentiles('permission_check_latency', NULL, p_start_date, p_end_date),
    'api_latency', get_latency_percentiles('api_latency', NULL, p_start_date, p_end_date),
    'view_refresh_latency', get_latency_percentiles('materialized_view_refresh', NULL, p_start_date, p_end_date)
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to cleanup old metrics
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(
  p_retention_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM performance_metrics
  WHERE recorded_at < now() - (p_retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_latency_percentiles(text, uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_metrics_summary(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_performance_metrics(integer) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE performance_metrics IS
  'Stores performance metrics for permission checks, API latency, and system operations';

COMMENT ON FUNCTION get_latency_percentiles(text, uuid, timestamptz, timestamptz) IS
  'Calculates latency percentiles (p50, p95, p99) for a specific metric';

COMMENT ON FUNCTION get_performance_metrics_summary(timestamptz, timestamptz) IS
  'Returns comprehensive performance metrics summary for the specified time range';

COMMENT ON FUNCTION cleanup_old_performance_metrics(integer) IS
  'Deletes performance metrics older than the specified retention period';
