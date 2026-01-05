-- Migration: Create Families System
-- This migration creates a new families system that allows members to belong to
-- multiple families with primary/secondary designations.
--
-- Key features:
-- 1. `families` table - replaces `member_households` with improved schema
-- 2. `family_members` junction table - many-to-many with role support
-- 3. Trigger to enforce single primary family per member
-- 4. RBAC-based RLS policies using permission functions

-- ============================================================================
-- STEP 1: Create family_role enum type
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_role_type') THEN
    CREATE TYPE family_role_type AS ENUM ('head', 'spouse', 'child', 'dependent', 'other');
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create families table
-- ============================================================================

CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  name text NOT NULL,
  formal_name text,

  -- Address (shared by family members)
  address_street text,
  address_street2 text,
  address_city text,
  address_state text,
  address_postal_code text,
  address_country text DEFAULT 'USA',

  -- Church-specific
  family_photo_url text,

  -- Metadata
  notes text,
  tags text[],

  -- Encryption support
  encrypted_fields jsonb DEFAULT '[]'::jsonb,
  encryption_key_version integer,

  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Add comment
COMMENT ON TABLE families IS 'Stores family/household information. Members can belong to multiple families via family_members junction table.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_families_tenant ON families(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_families_name ON families(tenant_id, name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_families_deleted ON families(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create updated_at trigger
CREATE TRIGGER set_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STEP 3: Create family_members junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Relationships
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Membership type
  is_primary boolean NOT NULL DEFAULT false,
  role family_role_type NOT NULL DEFAULT 'other',

  -- Role details
  role_notes text,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  joined_at date DEFAULT CURRENT_DATE,
  left_at date,

  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT family_members_unique UNIQUE (tenant_id, family_id, member_id)
);

-- Add comments
COMMENT ON TABLE family_members IS 'Junction table linking members to families. Each member can have one primary family and multiple secondary families.';
COMMENT ON COLUMN family_members.is_primary IS 'TRUE = primary family (main residence), FALSE = secondary family. Each member can have at most ONE primary family.';
COMMENT ON COLUMN family_members.role IS 'Role within the family: head, spouse, child, dependent, other';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_family_members_member ON family_members(member_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_family_members_primary ON family_members(member_id, is_primary) WHERE is_primary = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_family_members_tenant ON family_members(tenant_id);

-- Create updated_at trigger
CREATE TRIGGER set_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STEP 4: Create trigger to enforce single primary family per member
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_single_primary_family()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce when setting is_primary = true on an active record
  IF NEW.is_primary = true AND NEW.is_active = true THEN
    -- Auto-demote any existing primary family for this member
    UPDATE family_members
    SET
      is_primary = false,
      updated_at = now()
    WHERE member_id = NEW.member_id
      AND is_primary = true
      AND is_active = true
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_single_primary_family() IS 'Ensures each member has at most ONE primary family. Auto-demotes existing primary when a new primary is set.';

CREATE TRIGGER family_members_enforce_primary
  BEFORE INSERT OR UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_family();

-- ============================================================================
-- STEP 5: Enable RLS and create policies for families table
-- ============================================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- View policy: Users with members:view permission can view families
CREATE POLICY "Families viewable by users with members:view permission" ON families
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'members:view')
  );

-- Insert policy: Users with members:create permission can create families
CREATE POLICY "Families can be created by users with members:create permission" ON families
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:create')
  );

-- Update policy: Users with members:edit permission can update families
CREATE POLICY "Families can be updated by users with members:edit permission" ON families
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'members:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  );

-- Delete policy: Users with members:delete permission can delete families
CREATE POLICY "Families can be deleted by users with members:delete permission" ON families
  FOR DELETE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:delete')
  );

-- ============================================================================
-- STEP 6: Enable RLS and create policies for family_members table
-- ============================================================================

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- View policy: Users with members:view permission can view family members
CREATE POLICY "Family members viewable by users with members:view permission" ON family_members
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND user_has_permission_for_tenant(tenant_id, 'members:view')
  );

