-- ================================================================================
-- FIX DISCIPLESHIP PATHWAYS RLS - REMOVE HARDCODED ROLE CHECK
-- ================================================================================
--
-- This migration updates the RLS policies to remove hardcoded role checks.
-- RBAC is handled at the application layer, not in RLS policies.
-- RLS should only enforce tenant isolation.
--
-- ================================================================================

-- Drop existing policies that have hardcoded role checks
DROP POLICY IF EXISTS "Discipleship pathways are insertable by tenant admins" ON discipleship_pathways;
DROP POLICY IF EXISTS "Discipleship pathways are updatable by tenant admins" ON discipleship_pathways;

-- Create new INSERT policy - only check tenant membership
CREATE POLICY "Discipleship pathways are insertable by tenant users" ON discipleship_pathways
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

-- Create new UPDATE policy - only check tenant membership
CREATE POLICY "Discipleship pathways are updatable by tenant users" ON discipleship_pathways
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

-- Add DELETE policy for completeness (soft delete via UPDATE is preferred)
CREATE POLICY "Discipleship pathways are deletable by tenant users" ON discipleship_pathways
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );
