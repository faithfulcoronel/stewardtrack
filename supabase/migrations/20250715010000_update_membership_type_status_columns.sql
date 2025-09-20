-- Add membership_type_id and membership_status_id columns referencing new tables
ALTER TABLE members
ADD COLUMN membership_type_id uuid REFERENCES membership_type(id),
ADD COLUMN membership_status_id uuid REFERENCES membership_status(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_members_membership_type ON members(membership_type_id);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status_id);

-- Add comments for clarity
COMMENT ON COLUMN members.membership_type_id IS 'Reference to membership_type table';
COMMENT ON COLUMN members.membership_status_id IS 'Reference to membership_status table';

-- Migrate existing data from categories
DO $$
DECLARE
  v_tenant_id uuid;
  v_membership_cat_id uuid;
  v_status_cat_id uuid;
  v_type_code text;
  v_status_code text;
  v_type_id uuid;
  v_status_id uuid;
BEGIN
  FOR v_tenant_id, v_membership_cat_id, v_status_cat_id IN
    SELECT DISTINCT tenant_id, membership_category_id, status_category_id
    FROM members
    WHERE deleted_at IS NULL
  LOOP
    -- Map membership category to membership_type
    SELECT code INTO v_type_code FROM categories WHERE id = v_membership_cat_id;
    SELECT id INTO v_type_id
    FROM membership_type
    WHERE tenant_id = v_tenant_id
      AND code = v_type_code
      AND deleted_at IS NULL;
    IF v_type_id IS NOT NULL THEN
      UPDATE members
      SET membership_type_id = v_type_id
      WHERE tenant_id = v_tenant_id
        AND membership_category_id = v_membership_cat_id
        AND deleted_at IS NULL;
    END IF;

    -- Map status category to membership_status
    SELECT code INTO v_status_code FROM categories WHERE id = v_status_cat_id;
    SELECT id INTO v_status_id
    FROM membership_status
    WHERE tenant_id = v_tenant_id
      AND code = v_status_code
      AND deleted_at IS NULL;
    IF v_status_id IS NOT NULL THEN
      UPDATE members
      SET membership_status_id = v_status_id
      WHERE tenant_id = v_tenant_id
        AND status_category_id = v_status_cat_id
        AND deleted_at IS NULL;
    END IF;
  END LOOP;
END $$;

-- Drop old indexes
DROP INDEX IF EXISTS idx_members_membership_category;
DROP INDEX IF EXISTS idx_members_status_category;

-- Remove old category reference columns
ALTER TABLE members
DROP COLUMN membership_category_id,
DROP COLUMN status_category_id;
