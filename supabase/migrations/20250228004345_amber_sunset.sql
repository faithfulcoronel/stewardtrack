-- supabase/migrations/20250228004345_amber_sunset.sql

-- Add category reference columns to members table
ALTER TABLE members
ADD COLUMN membership_category_id uuid REFERENCES categories(id),
ADD COLUMN status_category_id uuid REFERENCES categories(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_membership_category ON members(membership_category_id);
CREATE INDEX IF NOT EXISTS idx_members_status_category ON members(status_category_id);

-- Add helpful comments
COMMENT ON COLUMN members.membership_category_id IS 
  'Reference to the membership type category';
COMMENT ON COLUMN members.status_category_id IS
  'Reference to the member status category';

-- Update existing members to use categories
DO $$
DECLARE
  v_tenant_id uuid;
  v_membership_type text;
  v_status text;
  v_membership_category_id uuid;
  v_status_category_id uuid;
BEGIN
  FOR v_tenant_id, v_membership_type, v_status IN 
    SELECT DISTINCT tenant_id, membership_type, status 
    FROM members 
    WHERE deleted_at IS NULL
  LOOP
    -- Get membership category ID
    SELECT id INTO v_membership_category_id
    FROM categories
    WHERE tenant_id = v_tenant_id
    AND type = 'membership'
    AND code = v_membership_type
    AND deleted_at IS NULL;

    -- Get status category ID
    SELECT id INTO v_status_category_id
    FROM categories
    WHERE tenant_id = v_tenant_id
    AND type = 'member_status'
    AND code = v_status
    AND deleted_at IS NULL;

    -- Update members
    IF v_membership_category_id IS NOT NULL AND v_status_category_id IS NOT NULL THEN
      UPDATE members
      SET 
        membership_category_id = v_membership_category_id,
        status_category_id = v_status_category_id
      WHERE tenant_id = v_tenant_id
      AND membership_type = v_membership_type
      AND status = v_status
      AND deleted_at IS NULL;
    END IF;
  END LOOP;
END $$;
