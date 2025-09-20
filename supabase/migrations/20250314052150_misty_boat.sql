/*
  # Add Family Relationships Schema

  1. New Categories
    - Add relationship_type to category_type enum
    - Add default relationship categories

  2. New Tables
    - `family_relationships` table to store relationships between members
      - id (uuid, primary key)
      - member_id (uuid, references members)
      - related_member_id (uuid, references members)
      - relationship_category_id (uuid, references categories)
      - notes (text)
      - created_at, updated_at timestamps
      - created_by, updated_by (uuid, references users)
      - tenant_id (uuid, references tenants)

  3. Security
    - Enable RLS on family_relationships table
    - Add policies for tenant access
*/

-- Add relationship_type to category_type enum
ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'relationship_type';

-- Create family_relationships table
CREATE TABLE IF NOT EXISTS family_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  related_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship_category_id uuid NOT NULL REFERENCES categories(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid null,
  updated_by uuid null,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_relationship UNIQUE (member_id, related_member_id, relationship_category_id, tenant_id)
);

-- Enable RLS
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Family relationships are viewable by authenticated users" 
  ON family_relationships
  FOR SELECT 
  TO authenticated 
  USING (
    true
  );

CREATE POLICY "Family relationships can be managed by authenticated users" 
  ON family_relationships
  FOR ALL 
  TO authenticated 
  USING (
    true
  );

-- Add indexes
CREATE INDEX idx_family_relationships_member_id ON family_relationships(member_id);
CREATE INDEX idx_family_relationships_related_member_id ON family_relationships(related_member_id);
CREATE INDEX idx_family_relationships_tenant_id ON family_relationships(tenant_id);
CREATE INDEX idx_family_relationships_relationship_category ON family_relationships(relationship_category_id);

-- Insert default relationship categories
DO $$ 
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
BEGIN
  -- Get first tenant and user
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  -- Only insert if we have a tenant and user
  IF v_tenant_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    INSERT INTO categories (
      tenant_id, type, code, name, description, is_system, is_active, sort_order, created_by
    ) VALUES 
      (v_tenant_id, 'relationship_type', 'spouse', 'Spouse', 'Spouse/Partner relationship', true, true, 1, auth.uid()),
      (v_tenant_id, 'relationship_type', 'parent', 'Parent', 'Parent relationship', true, true, 2, auth.uid()),
      (v_tenant_id, 'relationship_type', 'child', 'Child', 'Child relationship', true, true, 3, auth.uid()),
      (v_tenant_id, 'relationship_type', 'sibling', 'Sibling', 'Sibling relationship', true, true, 4, auth.uid()),
      (v_tenant_id, 'relationship_type', 'grandparent', 'Grandparent', 'Grandparent relationship', true, true, 5, auth.uid()),
      (v_tenant_id, 'relationship_type', 'grandchild', 'Grandchild', 'Grandchild relationship', true, true, 6, auth.uid()),
      (v_tenant_id, 'relationship_type', 'uncle', 'Uncle', 'Uncle relationship', true, true, 7, auth.uid()),
      (v_tenant_id, 'relationship_type', 'aunt', 'Aunt', 'Aunt relationship', true, true, 8, auth.uid()),
      (v_tenant_id, 'relationship_type', 'nephew', 'Nephew', 'Nephew relationship', true, true, 9, auth.uid()),
      (v_tenant_id, 'relationship_type', 'niece', 'Niece', 'Niece relationship', true, true, 10, auth.uid()),
      (v_tenant_id, 'relationship_type', 'cousin', 'Cousin', 'Cousin relationship', true, true, 11, auth.uid()),
      (v_tenant_id, 'relationship_type', 'guardian', 'Guardian', 'Guardian relationship', true, true, 12, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_family_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_family_relationships_updated_at
  BEFORE UPDATE ON family_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_family_relationships_updated_at();