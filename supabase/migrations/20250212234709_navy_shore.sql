/*
  # Create roles and permissions schema

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `permissions`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text)
      - `module` (text)
      - `created_at` (timestamptz)
    
    - `user_roles` (junction table)
      - `user_id` (uuid, foreign key)
      - `role_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key)
    
    - `role_permissions` (junction table)
      - `role_id` (uuid, foreign key)
      - `permission_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key)

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  module text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (user_id, role_id)
);

-- Create role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (role_id, permission_id)
);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for roles table
CREATE POLICY "Roles are viewable by authenticated users"
  ON roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Roles can be managed by admins"
  ON roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Create policies for permissions table
CREATE POLICY "Permissions are viewable by authenticated users"
  ON permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permissions can be managed by admins"
  ON permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Create policies for user_roles table
CREATE POLICY "User roles are viewable by authenticated users"
  ON user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "User roles can be managed by admins"
  ON user_roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Create policies for role_permissions table
CREATE POLICY "Role permissions are viewable by authenticated users"
  ON role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Role permissions can be managed by admins"
  ON role_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('treasurer', 'Financial management access'),
  ('pastor', 'Member management and reporting access'),
  ('member', 'Basic member access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (code, name, description, module) VALUES
  -- User Management
  ('user.view', 'View Users', 'Can view user list and details', 'users'),
  ('user.create', 'Create Users', 'Can create new users', 'users'),
  ('user.edit', 'Edit Users', 'Can edit user details', 'users'),
  ('user.delete', 'Delete Users', 'Can delete users', 'users'),
  
  -- Role Management
  ('role.view', 'View Roles', 'Can view roles and permissions', 'roles'),
  ('role.create', 'Create Roles', 'Can create new roles', 'roles'),
  ('role.edit', 'Edit Roles', 'Can edit role details and permissions', 'roles'),
  ('role.delete', 'Delete Roles', 'Can delete roles', 'roles'),
  
  -- Member Management
  ('member.view', 'View Members', 'Can view member list and profiles', 'members'),
  ('member.create', 'Create Members', 'Can add new members', 'members'),
  ('member.edit', 'Edit Members', 'Can edit member details', 'members'),
  ('member.delete', 'Delete Members', 'Can delete members', 'members'),
  
  -- Financial Management
  ('finance.view', 'View Finances', 'Can view financial records', 'finances'),
  ('finance.create', 'Create Transactions', 'Can create financial transactions', 'finances'),
  ('finance.edit', 'Edit Transactions', 'Can edit financial transactions', 'finances'),
  ('finance.delete', 'Delete Transactions', 'Can delete financial transactions', 'finances'),
  ('finance.approve', 'Approve Transactions', 'Can approve financial transactions', 'finances'),
  ('finance.report', 'Generate Reports', 'Can generate financial reports', 'finances'),
  
  -- Budget Management
  ('budget.view', 'View Budgets', 'Can view budgets', 'budgets'),
  ('budget.create', 'Create Budgets', 'Can create new budgets', 'budgets'),
  ('budget.edit', 'Edit Budgets', 'Can edit budgets', 'budgets'),
  ('budget.delete', 'Delete Budgets', 'Can delete budgets', 'budgets')
ON CONFLICT (code) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign financial permissions to treasurer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'treasurer'
AND p.module IN ('finances', 'budgets')
ON CONFLICT DO NOTHING;

-- Assign member management permissions to pastor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'pastor'
AND p.module IN ('members', 'finances')
AND p.code NOT IN ('finance.delete', 'finance.approve')
ON CONFLICT DO NOTHING;

-- Create function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(user_id uuid, permission_code text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id
    AND p.code = permission_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;