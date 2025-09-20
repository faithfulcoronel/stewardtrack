/*
  # Add Database Management Module

  1. New Permissions
    - Add database management permissions
    - Assign permissions to admin role

  2. New Tables
    - Create databases table to track multiple databases
    - Add RLS policies for database management

  3. Changes
    - Add database management permissions to admin role
*/

-- Create new permissions for database management
INSERT INTO permissions (code, name, description, module) VALUES
  ('database.view', 'View Databases', 'Can view database list and details', 'databases'),
  ('database.create', 'Create Database', 'Can create new databases', 'databases'),
  ('database.delete', 'Delete Database', 'Can delete existing databases', 'databases')
ON CONFLICT (code) DO NOTHING;

-- Create databases table
CREATE TABLE IF NOT EXISTS databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  connection_string text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Databases are viewable by users with database.view permission"
  ON databases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'database.view'
    )
  );

CREATE POLICY "Databases can be created by users with database.create permission"
  ON databases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'database.create'
    )
  );

CREATE POLICY "Databases can be deleted by users with database.delete permission"
  ON databases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'database.delete'
    )
    -- Only allow deletion if there is more than one database
    AND (SELECT COUNT(*) FROM databases) > 1
  );

-- Create updated_at trigger
CREATE TRIGGER update_databases_updated_at
  BEFORE UPDATE ON databases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Assign database permissions to admin role
INSERT INTO role_permissions (role_id, permission_id, created_by)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  auth.uid() as created_by
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.module = 'databases'
ON CONFLICT DO NOTHING;