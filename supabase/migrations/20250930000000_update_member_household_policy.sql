-- Update member_households manage policy to respect admin_role
DROP POLICY IF EXISTS "Member households are manageable by tenant admins" ON member_households;

CREATE POLICY "Member households are manageable by tenant admins" ON member_households
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND (
          tu.role IN ('admin', 'owner')
          OR tu.admin_role IN ('tenant_admin', 'super_admin')
        )
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND (
          tu.role IN ('admin', 'owner')
          OR tu.admin_role IN ('tenant_admin', 'super_admin')
        )
    )
  );
