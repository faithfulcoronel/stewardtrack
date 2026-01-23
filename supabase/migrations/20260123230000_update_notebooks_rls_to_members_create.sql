-- =====================================================
-- Update Notebooks RLS to Use members:create Permission
-- =====================================================
--
-- Change the notebooks INSERT policy to use members:create
-- instead of members:edit, following the families table pattern.
--
-- This allows users with members:create permission to create notebooks.

-- Drop the old policy
DROP POLICY IF EXISTS notebooks_insert_policy ON notebooks;

-- Create new policy using members:create permission (following families pattern)
CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:create')
  );
