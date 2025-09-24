-- Update membership center management policy to align with admin_role usage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'membership_center'
      AND policyname = 'Membership centers can be managed by tenant admins'
  ) THEN
    EXECUTE 'DROP POLICY "Membership centers can be managed by tenant admins" ON membership_center';
  END IF;
END $$;

CREATE POLICY "Membership centers can be managed by tenant admins"
  ON membership_center
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND (
          tu.admin_role = 'super_admin'
          OR (
            tu.tenant_id = membership_center.tenant_id
            AND (
              tu.admin_role IN ('tenant_admin', 'super_admin')
              OR tu.role IN ('admin', 'owner')
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND (
          tu.admin_role = 'super_admin'
          OR (
            tu.tenant_id = membership_center.tenant_id
            AND (
              tu.admin_role IN ('tenant_admin', 'super_admin')
              OR tu.role IN ('admin', 'owner')
            )
          )
        )
    )
  );
