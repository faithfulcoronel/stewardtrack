-- Create membership_type and membership_status tables with RLS

-- Table for membership types
CREATE TABLE IF NOT EXISTS membership_type (
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

-- Table for membership statuses
CREATE TABLE IF NOT EXISTS membership_status (
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
CREATE INDEX IF NOT EXISTS idx_membership_type_tenant_code ON membership_type(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_membership_type_deleted_at ON membership_type(deleted_at);
CREATE INDEX IF NOT EXISTS idx_membership_status_tenant_code ON membership_status(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_membership_status_deleted_at ON membership_status(deleted_at);

-- Enable RLS
ALTER TABLE membership_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for membership_type
CREATE POLICY "Membership types are viewable by tenant users" ON membership_type
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Membership types can be managed by tenant admins" ON membership_type
  FOR ALL TO authenticated
  USING (
    true
  );

-- RLS policies for membership_status
CREATE POLICY "Membership statuses are viewable by tenant users" ON membership_status
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Membership statuses can be managed by tenant admins" ON membership_status
  FOR ALL TO authenticated
  USING (
    true
  );


-- Update tenant registration function to insert into new tables
DROP FUNCTION IF EXISTS handle_new_tenant_registration(uuid, text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION handle_new_tenant_registration(
  p_user_id uuid,
  p_tenant_name text,
  p_tenant_subdomain text,
  p_tenant_address text,
  p_tenant_contact text,
  p_tenant_email text,
  p_tenant_website text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_tenant_id uuid;
  is_first_user boolean;
  admin_role_id uuid;
  member_role_id uuid;
  v_membership_category_id uuid;
  v_status_category_id uuid;
  v_member_id uuid;
BEGIN
  -- Input validation
  IF p_tenant_subdomain !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid subdomain format';
  END IF;

  -- Check for existing subdomain
  IF EXISTS (SELECT 1 FROM tenants WHERE subdomain = p_tenant_subdomain FOR UPDATE) THEN
    RAISE EXCEPTION 'Subdomain is already in use';
  END IF;

  -- Check for existing email
  IF EXISTS (SELECT 1 FROM tenants WHERE email = p_tenant_email FOR UPDATE) THEN
    RAISE EXCEPTION 'Email is already in use';
  END IF;

  -- Check if this is the first user
  SELECT COUNT(*) = 1 INTO is_first_user FROM auth.users;

  -- Get role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';

  IF admin_role_id IS NULL OR member_role_id IS NULL THEN
    RAISE EXCEPTION 'Required roles not found';
  END IF;

  -- Create the tenant
  INSERT INTO tenants (
    name, subdomain, address, contact_number, email, website, status,
    subscription_tier, subscription_status, created_by
  ) VALUES (
    p_tenant_name,
    p_tenant_subdomain,
    p_tenant_address,
    p_tenant_contact,
    p_tenant_email,
    p_tenant_website,
    'active',
    CASE WHEN is_first_user THEN 'system' ELSE 'free' END,
    'active',
    p_user_id
  ) RETURNING id INTO new_tenant_id;

  -- Create default chart of accounts for tenant
  PERFORM create_default_chart_of_accounts_for_tenant(new_tenant_id, p_user_id);

  -- Create default funds
  INSERT INTO funds (tenant_id, name, code, type, description)
  VALUES
    (new_tenant_id, 'General Fund', 'GENERAL', 'unrestricted', 'Church operations, salaries, utilities, etc.'),
    (new_tenant_id, 'Tithes & Offerings Fund', 'TITHES_OFFERINGS', 'unrestricted', 'Regular giving from members'),
    (new_tenant_id, 'Building Fund', 'BUILDING', 'restricted', 'Construction, renovation, expansion'),
    (new_tenant_id, 'Lot Fund', 'LOT', 'restricted', 'Land purchase for future buildings or expansion'),
    (new_tenant_id, 'Missions Fund', 'MISSIONS', 'restricted', 'Local & foreign missionary support'),
    (new_tenant_id, 'Youth Ministry Fund', 'YOUTH_MINISTRY', 'restricted', 'Camps, fellowships, materials for youth'),
    (new_tenant_id, 'Children''s / DVBS Fund', 'CHILDRENS_DVBS', 'restricted', 'Sunday School, Vacation Bible School'),
    (new_tenant_id, 'Love Gift / Benevolence Fund', 'LOVE_GIFT_BENEVOLENCE', 'restricted', 'Assisting members in financial crisis'),
    (new_tenant_id, 'Pastor''s Care Fund', 'PASTORS_CARE', 'restricted', 'For pastor''s family, medical needs, etc.'),
    (new_tenant_id, 'Scholarship Fund', 'SCHOLARSHIP', 'restricted', 'For sponsoring Bible school or academic students'),
    (new_tenant_id, 'Church Planting Fund', 'CHURCH_PLANTING', 'restricted', 'Support for new churches, missions, outreaches'),
    (new_tenant_id, 'Music / Worship Fund', 'MUSIC_WORSHIP', 'restricted', 'Equipment, uniforms, musical training'),
    (new_tenant_id, 'Transportation Fund', 'TRANSPORTATION', 'restricted', 'For church vehicles or travel needs'),
    (new_tenant_id, 'Media & Livestream Fund', 'MEDIA_LIVESTREAM', 'restricted', 'Equipment for digital outreach and livestream'),
    (new_tenant_id, 'Anniversary / Events Fund', 'ANNIVERSARY_EVENTS', 'restricted', 'For special events, anniversaries, joint fellowships'),
    (new_tenant_id, 'Endowment Fund', 'ENDOWMENT', 'restricted', 'Long-term investment with restricted use')
  ON CONFLICT DO NOTHING;

  -- Create tenant_user relationship
  INSERT INTO tenant_users (
    tenant_id, user_id, admin_role, created_by
  ) VALUES (
    new_tenant_id,
    p_user_id,
    CASE WHEN is_first_user THEN 'super_admin'::admin_role_type ELSE 'tenant_admin'::admin_role_type END,
    p_user_id
  );

  -- Assign roles to user
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES
    (p_user_id, admin_role_id, p_user_id),
    (p_user_id, member_role_id, p_user_id)
  ON CONFLICT DO NOTHING;

 -- Create membership type and status and capture IDs
  INSERT INTO membership_type (tenant_id, code, name, is_system, created_by)
  VALUES (new_tenant_id, 'member', 'Member', true, auth.uid())
  RETURNING id INTO v_membership_category_id;

  INSERT INTO membership_type (tenant_id, code, name, is_system, created_by)
  VALUES
    (new_tenant_id, 'non_member', 'Non-Member', true, auth.uid()),
    (new_tenant_id, 'visitor', 'visitor', true, auth.uid());

  INSERT INTO membership_status (tenant_id, code, name, is_system, created_by)
  VALUES (new_tenant_id, 'active', 'Active', true, p_user_id)
  RETURNING id INTO v_status_category_id;

  INSERT INTO membership_status (tenant_id, code, name, is_system, created_by)
  VALUES
    (new_tenant_id, 'inactive', 'Inactive', true, p_user_id),
    (new_tenant_id, 'under_discipline', 'Under Discipline', true, p_user_id),
    (new_tenant_id, 'regular_attender', 'Regular Attender', true, p_user_id),
    (new_tenant_id, 'visitor', 'Visitor', true, p_user_id),
    (new_tenant_id, 'withdrawn', 'Withdrawn', true, p_user_id),
    (new_tenant_id, 'removed', 'Removed', true, p_user_id),
    (new_tenant_id, 'donor', 'Donor', true, p_user_id);

  -- Income transaction categories
  INSERT INTO categories (
    tenant_id, type, code, name, chart_of_account_id, is_system, created_by
  ) VALUES
    (new_tenant_id, 'income_transaction', 'tithe', 'Tithe',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4101' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'income_transaction', 'first_fruit_offering', 'First Fruit Offering',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4102' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'income_transaction', 'love_offering', 'Love Offering',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4201' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'income_transaction', 'mission_offering', 'Mission Offering',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4202' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'income_transaction', 'mission_pledge', 'Mission Pledge',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4202' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'income_transaction', 'building_offering', 'Building Offering',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4203' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'income_transaction', 'lot_offering', 'Lot Offering',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4204' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'income_transaction', 'other', 'Other Income',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '4700' LIMIT 1),
      true, p_user_id);

  -- Expense transaction categories
  INSERT INTO categories (
    tenant_id, type, code, name, chart_of_account_id, is_system, created_by
  ) VALUES
    (new_tenant_id, 'expense_transaction', 'ministry_expense', 'Ministry Expense',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5100' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'expense_transaction', 'payroll', 'Payroll',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5200' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'expense_transaction', 'utilities', 'Utilities',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5301' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'expense_transaction', 'maintenance', 'Maintenance',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5302' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'expense_transaction', 'events', 'Events',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5500' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'expense_transaction', 'missions', 'Missions',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5106' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'expense_transaction', 'education', 'Education',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5600' LIMIT 1),
      true, p_user_id),
    (new_tenant_id, 'expense_transaction', 'other', 'Other Expense',
      (SELECT id FROM chart_of_accounts WHERE tenant_id = new_tenant_id AND code = '5900' LIMIT 1),
      true, p_user_id);

  -- Budget categories
  INSERT INTO categories (tenant_id, type, code, name, is_system, created_by)
  VALUES
    (new_tenant_id, 'budget', 'ministry', 'Ministry', true, p_user_id),
    (new_tenant_id, 'budget', 'payroll', 'Payroll', true, p_user_id),
    (new_tenant_id, 'budget', 'utilities', 'Utilities', true, p_user_id),
    (new_tenant_id, 'budget', 'maintenance', 'Maintenance', true, p_user_id),
    (new_tenant_id, 'budget', 'events', 'Events', true, p_user_id),
    (new_tenant_id, 'budget', 'missions', 'Missions', true, p_user_id),
    (new_tenant_id, 'budget', 'education', 'Education', true, p_user_id),
    (new_tenant_id, 'budget', 'other', 'Other', true, p_user_id);

  -- Create member profile
  INSERT INTO members (
    tenant_id, first_name, last_name, email, contact_number, address,
    membership_category_id, status_category_id, membership_date, created_by
  ) VALUES (
    new_tenant_id,
    split_part(p_tenant_email, '@', 1),
    '',
    p_tenant_email,
    p_tenant_contact,
    p_tenant_address,
    v_membership_category_id,
    v_status_category_id,
    CURRENT_DATE,
    p_user_id
  ) RETURNING id INTO v_member_id;

  -- Link member to tenant_users record
  UPDATE tenant_users
  SET member_id = v_member_id
  WHERE tenant_id = new_tenant_id
    AND user_id = p_user_id;

  RETURN new_tenant_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_tenant_registration: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_new_tenant_registration(uuid, text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION handle_new_tenant_registration IS
  'Creates a new tenant with roles, default categories, membership records, and links to default chart of accounts.';

