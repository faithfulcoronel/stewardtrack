-- Create settings table for tenant, user and global settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Unique key within scope
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_unique
  ON settings(tenant_id, user_id, key);
CREATE INDEX IF NOT EXISTS settings_tenant_id_idx ON settings(tenant_id);
CREATE INDEX IF NOT EXISTS settings_user_id_idx ON settings(user_id);
CREATE INDEX IF NOT EXISTS settings_deleted_at_idx ON settings(deleted_at);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Settings are viewable" ON settings;
CREATE POLICY "Settings are viewable" ON settings
  FOR SELECT TO authenticated
  USING (
    (tenant_id IS NULL OR check_tenant_access(tenant_id)) AND
    (user_id IS NULL OR user_id = auth.uid()) AND
    deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Settings can be managed" ON settings;
CREATE POLICY "Settings can be managed" ON settings
  FOR ALL TO authenticated
  USING (
    (tenant_id IS NULL OR check_tenant_access(tenant_id)) AND
    (user_id IS NULL OR user_id = auth.uid()) AND
    deleted_at IS NULL
  )
  WITH CHECK (
    (tenant_id IS NULL OR check_tenant_access(tenant_id)) AND
    (user_id IS NULL OR user_id = auth.uid())
  );

-- updated_at trigger
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto assign tenant_id based on user if missing
CREATE OR REPLACE FUNCTION set_setting_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  user_tenant_id uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id INTO user_tenant_id
  FROM tenant_users
  WHERE user_id = NEW.user_id
  LIMIT 1;

  NEW.tenant_id := user_tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_setting_tenant_id_trigger ON settings;
CREATE TRIGGER set_setting_tenant_id_trigger
BEFORE INSERT ON settings
FOR EACH ROW EXECUTE FUNCTION set_setting_tenant_id();
