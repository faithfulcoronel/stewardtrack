-- Seed admin roles, licenses, and assign admin roles to existing users
-- Creates default admin role and assigns all existing tenant users as admin

BEGIN;

-- Seed core RBAC feature package for all tenants
INSERT INTO feature_packages (code, name, description, cadence, is_active)
VALUES
  ('rbac-core-package', 'RBAC Core Package', 'Essential RBAC features for church management', 'monthly', true),
  ('full-access-package', 'Full Access Package', 'Complete feature access package', 'monthly', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- Link RBAC features to the core package
INSERT INTO feature_package_items (package_id, feature_id)
SELECT
  fp.id,
  fc.id
FROM feature_packages fp
CROSS JOIN feature_catalog fc
WHERE fp.code = 'rbac-core-package'
  AND fc.code IN ('rbac.core', 'rbac.role.catalog', 'rbac.bundle.compose', 'rbac.surface.manage', 'rbac.delegated.console', 'rbac.audit.ops')
ON CONFLICT (package_id, feature_id) DO NOTHING;

-- Link all features to the full access package
INSERT INTO feature_package_items (package_id, feature_id)
SELECT
  fp.id,
  fc.id
FROM feature_packages fp
CROSS JOIN feature_catalog fc
WHERE fp.code = 'full-access-package'
ON CONFLICT (package_id, feature_id) DO NOTHING;

-- Grant full access package to all existing tenants
INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source, package_id, source_reference)
SELECT DISTINCT
  t.id,
  fc.id,
  'direct'::text,
  fp.id,
  'seeded_admin_access'
FROM tenants t
CROSS JOIN feature_catalog fc
JOIN feature_packages fp ON fp.code = 'full-access-package'
WHERE t.deleted_at IS NULL
ON CONFLICT (tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(source_reference, '')) DO NOTHING;

-- Create default admin role for each tenant
INSERT INTO roles (tenant_id, name, description, scope, metadata_key, created_by, updated_by)
SELECT
  t.id,
  'Administrator',
  'Full administrative access to church management system',
  'tenant',
  'admin',
  (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1),
  (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1)
FROM tenants t
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM roles r
    WHERE r.tenant_id = t.id
    AND r.metadata_key = 'admin'
  );

-- Create core permission bundles for each tenant
INSERT INTO permission_bundles (tenant_id, code, name, description, metadata_key, created_by, updated_by)
SELECT
  t.id,
  'admin_bundle',
  'Admin Bundle',
  'Complete administrative permissions bundle',
  'admin_bundle',
  (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1),
  (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1)
FROM tenants t
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM permission_bundles pb
    WHERE pb.tenant_id = t.id
    AND pb.metadata_key = 'admin_bundle'
  );

-- Ensure extended permission actions exist for role management
INSERT INTO permission_actions (code, name, description, module)
VALUES
  ('assign', 'Assign', 'Assign relationships or ownership', 'rbac'),
  ('revoke', 'Revoke', 'Revoke delegated access', 'rbac')
ON CONFLICT (code) DO NOTHING;

-- Create all core permissions for each tenant
INSERT INTO permissions (tenant_id, code, name, description, module, action, scope, created_by, updated_by)
SELECT
  t.id,
  perms.code,
  perms.name,
  perms.description,
  perms.module,
  perms.action,
  perms.scope,
  (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1),
  (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1)
