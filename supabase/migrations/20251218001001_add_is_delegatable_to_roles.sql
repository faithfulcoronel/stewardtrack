-- Add is_delegatable column to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_delegatable boolean DEFAULT false;

-- Create index on the new column
CREATE INDEX IF NOT EXISTS roles_is_delegatable_idx ON roles(is_delegatable) WHERE is_delegatable = true;

-- Update existing roles to be delegatable (for testing purposes)
UPDATE roles SET is_delegatable = true WHERE scope IN ('tenant', 'delegated');