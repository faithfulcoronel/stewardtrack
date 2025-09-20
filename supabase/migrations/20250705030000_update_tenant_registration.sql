-- Update tenant registration to add fund codes
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

  -- Check for existing subdomain with FOR UPDATE to prevent race conditions
  IF EXISTS (
    SELECT 1 FROM tenants
    WHERE subdomain = p_tenant_subdomain
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Subdomain is already in use';
  END IF;

  -- Check for existing email with FOR UPDATE to prevent race conditions
  IF EXISTS (
    SELECT 1 FROM tenants
    WHERE email = p_tenant_email
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Email is already in use';
  END IF;

  -- Check if this is the first user
  SELECT COUNT(*) = 1 INTO is_first_user
  FROM auth.users;

  -- Get role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';

  IF admin_role_id IS NULL OR member_role_id IS NULL THEN
    RAISE EXCEPTION 'Required roles not found';
  END IF;

  -- Create the tenant
  INSERT INTO tenants (
    name,
    subdomain,
    address,
    contact_number,
    email,
    website,
    status,
    subscription_tier,
    subscription_status,
    created_by
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
  )
  RETURNING id INTO new_tenant_id;

  -- Create the default chart of accounts so subsequent inserts can reference
  -- the accounts within the same transaction
  PERFORM create_default_chart_of_accounts_for_tenant(new_tenant_id, p_user_id);

  -- Create default funds with codes
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

  -- Create tenant_user relationship with appropriate role
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    admin_role,
    created_by
  ) VALUES (
    new_tenant_id,
    p_user_id,
    CASE
      WHEN is_first_user THEN 'super_admin'::admin_role_type
      ELSE 'tenant_admin'::admin_role_type
    END,
    p_user_id
  );

  -- Assign admin and member roles to user
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES
    (p_user_id, admin_role_id, p_user_id),
    (p_user_id, member_role_id, p_user_id)
  ON CONFLICT DO NOTHING;

  -- Create baptism membership category and get its ID
  INSERT INTO categories (tenant_id, type, code, name, is_system, created_by)
  VALUES (new_tenant_id, 'membership', 'baptism', 'Baptism', true, p_user_id)
  RETURNING id INTO v_membership_category_id;

  -- Create active status category and get its ID
  INSERT INTO categories (tenant_id, type, code, name, is_system, created_by)
  VALUES (new_tenant_id, 'member_status', 'active', 'Active', true, p_user_id)
  RETURNING id INTO v_status_category_id;

  -- Create remaining membership categories
  INSERT INTO categories (tenant_id, type, code, name, is_system, created_by)
  VALUES
    (new_tenant_id, 'membership', 'transfer', 'Transfer', true, p_user_id),
    (new_tenant_id, 'membership', 'non_member', 'Non-Member', true, p_user_id),
    (new_tenant_id, 'membership', 'non_baptized_member', 'Non-Baptized Member', true, p_user_id);

  -- Create remaining member status categories
  INSERT INTO categories (tenant_id, type, code, name, is_system, created_by)
  VALUES
    (new_tenant_id, 'member_status', 'inactive', 'Inactive', true, p_user_id),
    (new_tenant_id, 'member_status', 'under_discipline', 'Under Discipline', true, p_user_id),
    (new_tenant_id, 'member_status', 'regular_attender', 'Regular Attender', true, p_user_id),
    (new_tenant_id, 'member_status', 'visitor', 'Visitor', true, p_user_id),
    (new_tenant_id, 'member_status', 'withdrawn', 'Withdrawn', true, p_user_id),
    (new_tenant_id, 'member_status', 'removed', 'Removed', true, p_user_id),
    (new_tenant_id, 'member_status', 'donor', 'Donor', true, p_user_id);

  -- Create income transaction categories linked to default accounts
  INSERT INTO categories (
    tenant_id,
    type,
    code,
    name,
    chart_of_account_id,
    is_system,
    created_by
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

  -- Create expense transaction categories linked to default accounts
  INSERT INTO categories (
    tenant_id,
    type,
    code,
    name,
    chart_of_account_id,
    is_system,
    created_by
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

  -- Create budget categories
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

  -- Create member profile with category references
  INSERT INTO members (
    tenant_id,
    first_name,
    last_name,
    email,
    contact_number,
    address,
    membership_category_id,
    status_category_id,
    membership_date,
    created_by
  )
  VALUES (
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
    -- Log the error for debugging
    RAISE WARNING 'Error in handle_new_tenant_registration: %', SQLERRM;
    -- Re-raise the error
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_new_tenant_registration(uuid, text, text, text, text, text, text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION handle_new_tenant_registration IS
  'Creates a new tenant with proper validation, transaction handling, user role assignment, category initialization, and links categories to default chart of accounts';
