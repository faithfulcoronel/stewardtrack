-- Migration: Expand member data with spiritual journey and visitor information
-- This migration adds:
-- 1. Religious denomination table (one-to-many: one member has one denomination, denomination can have many members)
-- 2. Visitor information fields (who invited, how they heard about the church, etc.)
-- 3. Spiritual journey / baptism fields (date trusted Christ, baptized by immersion, place, church, by whom)
-- All new fields are optional

-- =============================================================================
-- STEP 1: Create religious_denominations reference table
-- =============================================================================

CREATE TABLE IF NOT EXISTS religious_denominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_religious_denominations_tenant_code ON religious_denominations(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_religious_denominations_deleted_at ON religious_denominations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_religious_denominations_active ON religious_denominations(is_active) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE religious_denominations ENABLE ROW LEVEL SECURITY;

-- RLS policies for religious_denominations
CREATE POLICY "Religious denominations are viewable by tenant users" ON religious_denominations
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Religious denominations can be managed by tenant admins" ON religious_denominations
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_religious_denominations_updated_at
  BEFORE UPDATE ON religious_denominations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE religious_denominations IS 'Reference table for religious denominations (Baptist, Methodist, Presbyterian, etc.)';
COMMENT ON COLUMN religious_denominations.code IS 'Unique code for the denomination within the tenant (e.g., baptist, methodist)';
COMMENT ON COLUMN religious_denominations.name IS 'Display name of the denomination';
COMMENT ON COLUMN religious_denominations.is_system IS 'If true, this is a system-defined denomination that cannot be deleted';

-- =============================================================================
-- STEP 2: Add spiritual journey and baptism fields to members table
-- =============================================================================

ALTER TABLE members
  -- Spiritual journey fields
  ADD COLUMN IF NOT EXISTS date_trusted_christ date,
  ADD COLUMN IF NOT EXISTS baptized_by_immersion boolean,
  ADD COLUMN IF NOT EXISTS baptism_place text,
  ADD COLUMN IF NOT EXISTS baptism_church text,
  ADD COLUMN IF NOT EXISTS baptized_by text,
  ADD COLUMN IF NOT EXISTS testimony text,
  -- Religious denomination reference
  ADD COLUMN IF NOT EXISTS denomination_id uuid REFERENCES religious_denominations(id),
  ADD COLUMN IF NOT EXISTS previous_denomination text;

-- Comments for spiritual journey fields
COMMENT ON COLUMN members.date_trusted_christ IS 'Approximate date when the member trusted Christ / accepted faith';
COMMENT ON COLUMN members.baptized_by_immersion IS 'Whether the member has been baptized by immersion (true/false/null)';
COMMENT ON COLUMN members.baptism_place IS 'Place/location where baptism occurred';
COMMENT ON COLUMN members.baptism_church IS 'Name of the church where baptism occurred';
COMMENT ON COLUMN members.baptized_by IS 'Name of the person who performed the baptism';
COMMENT ON COLUMN members.testimony IS 'The member''s personal testimony or salvation story';
COMMENT ON COLUMN members.denomination_id IS 'Reference to the member''s current religious denomination';
COMMENT ON COLUMN members.previous_denomination IS 'Free text field for previous denomination if applicable';

-- Index for denomination lookup
CREATE INDEX IF NOT EXISTS idx_members_denomination ON members(denomination_id) WHERE denomination_id IS NOT NULL;

-- =============================================================================
-- STEP 3: Add visitor information fields to members table
-- =============================================================================

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_visitor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visitor_invited_by_member_id uuid REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS visitor_invited_by_name text,
  ADD COLUMN IF NOT EXISTS visitor_first_visit_date date,
  ADD COLUMN IF NOT EXISTS visitor_how_heard text,
  ADD COLUMN IF NOT EXISTS visitor_interests text[],
  ADD COLUMN IF NOT EXISTS visitor_follow_up_status text,
  ADD COLUMN IF NOT EXISTS visitor_follow_up_notes text,
  ADD COLUMN IF NOT EXISTS visitor_converted_to_member_date date;

-- Comments for visitor fields
COMMENT ON COLUMN members.is_visitor IS 'Flag indicating if this person is a visitor (not yet a full member)';
COMMENT ON COLUMN members.visitor_invited_by_member_id IS 'Reference to the member who invited this visitor (if they are in the system)';
COMMENT ON COLUMN members.visitor_invited_by_name IS 'Free text name of who invited this visitor (for cases where inviter is not a member)';
COMMENT ON COLUMN members.visitor_first_visit_date IS 'Date of the visitor''s first visit to the church';
COMMENT ON COLUMN members.visitor_how_heard IS 'How the visitor heard about the church (e.g., friend, social media, drove by)';
COMMENT ON COLUMN members.visitor_interests IS 'Array of interests or ministries the visitor expressed interest in';
COMMENT ON COLUMN members.visitor_follow_up_status IS 'Current follow-up status (e.g., pending, contacted, scheduled_visit, no_response)';
COMMENT ON COLUMN members.visitor_follow_up_notes IS 'Notes about follow-up attempts and conversations with the visitor';
COMMENT ON COLUMN members.visitor_converted_to_member_date IS 'Date when the visitor became a full member (if applicable)';

-- Indexes for visitor queries
CREATE INDEX IF NOT EXISTS idx_members_is_visitor ON members(is_visitor) WHERE is_visitor = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_visitor_invited_by ON members(visitor_invited_by_member_id) WHERE visitor_invited_by_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_visitor_first_visit ON members(visitor_first_visit_date) WHERE visitor_first_visit_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_visitor_follow_up_status ON members(visitor_follow_up_status) WHERE visitor_follow_up_status IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- STEP 4: Insert common denominations for existing tenants
-- =============================================================================

-- Create a helper function to insert default denominations
CREATE OR REPLACE FUNCTION insert_default_denominations_for_tenant(p_tenant_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  INSERT INTO religious_denominations (tenant_id, code, name, description, is_system, sort_order, created_by)
  VALUES
    (p_tenant_id, 'baptist', 'Baptist', 'Baptist denomination', true, 1, v_user_id),
    (p_tenant_id, 'catholic', 'Catholic', 'Roman Catholic Church', true, 2, v_user_id),
    (p_tenant_id, 'methodist', 'Methodist', 'Methodist denomination', true, 3, v_user_id),
    (p_tenant_id, 'presbyterian', 'Presbyterian', 'Presbyterian denomination', true, 4, v_user_id),
    (p_tenant_id, 'lutheran', 'Lutheran', 'Lutheran denomination', true, 5, v_user_id),
    (p_tenant_id, 'episcopal', 'Episcopal', 'Episcopal/Anglican denomination', true, 6, v_user_id),
    (p_tenant_id, 'pentecostal', 'Pentecostal', 'Pentecostal denomination', true, 7, v_user_id),
    (p_tenant_id, 'church_of_christ', 'Church of Christ', 'Church of Christ denomination', true, 8, v_user_id),
    (p_tenant_id, 'assemblies_of_god', 'Assemblies of God', 'Assemblies of God denomination', true, 9, v_user_id),
    (p_tenant_id, 'seventh_day_adventist', 'Seventh-day Adventist', 'Seventh-day Adventist denomination', true, 10, v_user_id),
    (p_tenant_id, 'nondenominational', 'Non-denominational', 'Non-denominational Christian', true, 11, v_user_id),
    (p_tenant_id, 'evangelical', 'Evangelical', 'Evangelical Christian', true, 12, v_user_id),
    (p_tenant_id, 'born_again', 'Born Again Christian', 'Born Again Christian', true, 13, v_user_id),
    (p_tenant_id, 'iglesia_ni_cristo', 'Iglesia ni Cristo', 'Iglesia ni Cristo', true, 14, v_user_id),
    (p_tenant_id, 'jehovahs_witness', 'Jehovah''s Witness', 'Jehovah''s Witness', true, 15, v_user_id),
    (p_tenant_id, 'latter_day_saints', 'Latter-day Saints', 'Church of Jesus Christ of Latter-day Saints', true, 16, v_user_id),
    (p_tenant_id, 'orthodox', 'Orthodox', 'Eastern Orthodox Church', true, 17, v_user_id),
    (p_tenant_id, 'other', 'Other', 'Other denomination not listed', true, 99, v_user_id),
    (p_tenant_id, 'none', 'None / No prior denomination', 'No prior religious affiliation', true, 100, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION insert_default_denominations_for_tenant(uuid, uuid) IS 'Inserts default religious denominations for a tenant';

-- Insert default denominations for all existing tenants
DO $$
DECLARE
  t_record RECORD;
BEGIN
  FOR t_record IN SELECT id FROM tenants WHERE deleted_at IS NULL LOOP
    PERFORM insert_default_denominations_for_tenant(t_record.id);
  END LOOP;
END $$;

-- =============================================================================
-- STEP 5: Update tenant registration function to include denominations
-- =============================================================================

-- Note: The handle_new_tenant_registration function should be updated to call
-- insert_default_denominations_for_tenant. This can be done by adding:
-- PERFORM insert_default_denominations_for_tenant(new_tenant_id, p_user_id);
-- after the membership type/status inserts.

-- For now, we'll create a trigger to auto-insert denominations for new tenants
CREATE OR REPLACE FUNCTION auto_insert_denominations_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM insert_default_denominations_for_tenant(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_auto_insert_denominations ON tenants;
CREATE TRIGGER trg_auto_insert_denominations
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_denominations_for_new_tenant();

-- =============================================================================
-- STEP 6: Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION insert_default_denominations_for_tenant(uuid, uuid) TO authenticated;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: Added spiritual journey fields, visitor information, and religious denominations table';
END $$;
