-- =====================================================
-- Fix Notebooks INSERT RLS Policy
-- =====================================================
--
-- The original INSERT policy only checked tenant_id but didn't
-- verify that owner_id matches the authenticated user.
-- This was causing RLS violations when creating notebooks.

-- Drop the old policy
DROP POLICY IF EXISTS notebooks_insert_policy ON notebooks;

-- Create new policy that checks both tenant_id and owner_id
CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT
  WITH CHECK (
    -- User must belong to the tenant
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    AND
    -- User must be set as the owner
    owner_id = auth.uid()
  );
