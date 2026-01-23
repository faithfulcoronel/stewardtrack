-- =====================================================
-- Fix Notebook RLS Policies for Soft Delete
-- =====================================================
--
-- The UPDATE policies currently check `deleted_at IS NULL` in the USING clause,
-- which prevents soft deletes from working because the updated row (with deleted_at set)
-- fails the policy check.
--
-- Solution: Remove the deleted_at check from UPDATE policies, but keep it in
-- WITH CHECK to prevent restoring deleted records.

BEGIN;

-- =====================================================
-- NOTEBOOKS TABLE - Fix UPDATE policy
-- =====================================================
DROP POLICY IF EXISTS notebooks_update_policy ON notebooks;

CREATE POLICY notebooks_update_policy ON notebooks
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  )
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- NOTEBOOK SECTIONS TABLE - Fix UPDATE policy
-- =====================================================
DROP POLICY IF EXISTS sections_update_policy ON notebook_sections;

CREATE POLICY sections_update_policy ON notebook_sections
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  )
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- NOTEBOOK PAGES TABLE - Fix UPDATE policy
-- =====================================================
DROP POLICY IF EXISTS pages_update_policy ON notebook_pages;

CREATE POLICY pages_update_policy ON notebook_pages
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  )
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Fixed notebook RLS policies to allow soft deletes';
END $$;
