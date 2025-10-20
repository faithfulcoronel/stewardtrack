import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
 * @param tenantId - The tenant ID to seed roles for
 * @param offeringTier - The product offering tier (for logging/future use)
 */
export async function seedDefaultRBAC(
  tenantId: string,
  offeringTier: string = 'starter'
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    // Define default roles for a church organization
    // IMPORTANT: metadata_key links tenant roles to permission role templates
    // Format: role_{role_code} (e.g., role_tenant_admin)
    const defaultRoles = [
      {
        code: 'tenant_admin',
        name: 'Tenant Administrator',
        description: 'Full administrative access to all church management features',
        scope: 'tenant' as const,
        metadata_key: 'role_tenant_admin',  // ⭐ Links to permission templates
        is_system: true,                     // ⭐ System role (cannot be deleted)
        is_delegatable: false,
        tenant_id: tenantId,
      },
      {
        code: 'staff',
        name: 'Staff Member',
        description: 'Extended access for church staff members',
        scope: 'tenant' as const,
        metadata_key: 'role_staff',          // ⭐ Links to permission templates
        is_system: true,                     // ⭐ System role (cannot be deleted)
        is_delegatable: true,
        tenant_id: tenantId,
      },
      {
        code: 'volunteer',
        name: 'Volunteer',
        description: 'Limited access for church volunteers',
        scope: 'tenant' as const,
        metadata_key: 'role_volunteer',      // ⭐ Links to permission templates
        is_system: true,                     // ⭐ System role (cannot be deleted)
        is_delegatable: true,
        tenant_id: tenantId,
      },
      {
        code: 'member',
        name: 'Church Member',
        description: 'Basic access for church members',
        scope: 'tenant' as const,
        metadata_key: 'role_member',         // ⭐ Links to permission templates
        is_system: true,                     // ⭐ System role (cannot be deleted)
        is_delegatable: false,
        tenant_id: tenantId,
      },
    ];

    // Insert default roles
    const { data: createdRoles, error: rolesError } = await supabase
      .from('roles')
      .insert(defaultRoles)
      .select();

    if (rolesError) {
      throw new Error(`Failed to create default roles: ${rolesError.message}`);
    }

    console.log(`Created ${createdRoles?.length || 0} default roles for tenant ${tenantId}`);
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
 * @param userId - The user to assign the role to
 * @param tenantId - The tenant context
 */
export async function assignTenantAdminRole(
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    // Find the tenant admin role
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('code', 'tenant_admin')
      .eq('tenant_id', tenantId)
      .single();

    if (roleError || !adminRole) {
      throw new Error(`Tenant admin role not found for tenant ${tenantId}: ${roleError?.message}`);
    }

    // Assign the role to the user
    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: adminRole.id,
        tenant_id: tenantId,
        assigned_at: new Date().toISOString(),
      });

    if (assignError) {
      throw new Error(`Failed to assign tenant admin role: ${assignError.message}`);
    }

    console.log(`Assigned tenant admin role to user ${userId} for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error assigning tenant admin role:', error);
    throw error;
  }
}
