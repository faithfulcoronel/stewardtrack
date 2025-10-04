import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Seeds default RBAC roles and permissions for a new tenant
 *
 * This function creates the essential roles needed for church management:
 * - Tenant Admin: Full administrative access
 * - Staff: Extended access for staff members
 * - Volunteer: Limited access for volunteers
 * - Member: Basic access for church members
 *
 * @param tenantId - The tenant ID to seed roles for
 * @param offeringTier - The product offering tier (affects permissions granted)
 */
export async function seedDefaultRBAC(
  tenantId: string,
  offeringTier: string = 'starter'
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    // Define default roles for a church organization
    const defaultRoles = [
      {
        code: 'tenant_admin',
        name: 'Tenant Administrator',
        description: 'Full administrative access to all church management features',
        scope: 'tenant' as const,
        is_system: false,
        is_delegatable: false,
        tenant_id: tenantId,
      },
      {
        code: 'staff',
        name: 'Staff Member',
        description: 'Extended access for church staff members',
        scope: 'tenant' as const,
        is_system: false,
        is_delegatable: true,
        tenant_id: tenantId,
      },
      {
        code: 'volunteer',
        name: 'Volunteer',
        description: 'Limited access for church volunteers',
        scope: 'tenant' as const,
        is_system: false,
        is_delegatable: true,
        tenant_id: tenantId,
      },
      {
        code: 'member',
        name: 'Church Member',
        description: 'Basic access for church members',
        scope: 'tenant' as const,
        is_system: false,
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

    // Optionally assign default permissions based on tier
    // For now, we'll rely on the RBAC admin UI for permission assignment
    // In the future, you could add permission bundles here based on tier:
    // - Starter: Basic permissions
    // - Professional: Advanced permissions
    // - Enterprise: Full permissions

    if (offeringTier === 'professional' || offeringTier === 'enterprise') {
      // Grant additional permissions for higher tiers
      console.log(`Enhanced permissions available for ${offeringTier} tier`);
    }

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
