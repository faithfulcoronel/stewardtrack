-- Propagate global permissions to tenants

CREATE OR REPLACE FUNCTION create_default_permissions_for_tenant(p_tenant_id uuid, p_user_id uuid)
RETURNS VOID AS $$
BEGIN
  INSERT INTO permissions (
    tenant_id, code, name, description, module, action,
    created_by, updated_by
  )
  SELECT p_tenant_id, code, name, description, module, action,
         p_user_id, p_user_id
  FROM permissions
  WHERE tenant_id IS NULL
  ON CONFLICT (tenant_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_default_permissions_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_permissions_for_tenant(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_default_permissions_trigger ON tenants;
CREATE TRIGGER create_default_permissions_trigger
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_default_permissions_for_new_tenant();

CREATE OR REPLACE FUNCTION create_default_permissions_for_all_tenants()
RETURNS VOID AS $$
DECLARE
  v_tenant RECORD;
  v_count integer := 0;
BEGIN
  FOR v_tenant IN SELECT id, created_by FROM tenants LOOP
    PERFORM create_default_permissions_for_tenant(v_tenant.id, v_tenant.created_by);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Created default permissions for % tenants', v_count;
END;
$$ LANGUAGE plpgsql;

SELECT create_default_permissions_for_all_tenants();
SELECT create_default_menu_items_for_all_tenants();

GRANT EXECUTE ON FUNCTION create_default_permissions_for_tenant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_permissions_for_new_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_permissions_for_all_tenants() TO authenticated;
