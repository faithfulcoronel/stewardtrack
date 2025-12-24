-- ================================================================================
-- DISCIPLESHIP PATHWAYS TABLE
-- ================================================================================
--
-- This migration creates a tenant-scoped lookup table for discipleship pathways.
-- Pathways represent spiritual growth tracks like "Growth Track", "Leadership", etc.
--
-- KEY FEATURES:
--   - Tenant-scoped (each church has their own pathways)
--   - Soft delete support
--   - Display ordering for UI presentation
--   - Default pathways seeded during onboarding
--
-- ================================================================================

-- Create discipleship_pathways table
CREATE TABLE IF NOT EXISTS discipleship_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discipleship_pathways_tenant ON discipleship_pathways(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discipleship_pathways_code ON discipleship_pathways(tenant_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discipleship_pathways_active ON discipleship_pathways(tenant_id, is_active) WHERE deleted_at IS NULL;

-- Unique constraint on tenant + code (no duplicate codes per tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_discipleship_pathways_unique_code
  ON discipleship_pathways(tenant_id, code)
  WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE discipleship_pathways ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Discipleship pathways are viewable by tenant users" ON discipleship_pathways
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Discipleship pathways are insertable by tenant admins" ON discipleship_pathways
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      JOIN user_roles ur ON ur.user_id = tu.user_id AND ur.tenant_id = tu.tenant_id
      JOIN roles r ON r.id = ur.role_id
      WHERE tu.user_id = auth.uid()
        AND r.name IN ('tenant_admin', 'staff')
    )
  );

CREATE POLICY "Discipleship pathways are updatable by tenant admins" ON discipleship_pathways
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      JOIN user_roles ur ON ur.user_id = tu.user_id AND ur.tenant_id = tu.tenant_id
      JOIN roles r ON r.id = ur.role_id
      WHERE tu.user_id = auth.uid()
        AND r.name IN ('tenant_admin', 'staff')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      JOIN user_roles ur ON ur.user_id = tu.user_id AND ur.tenant_id = tu.tenant_id
      JOIN roles r ON r.id = ur.role_id
      WHERE tu.user_id = auth.uid()
        AND r.name IN ('tenant_admin', 'staff')
    )
  );

-- Add foreign key to member_discipleship_plans to link to pathways
-- First, add the pathway_id column
ALTER TABLE member_discipleship_plans
  ADD COLUMN IF NOT EXISTS pathway_id uuid REFERENCES discipleship_pathways(id);

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_member_discipleship_plans_pathway
  ON member_discipleship_plans(pathway_id)
  WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON TABLE discipleship_pathways IS 'Tenant-scoped lookup table for discipleship pathways/tracks';
COMMENT ON COLUMN discipleship_pathways.code IS 'Unique code within tenant (e.g., growth_track, leadership)';
COMMENT ON COLUMN discipleship_pathways.display_order IS 'Order for UI display (lower = first)';
