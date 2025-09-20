-- Update role assignment functions to include tenant_id on user_roles entries
-- and to check conflicts using user_id, role_id, and tenant_id.

-- assign_admin_role_to_user now records tenant_id
CREATE OR REPLACE FUNCTION assign_admin_role_to_user(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  admin_role_id uuid;
  member_role_id uuid;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found';
  END IF;

  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  IF member_role_id IS NULL THEN
    RAISE EXCEPTION 'Member role not found';
  END IF;

  INSERT INTO user_roles (user_id, role_id, tenant_id, created_by)
  VALUES (p_user_id, admin_role_id, p_tenant_id, p_user_id)
  ON CONFLICT (user_id, role_id, tenant_id) DO NOTHING;

  INSERT INTO user_roles (user_id, role_id, tenant_id, created_by)
  VALUES (p_user_id, member_role_id, p_tenant_id, p_user_id)
  ON CONFLICT (user_id, role_id, tenant_id) DO NOTHING;

  INSERT INTO tenant_users (tenant_id, user_id, admin_role, created_by)
  VALUES (p_tenant_id, p_user_id, 'tenant_admin', p_user_id)
  ON CONFLICT (tenant_id, user_id)
  DO UPDATE SET admin_role = 'tenant_admin';
END;
$$;

-- handle_new_tenant_registration includes tenant_id in role assignments
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
  IF p_tenant_subdomain !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid subdomain format';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE subdomain = p_tenant_subdomain FOR UPDATE) THEN
    RAISE EXCEPTION 'Subdomain is already in use';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE email = p_tenant_email FOR UPDATE) THEN
    RAISE EXCEPTION 'Email is already in use';
  END IF;

  SELECT COUNT(*) = 1 INTO is_first_user FROM auth.users;
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  IF admin_role_id IS NULL OR member_role_id IS NULL THEN
    RAISE EXCEPTION 'Required roles not found';
  END IF;

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

  PERFORM create_default_chart_of_accounts_for_tenant(new_tenant_id, p_user_id);

  -- Use the assign_admin_role_to_user function for regular tenant admins
  PERFORM assign_admin_role_to_user(p_user_id, new_tenant_id);

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

  -- Copy default menu items and permissions
  PERFORM create_default_menu_items_for_tenant(new_tenant_id, p_user_id);

  -- Create membership type and status and capture IDs
  INSERT INTO membership_type (tenant_id, code, name, is_system, created_by)
  VALUES (new_tenant_id, 'member', 'Member', true, p_user_id)
  RETURNING id INTO v_membership_category_id;

  INSERT INTO membership_type (tenant_id, code, name, is_system, created_by)
  VALUES
    (new_tenant_id, 'non_member', 'Non-Member', true, p_user_id),
    (new_tenant_id, 'visitor', 'visitor', true, p_user_id);

  INSERT INTO membership_status (tenant_id, code, name, is_system, created_by)
  VALUES (new_tenant_id, 'active', 'Active', true, p_user_id)
  RETURNING id INTO v_status_category_id;

  INSERT INTO membership_status (tenant_id, code, name, is_system, created_by)
  VALUES
    (new_tenant_id, 'inactive', 'Inactive', true, p_user_id),
    (new_tenant_id, 'under_discipline', 'Under Discipline', true, p_user_id),
    (new_tenant_id, 'regular_attender', 'Regular Attender', true, p_user_id),
    (new_tenant_id, 'visitor', 'Visitor', true, p_user_id),
    (new_tenant_id, 'transferred', 'Transferred', true, p_user_id);
  
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

-- complete_member_registration assigns tenant aware roles
CREATE OR REPLACE FUNCTION complete_member_registration(
  p_user_id uuid,
  p_tenant_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  v_email text;
  v_member_role_id uuid;
  v_member_type_id uuid;
  v_status_id uuid;
  v_member_id uuid;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User % does not exist', p_user_id;
  END IF;

  SELECT id INTO v_member_role_id FROM roles WHERE name = 'member';
  IF v_member_role_id IS NULL THEN
    RAISE EXCEPTION 'Member role not found';
  END IF;

  INSERT INTO user_roles (user_id, role_id, tenant_id, created_by)
  VALUES (p_user_id, v_member_role_id, p_tenant_id, p_user_id)
  ON CONFLICT (user_id, role_id, tenant_id) DO NOTHING;

  INSERT INTO tenant_users (tenant_id, user_id, admin_role, created_by)
  VALUES (p_tenant_id, p_user_id, 'member', p_user_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_member_type_id
  FROM membership_type
  WHERE tenant_id = p_tenant_id AND code = 'non_member' AND deleted_at IS NULL
  LIMIT 1;

  SELECT id INTO v_status_id
  FROM membership_status
  WHERE tenant_id = p_tenant_id AND code = 'inactive' AND deleted_at IS NULL
  LIMIT 1;

  RETURN jsonb_build_object(
    'member_id', NULL,
    'user_id', p_user_id,
    'email', v_email
  );
END;
$$;

-- Grant execute privileges
GRANT EXECUTE ON FUNCTION assign_admin_role_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_tenant_registration(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_member_registration(uuid, uuid, text, text) TO authenticated;
