-- =============================================================================
-- Migration: Allow tenant creators to read their tenant before membership exists
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Tenants are viewable by their members" ON tenants;

CREATE POLICY "Tenants are viewable by their members"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    tenants.created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM tenant_users AS tu
      WHERE tu.tenant_id = tenants.id
        AND tu.user_id = auth.uid()
    )
  );

COMMIT;
