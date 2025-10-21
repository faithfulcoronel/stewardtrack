-- =============================================================================
-- Migration: Simplify tenant lookup subquery to avoid ambiguous column errors
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Tenants are viewable by their members" ON tenants;

CREATE POLICY "Tenants are viewable by their members"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_users AS tu
      WHERE tu.tenant_id = tenants.id
        AND tu.user_id = auth.uid()
    )
  );

COMMIT;