FROM tenants t
CROSS JOIN (VALUES
  ('admin:create:any', 'Admin - Create Any Resource', 'Create any resource', 'admin', 'create', 'tenant'),
  ('admin:read:any', 'Admin - Read Any Resource', 'Read any resource', 'admin', 'read', 'tenant'),
  ('admin:update:any', 'Admin - Update Any Resource', 'Update any resource', 'admin', 'update', 'tenant'),
  ('admin:delete:any', 'Admin - Delete Any Resource', 'Delete any resource', 'admin', 'delete', 'tenant'),
  ('membership:create:member', 'Membership - Create Member', 'Create members', 'membership', 'create', 'tenant'),
  ('membership:read:member', 'Membership - View Member', 'View members', 'membership', 'read', 'tenant'),
  ('membership:update:member', 'Membership - Update Member', 'Update member information', 'membership', 'update', 'tenant'),
  ('membership:delete:member', 'Membership - Delete Member', 'Remove members', 'membership', 'delete', 'tenant'),
  ('financial:create:transaction', 'Financial - Create Transaction', 'Create financial transactions', 'financial', 'create', 'tenant'),
  ('financial:read:transaction', 'Financial - View Transactions', 'View financial transactions', 'financial', 'read', 'tenant'),
  ('financial:update:transaction', 'Financial - Update Transactions', 'Update financial transactions', 'financial', 'update', 'tenant'),
  ('financial:delete:transaction', 'Financial - Delete Transactions', 'Delete financial transactions', 'financial', 'delete', 'tenant'),
  ('financial:read:report', 'Financial - View Reports', 'View financial reports', 'financial', 'read', 'tenant'),
  ('rbac:create:role', 'RBAC - Create Role', 'Create roles', 'rbac', 'create', 'tenant'),
  ('rbac:read:role', 'RBAC - View Roles', 'View roles', 'rbac', 'read', 'tenant'),
  ('rbac:update:role', 'RBAC - Update Roles', 'Update roles', 'rbac', 'update', 'tenant'),
  ('rbac:delete:role', 'RBAC - Delete Roles', 'Delete roles', 'rbac', 'delete', 'tenant'),
  ('rbac:assign:user_role', 'RBAC - Assign Role', 'Assign roles to users', 'rbac', 'assign', 'tenant'),
  ('rbac:revoke:user_role', 'RBAC - Revoke Role', 'Revoke roles from users', 'rbac', 'revoke', 'tenant')
) AS perms(code, name, description, module, action, scope)
WHERE t.deleted_at IS NULL;

-- Link all permissions to admin bundle for each tenant
INSERT INTO bundle_permissions (tenant_id, bundle_id, permission_id)
SELECT
  pb.tenant_id,
  pb.id,
  p.id
FROM permission_bundles pb
JOIN permissions p ON pb.tenant_id = p.tenant_id
WHERE pb.metadata_key = 'admin_bundle'
ON CONFLICT (tenant_id, bundle_id, permission_id) DO NOTHING;

-- Link admin bundle to admin role for each tenant
INSERT INTO role_bundles (tenant_id, role_id, bundle_id)
SELECT
  r.tenant_id,
  r.id,
  pb.id
FROM roles r
JOIN permission_bundles pb ON r.tenant_id = pb.tenant_id
WHERE r.metadata_key = 'admin'
  AND pb.metadata_key = 'admin_bundle'
ON CONFLICT (tenant_id, role_id, bundle_id) DO NOTHING;

-- Assign admin role to all existing tenant users
INSERT INTO user_roles (tenant_id, user_id, role_id, created_by, updated_by)
SELECT
  tu.tenant_id,
  tu.user_id,
  r.id,
  tu.user_id,  -- Self-assign
  tu.user_id
FROM tenant_users tu
JOIN roles r ON r.tenant_id = tu.tenant_id
WHERE r.metadata_key = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.tenant_id = tu.tenant_id
    AND ur.user_id = tu.user_id
    AND ur.role_id = r.id
  );

-- Create audit log entries for the seeding operation
INSERT INTO rbac_audit_log (tenant_id, table_name, operation, record_id, new_values, user_id, ip_address, notes)
SELECT
  t.id,
  'seed_admin_roles',
  'SYSTEM',
  NULL,
  jsonb_build_object(
    'roles_created', 1,
    'bundles_created', 1,
    'permissions_created', (SELECT count(*) FROM permissions WHERE tenant_id = t.id),
    'users_assigned', (SELECT count(*) FROM tenant_users WHERE tenant_id = t.id)
  ),
  (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1),
  '127.0.0.1'::inet,
  'Seeded default admin roles and permissions for tenant'
FROM tenants t
WHERE t.deleted_at IS NULL;

-- Refresh the materialized view to include new assignments
REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_user_effective_permissions;

COMMIT;







