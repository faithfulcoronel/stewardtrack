-- Add is_system column to roles table
-- Note: is_delegatable already exists from migration 20251218001001
-- is_system is computed from the scope field but stored for query performance

-- Add is_system column (derived from scope)
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false NOT NULL;

-- Update existing records: is_system = true when scope = 'system'
UPDATE roles
SET is_system = (scope = 'system')
WHERE is_system IS NOT NULL;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS roles_is_system_idx ON roles(is_system) WHERE is_system = true;

-- Add comments
COMMENT ON COLUMN roles.is_system IS 'Indicates if this is a system-level role (derived from scope = system). Stored for query performance.';

-- Create trigger to auto-update is_system when scope changes
CREATE OR REPLACE FUNCTION sync_role_is_system()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_system = (NEW.scope = 'system');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_role_is_system ON roles;

CREATE TRIGGER update_role_is_system
BEFORE INSERT OR UPDATE OF scope ON roles
FOR EACH ROW
EXECUTE FUNCTION sync_role_is_system();
