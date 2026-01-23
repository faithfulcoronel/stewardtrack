-- =====================================================
-- Update Notebooks RLS to Use members:manage Permission
-- =====================================================
--
-- Change the notebooks INSERT policy to use members:manage
-- instead of members:create.

-- Drop the old policy
DROP POLICY IF EXISTS notebooks_insert_policy ON notebooks;

-- Create new policy using members:manage permission
CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:manage')
  );
