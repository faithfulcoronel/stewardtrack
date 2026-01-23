-- =====================================================
-- Simplify All Notebook RLS Policies - Tenant-Aware Only
-- =====================================================
--
-- Simplify all notebook-related table RLS policies to only check:
-- 1. User is authenticated
-- 2. User belongs to the tenant
--
-- This removes all complex permission and access checks.

BEGIN;

-- =====================================================
-- NOTEBOOKS TABLE
-- =====================================================
DROP POLICY IF EXISTS notebooks_select_policy ON notebooks;
DROP POLICY IF EXISTS notebooks_insert_policy ON notebooks;
DROP POLICY IF EXISTS notebooks_update_policy ON notebooks;
DROP POLICY IF EXISTS notebooks_delete_policy ON notebooks;

CREATE POLICY notebooks_select_policy ON notebooks
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY notebooks_update_policy ON notebooks
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY notebooks_delete_policy ON notebooks
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- NOTEBOOK SECTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS sections_select_policy ON notebook_sections;
DROP POLICY IF EXISTS sections_insert_policy ON notebook_sections;
DROP POLICY IF EXISTS sections_update_policy ON notebook_sections;
DROP POLICY IF EXISTS sections_delete_policy ON notebook_sections;

CREATE POLICY sections_select_policy ON notebook_sections
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY sections_insert_policy ON notebook_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY sections_update_policy ON notebook_sections
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY sections_delete_policy ON notebook_sections
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- NOTEBOOK PAGES TABLE
-- =====================================================
DROP POLICY IF EXISTS pages_select_policy ON notebook_pages;
DROP POLICY IF EXISTS pages_insert_policy ON notebook_pages;
DROP POLICY IF EXISTS pages_update_policy ON notebook_pages;
DROP POLICY IF EXISTS pages_delete_policy ON notebook_pages;

CREATE POLICY pages_select_policy ON notebook_pages
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY pages_insert_policy ON notebook_pages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY pages_update_policy ON notebook_pages
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY pages_delete_policy ON notebook_pages
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- NOTEBOOK SHARES TABLE
-- =====================================================
DROP POLICY IF EXISTS shares_select_policy ON notebook_shares;
DROP POLICY IF EXISTS shares_insert_policy ON notebook_shares;
DROP POLICY IF EXISTS shares_update_policy ON notebook_shares;
DROP POLICY IF EXISTS shares_delete_policy ON notebook_shares;

CREATE POLICY shares_select_policy ON notebook_shares
  FOR SELECT TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY shares_insert_policy ON notebook_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY shares_update_policy ON notebook_shares
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY shares_delete_policy ON notebook_shares
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- NOTEBOOK ATTACHMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS attachments_select_policy ON notebook_attachments;
DROP POLICY IF EXISTS attachments_insert_policy ON notebook_attachments;
DROP POLICY IF EXISTS attachments_delete_policy ON notebook_attachments;

CREATE POLICY attachments_select_policy ON notebook_attachments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY attachments_insert_policy ON notebook_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY attachments_delete_policy ON notebook_attachments
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- NOTEBOOK ACTIVITY LOG TABLE
-- =====================================================
DROP POLICY IF EXISTS activity_select_policy ON notebook_activity_log;
DROP POLICY IF EXISTS activity_insert_policy ON notebook_activity_log;

CREATE POLICY activity_select_policy ON notebook_activity_log
  FOR SELECT TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY activity_insert_policy ON notebook_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Simplified all notebook RLS policies to tenant-aware only';
END $$;
