-- Create initial tenant and migrate existing data
DO $$ 
DECLARE
  v_tenant_id uuid;
  v_admin_user_id uuid;
BEGIN
  -- Get the first admin user
  --SELECT user_id INTO v_admin_user_id
  --FROM user_roles ur
  --JOIN roles r ON ur.role_id = r.id
  --WHERE r.name = 'admin'
  --ORDER BY ur.created_at
  --LIMIT 1;

  --IF v_admin_user_id IS NULL THEN
  --  RAISE EXCEPTION 'No admin user found';
  --END IF;

  -- Create initial tenant
  --INSERT INTO tenants (
  --  name,
  --  subdomain,
  --  status,
  --  subscription_tier,
  --  subscription_status,
  --  created_by
  --)
  --VALUES (
  --  'Default Church',
  --  'default',
  --  'active',
  --  'free',
  --  'active',
  --  v_admin_user_id
  --)
  --RETURNING id INTO v_tenant_id;

  -- Assign all existing users to the tenant
  --INSERT INTO tenant_users (tenant_id, user_id, role, created_by)
  --SELECT 
  --  v_tenant_id,
  --  u.id,
  --  CASE 
  --    WHEN EXISTS (
  --      SELECT 1 FROM user_roles ur
  --      JOIN roles r ON ur.role_id = r.id
  --      WHERE ur.user_id = u.id AND r.name = 'admin'
  --    ) THEN 'admin'
  --    ELSE 'member'
  --  END,
  --  v_admin_user_id
  --FROM auth.users u
  --ON CONFLICT DO NOTHING;

  -- Update all existing members
  --UPDATE members
  --SET tenant_id = v_tenant_id
  --WHERE tenant_id IS NULL;

  -- Update all existing financial transactions
  --UPDATE financial_transactions
  --SET tenant_id = v_tenant_id
  --WHERE tenant_id IS NULL;

  -- Update all existing budgets
  --UPDATE budgets
  --SET tenant_id = v_tenant_id
  --WHERE tenant_id IS NULL;

  -- Make tenant_id NOT NULL after migration
  ALTER TABLE members
    ALTER COLUMN tenant_id SET NOT NULL;
  
  ALTER TABLE financial_transactions
    ALTER COLUMN tenant_id SET NOT NULL;
  
  ALTER TABLE budgets
    ALTER COLUMN tenant_id SET NOT NULL;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to create initial tenant: %', SQLERRM;
END $$;