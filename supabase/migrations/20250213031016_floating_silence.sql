-- Create function to check if user has member role only
CREATE OR REPLACE FUNCTION is_member_only()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'member'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur2
      JOIN roles r2 ON ur2.role_id = r2.id
      WHERE ur2.user_id = auth.uid()
      AND r2.name != 'member'
    )
  );
END;
$$;

-- Create function to check if record belongs to user
CREATE OR REPLACE FUNCTION belongs_to_user(member_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get the member ID associated with the current user
  RETURN EXISTS (
    SELECT 1 FROM members m
    JOIN auth.users u ON u.email = m.email
    WHERE m.id = member_id
    AND u.id = auth.uid()
  );
END;
$$;

-- Update members RLS policies
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Admin and other roles can view all members
      NOT is_member_only()
      OR
      -- Members can only view their own profile
      belongs_to_user(id)
    )
  );

DROP POLICY IF EXISTS "Members can be managed by authenticated users" ON members;
CREATE POLICY "Members can be managed by authenticated users"
  ON members FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Admin and other roles can manage all members
      NOT is_member_only()
      OR
      -- Members can only manage their own profile
      belongs_to_user(id)
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      NOT is_member_only()
      OR
      belongs_to_user(id)
    )
  );

-- Update financial_transactions RLS policies
DROP POLICY IF EXISTS "Financial transactions are viewable by authenticated users" ON financial_transactions;
CREATE POLICY "Financial transactions are viewable by authenticated users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    -- Admin and other roles can view all transactions
    NOT is_member_only()
    OR
    -- Members can only view their own transactions
    (member_id IS NOT NULL AND belongs_to_user(member_id))
  );

DROP POLICY IF EXISTS "Financial transactions can be managed by authenticated users" ON financial_transactions;
CREATE POLICY "Financial transactions can be managed by authenticated users"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    -- Only admin and other roles can manage transactions
    NOT is_member_only()
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_member_only() TO authenticated;
GRANT EXECUTE ON FUNCTION belongs_to_user(uuid) TO authenticated;