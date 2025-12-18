import 'server-only';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RbacCoreService } from '@/services/RbacCoreService';
import type { CreateRoleDto } from '@/models/rbac.model';

/**
 * Seeds default RBAC roles for a new tenant
 *
 * This function creates the essential roles needed for church management:
 * - Tenant Admin: Full administrative access (metadata_key: role_tenant_admin)
 * - Staff: Extended access for staff members (metadata_key: role_staff)
 * - Volunteer: Limited access for volunteers (metadata_key: role_volunteer)
 * - Member: Basic access for church members (metadata_key: role_member)
 *
 * IMPORTANT: Each role has a metadata_key that links it to permission role templates.
 * The PermissionDeploymentService uses these keys to automatically assign permissions
 * when licensed features are deployed.
 *
 * All default roles have is_system=true, meaning they cannot be deleted by users.
 *
 * Follows architectural pattern: Utility → Service → Repository → Adapter → Supabase
 *
 * @param tenantId - The tenant ID to seed roles for
 * @param offeringTier - The product offering tier (for logging/future use)
 */
export async function seedDefaultRBAC(
  tenantId: string,
  _offeringTier: string = 'starter'
): Promise<void> {
  try {
    const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);

    // Define default roles for a church organization
    // IMPORTANT: metadata_key links tenant roles to permission role templates
    // Format: role_{role_name} (e.g., role_tenant_admin)
    const defaultRoles: CreateRoleDto[] = [
      {
        name: 'Tenant Administrator',
        description: 'Full administrative access to all church management features',
        scope: 'tenant',
        metadata_key: 'role_tenant_admin',  // ⭐ Links to permission templates
        is_delegatable: false,
      },
      {
        name: 'Staff Member',
        description: 'Extended access for church staff members',
        scope: 'tenant',
        metadata_key: 'role_staff',          // ⭐ Links to permission templates
        is_delegatable: true,
      },
      {
        name: 'Volunteer',
        description: 'Limited access for church volunteers',
        scope: 'tenant',
        metadata_key: 'role_volunteer',      // ⭐ Links to permission templates
        is_delegatable: true,
      },
      {
        name: 'Church Member',
        description: 'Basic access for church members',
        scope: 'tenant',
        metadata_key: 'role_member',         // ⭐ Links to permission templates
        is_delegatable: false,
      },
    ];

    // Create default roles using service layer
    const createdRoles = [];
    for (const roleData of defaultRoles) {
      const role = await rbacService.createRole(roleData, tenantId);
      createdRoles.push(role);
    }

    console.log(`Created ${createdRoles.length} default roles for tenant ${tenantId}`);
    console.log('Roles created with metadata_key linking to permission templates');
    console.log('PermissionDeploymentService will auto-assign permissions based on licensed features');

    // NOTE: Permissions are now automatically deployed by PermissionDeploymentService
    // after this function completes. No need to manually assign permissions here.
    // The tier information is used during license provisioning to determine which
    // features are granted, and those features automatically deploy their permissions.

    return;
  } catch (error) {
    console.error('Error seeding default RBAC:', error);
    throw error;
  }
}

/**
 * Assigns the tenant admin role to a user
 *
 * Follows architectural pattern: Utility → Service → Repository → Adapter → Supabase
 *
 * @param userId - The user to assign the role to
 * @param tenantId - The tenant context
 */
export async function assignTenantAdminRole(
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);

    // Find the tenant admin role using service layer
    const roles = await rbacService.getRoles(tenantId, true);
    const adminRole = roles.find(role => role.metadata_key === 'role_tenant_admin');

    if (!adminRole) {
      throw new Error(`Tenant admin role not found for tenant ${tenantId}`);
    }

    // Assign the role to the user using service layer
    await rbacService.assignRole({
      user_id: userId,
      role_id: adminRole.id,
    }, tenantId, 'system');

    console.log(`Assigned tenant admin role to user ${userId} for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error assigning tenant admin role:', error);
    throw error;
  }
}