-- Insert policy: Users with members:create permission can add family members
CREATE POLICY "Family members can be created by users with members:create permission" ON family_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:create')
  );

-- Update policy: Users with members:edit permission can update family members
CREATE POLICY "Family members can be updated by users with members:edit permission" ON family_members
  FOR UPDATE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  );

-- Delete policy: Users with members:delete permission can delete family members
CREATE POLICY "Family members can be deleted by users with members:delete permission" ON family_members
  FOR DELETE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:delete')
  );

-- ============================================================================
-- STEP 7: Fix family_relationships RLS policies (currently too permissive)
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Family relationships are viewable by authenticated users" ON family_relationships;
DROP POLICY IF EXISTS "Family relationships can be managed by authenticated users" ON family_relationships;

-- Create new permission-based policies
CREATE POLICY "Family relationships viewable by users with members:view permission" ON family_relationships
  FOR SELECT TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:view')
  );

CREATE POLICY "Family relationships can be created by users with members:create permission" ON family_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:create')
  );

CREATE POLICY "Family relationships can be updated by users with members:edit permission" ON family_relationships
  FOR UPDATE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  );

CREATE POLICY "Family relationships can be deleted by users with members:delete permission" ON family_relationships
  FOR DELETE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:delete')
  );

-- ============================================================================
-- STEP 8: Add columns to family_relationships for inverse relationship tracking
-- ============================================================================

ALTER TABLE family_relationships
  ADD COLUMN IF NOT EXISTS inverse_relationship_id uuid REFERENCES family_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_auto_created boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_family_relationships_inverse ON family_relationships(inverse_relationship_id);

COMMENT ON COLUMN family_relationships.inverse_relationship_id IS 'Reference to the automatically created inverse relationship (e.g., parent creates child, child references parent)';
COMMENT ON COLUMN family_relationships.is_auto_created IS 'TRUE if this relationship was automatically created as an inverse of another relationship';

-- ============================================================================
-- STEP 9: Create function to auto-create inverse relationships
-- ============================================================================

-- First, add the dependent relationship type if it doesn't exist
DO $$
BEGIN
  -- Check if dependent category exists
  IF NOT EXISTS (
    SELECT 1 FROM categories
    WHERE type = 'relationship_type'::category_type AND code = 'dependent'
  ) THEN
    -- Insert dependent category for each tenant that has relationship types
    INSERT INTO categories (tenant_id, type, code, name, description, is_system, is_active, sort_order)
    SELECT DISTINCT
      tenant_id,
      'relationship_type'::category_type,
      'dependent',
      'Dependent',
      'Dependent relationship (inverse of guardian)',
      true,
      true,
      13
    FROM categories
    WHERE type = 'relationship_type'::category_type
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Create function to auto-create inverse relationships
CREATE OR REPLACE FUNCTION create_inverse_family_relationship()
RETURNS TRIGGER AS $$
DECLARE
  inverse_category_code text;
  inverse_category_id uuid;
  inverse_rel_id uuid;
  source_category_code text;
