/*
  # Menu and License System

  Adds tenant scoped menu items, menu permissions and license management tables.
  Default global menu items are copied to each tenant via helper functions.
*/

-- Menu items available per tenant
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  path text NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS menu_items_tenant_id_idx ON menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS menu_items_parent_id_idx ON menu_items(parent_id);
CREATE INDEX IF NOT EXISTS menu_items_deleted_at_idx ON menu_items(deleted_at);

-- Mapping of menu items to permissions
CREATE TABLE IF NOT EXISTS menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, menu_item_id, permission_id)
);

CREATE INDEX IF NOT EXISTS menu_permissions_tenant_id_idx ON menu_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS menu_permissions_menu_item_id_idx ON menu_permissions(menu_item_id);

-- Licenses issued per tenant
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  tier text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at date DEFAULT CURRENT_DATE,
  expires_at date,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS licenses_tenant_id_idx ON licenses(tenant_id);
CREATE INDEX IF NOT EXISTS licenses_deleted_at_idx ON licenses(deleted_at);

-- Features enabled for a license
CREATE TABLE IF NOT EXISTS license_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  license_id uuid REFERENCES licenses(id) ON DELETE CASCADE,
  feature text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, license_id, feature)
);

CREATE INDEX IF NOT EXISTS license_features_tenant_id_idx ON license_features(tenant_id);
CREATE INDEX IF NOT EXISTS license_features_license_id_idx ON license_features(license_id);
CREATE INDEX IF NOT EXISTS license_features_deleted_at_idx ON license_features(deleted_at);

-- Enable row level security
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_features ENABLE ROW LEVEL SECURITY;

-- Policies scoped to tenant
CREATE POLICY "Menu items are viewable within tenant" ON menu_items
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);

CREATE POLICY "Menu items can be managed within tenant" ON menu_items
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL)
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Menu permissions are viewable within tenant" ON menu_permissions
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Menu permissions can be managed within tenant" ON menu_permissions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Licenses are viewable within tenant" ON licenses
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);

CREATE POLICY "Licenses can be managed within tenant" ON licenses
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL)
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "License features are viewable within tenant" ON license_features
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);

CREATE POLICY "License features can be managed within tenant" ON license_features
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL)
  WITH CHECK (check_tenant_access(tenant_id));

-- updated_at triggers
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON menu_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_permissions_updated_at
BEFORE UPDATE ON menu_permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_licenses_updated_at
BEFORE UPDATE ON licenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_license_features_updated_at
BEFORE UPDATE ON license_features
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert global menu items used as defaults
INSERT INTO menu_items (tenant_id, code, label, path, icon, sort_order, is_system)
VALUES
  (NULL, 'dashboard', 'Dashboard', '/dashboard', 'home', 1, TRUE),
  (NULL, 'members', 'Members', '/members', 'users', 2, TRUE),
  (NULL, 'finance', 'Finance', '/finance', 'credit-card', 3, TRUE),
  (NULL, 'settings', 'Settings', '/settings', 'settings', 4, TRUE)
ON CONFLICT DO NOTHING;

-- Function to copy default menu items for a tenant
CREATE OR REPLACE FUNCTION create_default_menu_items_for_tenant(p_tenant_id uuid, p_user_id uuid)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM menu_items WHERE tenant_id = p_tenant_id) THEN
    RAISE NOTICE 'Tenant % already has menu items. Skipping.', p_tenant_id;
    RETURN;
  END IF;

  INSERT INTO menu_items (tenant_id, parent_id, code, label, path, icon, sort_order, is_system, created_by, updated_by)
  SELECT p_tenant_id, NULL, code, label, path, icon, sort_order, is_system, p_user_id, p_user_id
  FROM menu_items
  WHERE tenant_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for new tenants
CREATE OR REPLACE FUNCTION create_default_menu_items_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_menu_items_for_tenant(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_default_menu_items_trigger ON tenants;
CREATE TRIGGER create_default_menu_items_trigger
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_default_menu_items_for_new_tenant();

-- Populate existing tenants
CREATE OR REPLACE FUNCTION create_default_menu_items_for_all_tenants()
RETURNS VOID AS $$
DECLARE
  v_tenant RECORD;
  v_count integer := 0;
BEGIN
  FOR v_tenant IN SELECT id, created_by FROM tenants LOOP
    PERFORM create_default_menu_items_for_tenant(v_tenant.id, v_tenant.created_by);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Created default menu items for % tenants', v_count;
END;
$$ LANGUAGE plpgsql;

SELECT create_default_menu_items_for_all_tenants();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_default_menu_items_for_tenant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_menu_items_for_new_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_menu_items_for_all_tenants() TO authenticated;
