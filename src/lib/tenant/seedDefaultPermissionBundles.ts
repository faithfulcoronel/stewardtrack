import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Seeds default permission bundles for a new tenant based on licensed features
 *
 * This function creates permission bundles by grouping permissions that have already
 * been deployed by the PermissionDeploymentService. Bundles are created per role,
 * containing all permissions that were assigned to that role.
 *
 * IMPORTANT: This should be called AFTER PermissionDeploymentService has deployed
 * feature permissions to ensure permissions exist before creating bundles.
 *
 * The bundles created are:
 * - One bundle per default role (tenant_admin, staff, volunteer, member)
 * - Each bundle contains the permissions that were deployed to that role
 * - Bundles are automatically linked to their respective roles
 *
 * @param tenantId - The tenant ID to seed bundles for
 * @param offeringTier - The product offering tier (for logging/future use)
 */
export async function seedDefaultPermissionBundles(
  tenantId: string,
  offeringTier: string = 'starter'
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    console.log(`Starting permission bundle provisioning for tenant ${tenantId} (tier: ${offeringTier})`);

    // Define default roles and their corresponding bundle definitions
    const roleBundleDefinitions = [
      {
        roleMetadataKey: 'role_tenant_admin',
        bundleCode: 'admin_permissions',
        bundleName: 'Administrator Permissions',
        bundleDescription: 'All permissions for tenant administrator role',
        bundleMetadataKey: 'bundle_admin_permissions',
      },
      {
        roleMetadataKey: 'role_staff',
        bundleCode: 'staff_permissions',
        bundleName: 'Staff Permissions',
        bundleDescription: 'All permissions for staff role',
        bundleMetadataKey: 'bundle_staff_permissions',
      },
      {
        roleMetadataKey: 'role_volunteer',
        bundleCode: 'volunteer_permissions',
        bundleName: 'Volunteer Permissions',
        bundleDescription: 'All permissions for volunteer role',
        bundleMetadataKey: 'bundle_volunteer_permissions',
      },
      {
        roleMetadataKey: 'role_member',
        bundleCode: 'member_permissions',
        bundleName: 'Member Permissions',
        bundleDescription: 'All permissions for member role',
        bundleMetadataKey: 'bundle_member_permissions',
      },
    ];

    let totalBundlesCreated = 0;
    let totalPermissionsLinked = 0;

    for (const definition of roleBundleDefinitions) {
      try {
        const result = await createBundleForRole(supabase, tenantId, definition);

        if (result.bundleCreated) {
          totalBundlesCreated++;
        }
        totalPermissionsLinked += result.permissionsLinked;

        console.log(
          `Role ${definition.roleMetadataKey}: ` +
          `${result.bundleCreated ? 'Created' : 'Found existing'} bundle with ${result.permissionsLinked} permissions`
        );
      } catch (error) {
        console.error(`Failed to create bundle for role ${definition.roleMetadataKey}:`, error);
        // Continue with other roles
      }
    }

    console.log(
      `Permission bundle provisioning complete for tenant ${tenantId}: ` +
      `${totalBundlesCreated} bundles created, ${totalPermissionsLinked} total permissions linked`
    );
  } catch (error) {
    console.error('Error seeding default permission bundles:', error);
    throw error;
  }
}

interface BundleDefinition {
  roleMetadataKey: string;
  bundleCode: string;
  bundleName: string;
  bundleDescription: string;
  bundleMetadataKey: string;
}

interface BundleCreationResult {
  bundleCreated: boolean;
  permissionsLinked: number;
}

/**
 * Creates a permission bundle for a specific role by grouping all permissions
 * that were deployed to that role by the PermissionDeploymentService
 */
async function createBundleForRole(
  supabase: any,
  tenantId: string,
  definition: BundleDefinition
): Promise<BundleCreationResult> {
  // Step 1: Find the role
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id, scope')
    .eq('tenant_id', tenantId)
    .eq('metadata_key', definition.roleMetadataKey)
    .single();

  if (roleError || !role) {
    console.warn(`Role ${definition.roleMetadataKey} not found for tenant ${tenantId}`);
    return { bundleCreated: false, permissionsLinked: 0 };
  }

  // Step 2: Get all permissions currently assigned to this role
  // These were deployed by PermissionDeploymentService based on licensed features
  const { data: rolePermissions, error: permError } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('tenant_id', tenantId)
    .eq('role_id', role.id);

  if (permError) {
    throw new Error(`Failed to query role permissions: ${permError.message}`);
  }

  const permissionIds = rolePermissions?.map((rp: any) => rp.permission_id) || [];

  if (permissionIds.length === 0) {
    console.warn(`No permissions found for role ${definition.roleMetadataKey} in tenant ${tenantId}`);
    // Still create the bundle, but it will be empty
  }

  // Step 3: Check if bundle already exists
  const { data: existingBundle } = await supabase
    .from('permission_bundles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('metadata_key', definition.bundleMetadataKey)
    .single();

  let bundleId: string;
  let bundleCreated = false;

  if (existingBundle) {
    bundleId = existingBundle.id;
    console.log(`Bundle ${definition.bundleCode} already exists for tenant ${tenantId}`);
  } else {
    // Step 4: Create the bundle
    const { data: newBundle, error: bundleError } = await supabase
      .from('permission_bundles')
      .insert({
        tenant_id: tenantId,
        code: definition.bundleCode,
        name: definition.bundleName,
        description: definition.bundleDescription,
        metadata_key: definition.bundleMetadataKey,
        scope: role.scope,
        is_template: false,
      })
      .select('id')
      .single();

    if (bundleError) {
      throw new Error(`Failed to create bundle ${definition.bundleCode}: ${bundleError.message}`);
    }

    bundleId = newBundle!.id;
    bundleCreated = true;
    console.log(`Created bundle ${definition.bundleCode} for tenant ${tenantId}`);
  }

  // Step 5: Link permissions to bundle
  let permissionsLinked = 0;

  if (permissionIds.length > 0) {
    const bundlePermissions = permissionIds.map((permId: string) => ({
      tenant_id: tenantId,
      bundle_id: bundleId,
      permission_id: permId,
    }));

    const { error: linkError } = await supabase
      .from('bundle_permissions')
      .upsert(bundlePermissions, {
        onConflict: 'tenant_id,bundle_id,permission_id',
        ignoreDuplicates: true,
      });

    if (linkError) {
      throw new Error(`Failed to link permissions to bundle ${definition.bundleCode}: ${linkError.message}`);
    }

    permissionsLinked = permissionIds.length;
  }

  // Step 6: Link bundle to role
  // NOTE: role_bundles table removed - bundles are deprecated in favor of direct role-permission assignments
  // Skipping role_bundles link as the table no longer exists
  console.log(`Skipping role_bundles link for deprecated bundle system (bundle: ${definition.bundleCode})`);

  return { bundleCreated, permissionsLinked };
}
