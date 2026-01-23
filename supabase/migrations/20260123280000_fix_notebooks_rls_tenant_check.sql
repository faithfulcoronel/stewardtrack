-- =====================================================
-- Fix Notebooks RLS - Create Helper Function for Tenant Check
-- =====================================================
--
-- Problem: tenant_users has RLS enabled but no policies, so the
-- subquery in notebooks INSERT policy is blocked.
--
-- Solution: Create a SECURITY DEFINER function to check tenant
-- membership, bypassing RLS.

-- Create helper function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
SET row_security = off
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM tenant_users
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
  );
END;
$$;

COMMENT ON FUNCTION user_belongs_to_tenant(uuid, uuid) IS
  'Checks if a user belongs to a tenant. '
  'Uses SECURITY DEFINER and row_security=off to bypass RLS on tenant_users table.';

-- Update notebooks INSERT policy to use the helper function
DROP POLICY IF EXISTS notebooks_insert_policy ON notebooks;

CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must belong to the tenant (using helper function to bypass RLS)
    user_belongs_to_tenant(auth.uid(), tenant_id)
    AND
    -- User must be set as the owner
    owner_id = auth.uid()
  );