BEGIN
  -- Skip if this is an auto-created inverse relationship to prevent infinite loop
  IF NEW.is_auto_created = true THEN
    RETURN NEW;
  END IF;

  -- Get the source relationship category code
  SELECT code INTO source_category_code
  FROM categories
  WHERE id = NEW.relationship_category_id;

  -- Determine the inverse relationship category code
  inverse_category_code := CASE source_category_code
    WHEN 'spouse' THEN 'spouse'
    WHEN 'parent' THEN 'child'
    WHEN 'child' THEN 'parent'
    WHEN 'sibling' THEN 'sibling'
    WHEN 'grandparent' THEN 'grandchild'
    WHEN 'grandchild' THEN 'grandparent'
    WHEN 'uncle' THEN 'nephew'
    WHEN 'aunt' THEN 'niece'
    WHEN 'nephew' THEN 'uncle'
    WHEN 'niece' THEN 'aunt'
    WHEN 'cousin' THEN 'cousin'
    WHEN 'guardian' THEN 'dependent'
    WHEN 'dependent' THEN 'guardian'
    ELSE NULL
  END;

  -- If no inverse relationship type found, skip
  IF inverse_category_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the inverse relationship category ID for the same tenant
  SELECT id INTO inverse_category_id
  FROM categories
  WHERE tenant_id = NEW.tenant_id
    AND type = 'relationship_type'::category_type
    AND code = inverse_category_code;

  -- If inverse category doesn't exist for this tenant, skip
  IF inverse_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if inverse relationship already exists
  IF EXISTS (
    SELECT 1 FROM family_relationships
    WHERE member_id = NEW.related_member_id
      AND related_member_id = NEW.member_id
      AND relationship_category_id = inverse_category_id
      AND tenant_id = NEW.tenant_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Create inverse relationship
  INSERT INTO family_relationships (
    member_id,
    related_member_id,
    relationship_category_id,
    tenant_id,
    is_auto_created,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    NEW.related_member_id,
    NEW.member_id,
    inverse_category_id,
    NEW.tenant_id,
    true,
    NEW.notes,
    NEW.created_by,
    NEW.updated_by
  )
  RETURNING id INTO inverse_rel_id;

  -- Link them together (update the original with the inverse ID)
  -- We do this in an AFTER trigger to avoid modifying NEW
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_inverse_family_relationship() IS 'Automatically creates inverse relationships (e.g., when A is parent of B, creates B is child of A)';

-- Create trigger for auto-creating inverse relationships
DROP TRIGGER IF EXISTS family_relationships_auto_inverse ON family_relationships;
CREATE TRIGGER family_relationships_auto_inverse
  AFTER INSERT ON family_relationships
  FOR EACH ROW
  EXECUTE FUNCTION create_inverse_family_relationship();

-- ============================================================================
-- STEP 10: Create function to link inverse relationships after creation
-- ============================================================================

CREATE OR REPLACE FUNCTION link_inverse_relationships()
RETURNS TRIGGER AS $$
DECLARE
  inverse_category_code text;
  inverse_rel_id uuid;
  source_category_code text;
BEGIN
  -- Only run for non-auto-created relationships
  IF NEW.is_auto_created = true THEN
    RETURN NEW;
  END IF;

  -- Get the source relationship category code
  SELECT code INTO source_category_code
  FROM categories
  WHERE id = NEW.relationship_category_id;

  -- Determine the inverse relationship category code
  inverse_category_code := CASE source_category_code
    WHEN 'spouse' THEN 'spouse'
    WHEN 'parent' THEN 'child'
    WHEN 'child' THEN 'parent'
    WHEN 'sibling' THEN 'sibling'
    WHEN 'grandparent' THEN 'grandchild'
    WHEN 'grandchild' THEN 'grandparent'
    WHEN 'uncle' THEN 'nephew'
    WHEN 'aunt' THEN 'niece'
    WHEN 'nephew' THEN 'uncle'
    WHEN 'niece' THEN 'aunt'
    WHEN 'cousin' THEN 'cousin'
    WHEN 'guardian' THEN 'dependent'
    WHEN 'dependent' THEN 'guardian'
    ELSE NULL
  END;

  IF inverse_category_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find and link the inverse relationship
  SELECT fr.id INTO inverse_rel_id
  FROM family_relationships fr
  JOIN categories c ON fr.relationship_category_id = c.id
  WHERE fr.member_id = NEW.related_member_id
    AND fr.related_member_id = NEW.member_id
    AND fr.tenant_id = NEW.tenant_id
    AND c.code = inverse_category_code
    AND fr.is_auto_created = true
    AND fr.inverse_relationship_id IS NULL;

  IF inverse_rel_id IS NOT NULL THEN
    -- Link both relationships to each other
    UPDATE family_relationships SET inverse_relationship_id = inverse_rel_id WHERE id = NEW.id;
    UPDATE family_relationships SET inverse_relationship_id = NEW.id WHERE id = inverse_rel_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a separate trigger that runs after the insert to link relationships
DROP TRIGGER IF EXISTS family_relationships_link_inverse ON family_relationships;
CREATE TRIGGER family_relationships_link_inverse
  AFTER INSERT ON family_relationships
  FOR EACH ROW
  EXECUTE FUNCTION link_inverse_relationships();

-- ============================================================================
-- STEP 11: Create view for easy family member queries
-- ============================================================================

CREATE OR REPLACE VIEW family_members_view AS
SELECT
  fm.id,
  fm.tenant_id,
  fm.family_id,
  fm.member_id,
  fm.is_primary,
  fm.role,
  fm.role_notes,
  fm.is_active,
  fm.joined_at,
  fm.left_at,
  fm.created_at,
  fm.updated_at,
  f.name as family_name,
  f.formal_name as family_formal_name,
  f.address_street,
  f.address_street2,
  f.address_city,
  f.address_state,
  f.address_postal_code,
  f.address_country,
  f.family_photo_url,
  m.first_name,
  m.last_name,
  m.email,
  m.contact_number,
  m.profile_picture_url
FROM family_members fm
JOIN families f ON f.id = fm.family_id
JOIN members m ON m.id = fm.member_id
WHERE fm.is_active = true
  AND f.deleted_at IS NULL
  AND m.deleted_at IS NULL;

COMMENT ON VIEW family_members_view IS 'Denormalized view of family members with family and member details for easy querying';

-- ============================================================================
-- STEP 12: Migrate existing data from member_households to families
-- ============================================================================

-- Only migrate if member_households table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_households') THEN
    -- Migrate household data to families
    INSERT INTO families (
      id,
      tenant_id,
      name,
      address_street,
      address_city,
      address_state,
      address_postal_code,
      notes,
      encrypted_fields,
      encryption_key_version,
      created_at,
      updated_at,
      created_by,
      updated_by,
      deleted_at
    )
    SELECT
      id,
      tenant_id,
      COALESCE(name, 'Family ' || SUBSTRING(id::text, 1, 8)),
      address_street,
      address_city,
      address_state,
      address_postal_code,
      notes,
      encrypted_fields,
      encryption_key_version,
      created_at,
      updated_at,
      created_by,
      updated_by,
      deleted_at
    FROM member_households
    ON CONFLICT (id) DO NOTHING;

    -- Create family_members entries for existing member-household relationships
    INSERT INTO family_members (
      tenant_id,
      family_id,
      member_id,
      is_primary,
      role,
      is_active,
      created_at,
      created_by
    )
    SELECT
      m.tenant_id,
      m.household_id,
      m.id,
      true,  -- All existing relationships become primary
      'other'::family_role_type,  -- Default role
      true,
      m.created_at,
      m.created_by
    FROM members m
    WHERE m.household_id IS NOT NULL
      AND m.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM families f WHERE f.id = m.household_id)
    ON CONFLICT (tenant_id, family_id, member_id) DO NOTHING;

    RAISE NOTICE 'Migrated data from member_households to families';
  END IF;
END $$;

-- ============================================================================
-- STEP 13: Create helper functions for family queries
-- ============================================================================

-- Function to get a member's primary family
CREATE OR REPLACE FUNCTION get_member_primary_family(p_member_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT family_id
  FROM family_members
  WHERE member_id = p_member_id
    AND is_primary = true
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_member_primary_family(uuid) IS 'Returns the primary family ID for a given member';

-- Function to get family member count
CREATE OR REPLACE FUNCTION get_family_member_count(p_family_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM family_members
  WHERE family_id = p_family_id
    AND is_active = true;
$$;

COMMENT ON FUNCTION get_family_member_count(uuid) IS 'Returns the count of active members in a family';

-- Function to get family head
CREATE OR REPLACE FUNCTION get_family_head(p_family_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT member_id
  FROM family_members
  WHERE family_id = p_family_id
    AND role = 'head'
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_family_head(uuid) IS 'Returns the member ID of the family head';
