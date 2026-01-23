-- =====================================================
-- Simplify Notebooks RLS - Tenant-Aware Only
-- =====================================================
--
-- Simplify the notebooks INSERT policy to only check:
-- 1. User belongs to the tenant
-- 2. User is set as the owner
--
-- This removes complex permission checks and just ensures
-- basic tenant isolation and ownership.

-- Drop the old policy
DROP POLICY IF EXISTS notebooks_insert_policy ON notebooks;

-- Create simplified tenant-aware policy
CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must belong to the tenant
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND
    -- User must be set as the owner
    owner_id = auth.uid()
  );
