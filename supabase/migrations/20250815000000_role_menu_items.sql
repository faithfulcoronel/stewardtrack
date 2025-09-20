-- Create table to map roles directly to menu items
CREATE TABLE IF NOT EXISTS role_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, role_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS role_menu_items_tenant_id_idx ON role_menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS role_menu_items_role_id_idx ON role_menu_items(role_id);
CREATE INDEX IF NOT EXISTS role_menu_items_menu_item_id_idx ON role_menu_items(menu_item_id);

ALTER TABLE role_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role menu items are viewable within tenant" ON role_menu_items
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Role menu items can be managed within tenant" ON role_menu_items
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE TRIGGER update_role_menu_items_updated_at
BEFORE UPDATE ON role_menu_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migrate existing role/menu relationships via menu_permissions and role_permissions
INSERT INTO role_menu_items (tenant_id, role_id, menu_item_id)
SELECT
  COALESCE(rp.tenant_id, mp.tenant_id),
  rp.role_id,
  mp.menu_item_id
FROM menu_permissions mp
JOIN role_permissions rp
  ON rp.permission_id = mp.permission_id
  AND (rp.tenant_id = mp.tenant_id OR (rp.tenant_id IS NULL AND mp.tenant_id IS NULL))
ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
