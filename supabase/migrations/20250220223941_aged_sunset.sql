-- Create enums first
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE marital_status_type AS ENUM ('single', 'married', 'widowed', 'divorced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS preferred_name text,
ADD COLUMN IF NOT EXISTS gender gender_type,
ADD COLUMN IF NOT EXISTS marital_status marital_status_type,
ADD COLUMN IF NOT EXISTS baptism_date date,
ADD COLUMN IF NOT EXISTS assigned_pastor_id uuid REFERENCES members(id),
ADD COLUMN IF NOT EXISTS spiritual_gifts text[],
ADD COLUMN IF NOT EXISTS ministry_interests text[],
ADD COLUMN IF NOT EXISTS spouse_id uuid REFERENCES members(id),
ADD COLUMN IF NOT EXISTS household_id uuid,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS leadership_position text,
ADD COLUMN IF NOT EXISTS small_groups text[],
ADD COLUMN IF NOT EXISTS ministries text[],
ADD COLUMN IF NOT EXISTS volunteer_roles text[],
ADD COLUMN IF NOT EXISTS attendance_rate numeric(5,2),
ADD COLUMN IF NOT EXISTS last_attendance_date date,
ADD COLUMN IF NOT EXISTS pastoral_notes text,
ADD COLUMN IF NOT EXISTS prayer_requests text[];

-- Create index for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_members_household_id ON members(household_id);
CREATE INDEX IF NOT EXISTS idx_members_assigned_pastor_id ON members(assigned_pastor_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse_id ON members(spouse_id);
CREATE INDEX IF NOT EXISTS idx_members_baptism_date ON members(baptism_date);
CREATE INDEX IF NOT EXISTS idx_members_last_attendance_date ON members(last_attendance_date);

-- Add comments for documentation
COMMENT ON COLUMN members.preferred_name IS 'The name the member prefers to be called';
COMMENT ON COLUMN members.gender IS 'Member''s gender identity';
COMMENT ON COLUMN members.marital_status IS 'Member''s marital status';
COMMENT ON COLUMN members.baptism_date IS 'Date when the member was baptized';
COMMENT ON COLUMN members.assigned_pastor_id IS 'Reference to the pastor/mentor assigned to this member';
COMMENT ON COLUMN members.spiritual_gifts IS 'Array of spiritual gifts identified for the member';
COMMENT ON COLUMN members.ministry_interests IS 'Array of ministry areas the member is interested in';
COMMENT ON COLUMN members.spouse_id IS 'Reference to the member''s spouse if married';
COMMENT ON COLUMN members.household_id IS 'Unique identifier for grouping family members';
COMMENT ON COLUMN members.emergency_contact_name IS 'Name of emergency contact';
COMMENT ON COLUMN members.emergency_contact_phone IS 'Phone number of emergency contact';
COMMENT ON COLUMN members.leadership_position IS 'Current leadership position in the church';
COMMENT ON COLUMN members.small_groups IS 'Array of small groups the member belongs to';
COMMENT ON COLUMN members.ministries IS 'Array of ministries the member is involved in';
COMMENT ON COLUMN members.volunteer_roles IS 'Array of volunteer positions held';
COMMENT ON COLUMN members.attendance_rate IS 'Percentage of service attendance';
COMMENT ON COLUMN members.last_attendance_date IS 'Date of last recorded attendance';
COMMENT ON COLUMN members.pastoral_notes IS 'Notes from pastoral visits and counseling';
COMMENT ON COLUMN members.prayer_requests IS 'Array of prayer requests';

-- Create function to generate household ID
CREATE OR REPLACE FUNCTION generate_household_id()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT gen_random_uuid();
$$;

-- Create function to update household ID for family members
CREATE OR REPLACE FUNCTION update_family_household_id(
  p_member_id uuid,
  p_household_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update spouse if exists
  UPDATE members
  SET household_id = p_household_id
  WHERE id IN (
    SELECT spouse_id FROM members WHERE id = p_member_id
    UNION
    SELECT id FROM members WHERE spouse_id = p_member_id
  )
  AND household_id IS NULL;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_household_id() TO authenticated;
GRANT EXECUTE ON FUNCTION update_family_household_id(uuid, uuid) TO authenticated;