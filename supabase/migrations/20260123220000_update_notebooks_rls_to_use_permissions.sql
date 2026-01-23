-- =====================================================
-- Update Notebooks RLS to Use Permission-Based Checks
-- =====================================================
--
-- Update the notebooks INSERT policy to follow the same pattern
-- as other tables (goals, care plans, etc.) by using the
-- user_has_permission_for_tenant() function.
--
-- This follows the established RLS pattern in the codebase.

-- Drop the old policy
DROP POLICY IF EXISTS notebooks_insert_policy ON notebooks;

-- Create new policy using permission check (following goals/care plans pattern)
CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  );
