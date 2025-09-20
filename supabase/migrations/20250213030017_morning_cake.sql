-- Add deleted_at column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create index for faster queries on deleted_at
CREATE INDEX IF NOT EXISTS members_deleted_at_idx ON members(deleted_at);

-- Update RLS policies to exclude deleted records
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Members can be managed by authenticated users" ON members;
CREATE POLICY "Members can be managed by authenticated users"
  ON members FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

-- Create function to soft delete members
CREATE OR REPLACE FUNCTION soft_delete_member(member_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE members
  SET deleted_at = now()
  WHERE id = member_id
  AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION soft_delete_member(uuid) TO authenticated;

-- Add comment explaining soft delete
COMMENT ON COLUMN members.deleted_at IS 
  'Timestamp when the member was soft deleted. NULL means the member is active.';

COMMENT ON FUNCTION soft_delete_member(uuid) IS 
  'Soft deletes a member by setting their deleted_at timestamp. Returns true if the member was found and deleted.';