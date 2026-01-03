/**
 * Permission Deployment Service
 *
 * PURPOSE: Automatically deploy permissions from licensed features to tenant RBAC
 *
 * This service bridges the gap between Licensing Studio and RBAC by:
 * 1. Converting feature grants → tenant permissions
 * 2. Applying permission role templates to actual tenant roles
 * 3. Synchronizing permissions when licenses change
 *
 * KEY CONCEPT: Licensing Studio defines WHAT features/permissions exist globally.
 *              This service deploys them TO SPECIFIC TENANTS based on their license.
 *
 * @author Claude AI
 * @date 2025-12-19
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { FeaturePermission, PermissionRoleTemplate } from '@/models/featurePermission.model';
import type { Permission, Role } from '@/models/rbac.model';
import type { IPermissionRepository } from '@/repositories/permission.repository';
import type { IRoleRepository } from '@/repositories/role.repository';
import type { IRolePermissionRepository } from '@/repositories/rolePermission.repository';
import type { IFeaturePermissionRepository } from '@/repositories/featurePermission.repository';
import type { IFeatureCatalogRepository } from '@/repositories/featureCatalog.repository';
import type { ITenantFeatureGrantRepository } from '@/repositories/tenantFeatureGrant.repository';

/**
 * Deployment result for a single feature
 */
export interface FeatureDeploymentResult {
  featureId: string;
  featureCode: string;
  featureName: string;
  success: boolean;
  permissionsDeployed: number;
  roleAssignments: number;
  errors: string[];
  warnings: string[];
}

/**
 * Summary of full deployment operation
 */
export interface DeploymentSummary {
  tenantId: string;
  totalFeatures: number;
  successfulDeployments: number;
  failedDeployments: number;
  totalPermissionsDeployed: number;
  totalRoleAssignments: number;
  results: FeatureDeploymentResult[];
  errors: string[];
  startedAt: Date;
  completedAt: Date;
}

/**
 * Options for deployment operation
 */
export interface DeploymentOptions {
  dryRun?: boolean;              // If true, don't actually create/update records
  forceReplace?: boolean;        // If true, replace existing permissions
  skipRoleTemplates?: boolean;   // If true, don't apply role templates
  specificFeatureIds?: string[]; // Only deploy these features (null = all)
}

@injectable()
export class PermissionDeploymentService {
  constructor(
    @inject(TYPES.IPermissionRepository)
    private permissionRepository: IPermissionRepository,

    @inject(TYPES.IRoleRepository)
    private roleRepository: IRoleRepository,

    @inject(TYPES.IRolePermissionRepository)
    private rolePermissionRepository: IRolePermissionRepository,

    @inject(TYPES.IFeaturePermissionRepository)
    private featurePermissionRepository: IFeaturePermissionRepository,

    @inject(TYPES.IFeatureCatalogRepository)
    private featureCatalogRepository: IFeatureCatalogRepository,

    @inject(TYPES.ITenantFeatureGrantRepository)
    private tenantFeatureGrantRepository: ITenantFeatureGrantRepository
  ) {}

  /**
   * Deploy ALL licensed features for a tenant
   * Called during tenant registration or license re-sync
   */
  async deployAllFeaturePermissions(
    tenantId: string,
    options: DeploymentOptions = {}
  ): Promise<DeploymentSummary> {
    console.log('[PERMISSION DEPLOY] ========================================');
    console.log('[PERMISSION DEPLOY] Starting deployment for tenant:', tenantId);
    console.log('[PERMISSION DEPLOY] ========================================');

    const summary: DeploymentSummary = {
      tenantId,
      totalFeatures: 0,
      successfulDeployments: 0,
      failedDeployments: 0,
      totalPermissionsDeployed: 0,
      totalRoleAssignments: 0,
      results: [],
      errors: [],
      startedAt: new Date(),
      completedAt: new Date(),
    };

    try {
      // 1. Get all features granted to this tenant
      console.log('[PERMISSION DEPLOY] Step 1: Fetching tenant feature grants...');
      const featureGrants = await this.tenantFeatureGrantRepository.getByTenantId(tenantId);
      console.log('[PERMISSION DEPLOY] Found', featureGrants.length, 'feature grants');
      console.log('[PERMISSION DEPLOY] Feature grant IDs:', featureGrants.map(fg => fg.feature_id));
      console.log('[PERMISSION DEPLOY] Feature grants detail:', JSON.stringify(featureGrants.map(fg => ({
        grant_id: fg.id,
        feature_id: fg.feature_id,
        grant_source: fg.grant_source
      })), null, 2));

      // Filter to specific features if requested
      const featuresToDeploy = options.specificFeatureIds
        ? featureGrants.filter((fg) => options.specificFeatureIds!.includes(fg.feature_id))
        : featureGrants;

      summary.totalFeatures = featuresToDeploy.length;
      console.log('[PERMISSION DEPLOY] Will deploy', featuresToDeploy.length, 'features');

      // 2. Deploy each feature's permissions
      for (let i = 0; i < featuresToDeploy.length; i++) {
        const grant = featuresToDeploy[i];
        console.log(`[PERMISSION DEPLOY] ----------------------------------------`);
        console.log(`[PERMISSION DEPLOY] Processing feature ${i + 1}/${featuresToDeploy.length}: ${grant.feature_id}`);

        const result = await this.deployFeaturePermissions(
          tenantId,
          grant.feature_id,
          options
        );

        console.log(`[PERMISSION DEPLOY] Result for feature ${grant.feature_id}:`, {
          success: result.success,
          featureCode: result.featureCode,
          featureName: result.featureName,
          permissionsDeployed: result.permissionsDeployed,
          roleAssignments: result.roleAssignments,
          errors: result.errors,
          warnings: result.warnings
        });

        summary.results.push(result);

        if (result.success) {
          summary.successfulDeployments++;
          summary.totalPermissionsDeployed += result.permissionsDeployed;
          summary.totalRoleAssignments += result.roleAssignments;
        } else {
          summary.failedDeployments++;
          summary.errors.push(...result.errors);
        }
      }
    } catch (error: any) {
      console.error('[PERMISSION DEPLOY] FATAL ERROR:', error);
      console.error('[PERMISSION DEPLOY] Stack trace:', error.stack);
      summary.errors.push(`Deployment failed: ${error.message}`);
      summary.failedDeployments = summary.totalFeatures;
    } finally {
      summary.completedAt = new Date();
      console.log('[PERMISSION DEPLOY] ========================================');
      console.log('[PERMISSION DEPLOY] Deployment Summary:');
      console.log('[PERMISSION DEPLOY]   Total Features:', summary.totalFeatures);
      console.log('[PERMISSION DEPLOY]   Successful:', summary.successfulDeployments);
      console.log('[PERMISSION DEPLOY]   Failed:', summary.failedDeployments);
      console.log('[PERMISSION DEPLOY]   Permissions Deployed:', summary.totalPermissionsDeployed);
      console.log('[PERMISSION DEPLOY]   Role Assignments:', summary.totalRoleAssignments);
      console.log('[PERMISSION DEPLOY]   Errors:', summary.errors);
      console.log('[PERMISSION DEPLOY] ========================================');
    }

    return summary;
  }

  /**
   * Deploy permissions for a SINGLE feature to a tenant
   * Core algorithm for feature→permission deployment
   */
  async deployFeaturePermissions(
    tenantId: string,
    featureId: string,
    options: DeploymentOptions = {}
  ): Promise<FeatureDeploymentResult> {
    console.log(`[PERMISSION DEPLOY] >> deployFeaturePermissions() called`);
    console.log(`[PERMISSION DEPLOY]    Tenant ID: ${tenantId}`);
    console.log(`[PERMISSION DEPLOY]    Feature ID: ${featureId}`);

    const result: FeatureDeploymentResult = {
      featureId,
      featureCode: '',
      featureName: '',
      success: false,
      permissionsDeployed: 0,
      roleAssignments: 0,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Get feature details
      console.log(`[PERMISSION DEPLOY]    Step 1: Fetching feature details from feature_catalog...`);
      const feature = await this.featureCatalogRepository.getById(featureId);

      if (!feature) {
        console.error(`[PERMISSION DEPLOY]    ERROR: Feature not found in catalog: ${featureId}`);
        result.errors.push(`Feature not found: ${featureId}`);
        return result;
      }

      result.featureCode = feature.code;
      result.featureName = feature.name;
      console.log(`[PERMISSION DEPLOY]    Feature found: ${feature.code} (${feature.name})`);

      // 2. Get all permissions defined for this feature
      console.log(`[PERMISSION DEPLOY]    Step 2: Fetching feature permissions from feature_permissions table...`);
      const featurePermissions = await this.featurePermissionRepository.getByFeatureId(featureId);
      console.log(`[PERMISSION DEPLOY]    Found ${featurePermissions.length} permissions for feature ${feature.code}`);

      if (featurePermissions.length === 0) {
        console.warn(`[PERMISSION DEPLOY]    WARNING: Feature ${feature.code} has no permissions defined`);
        result.warnings.push(
          `Feature ${feature.code} has no permissions defined in feature_permissions table`
        );
        result.success = true; // Not an error, just no permissions to deploy
        return result;
      }

      // Log permission details
      featurePermissions.forEach((perm, idx) => {
        console.log(`[PERMISSION DEPLOY]    Permission ${idx + 1}/${featurePermissions.length}:`, {
          id: perm.id,
          permission_code: perm.permission_code,
          display_name: perm.display_name,
          is_required: perm.is_required
        });
      });

      // 3. Deploy each permission
      for (const featPerm of featurePermissions) {
        const deployed = await this.deployPermission(
          tenantId,
          featureId,
          featPerm,
          options
        );

        if (deployed.permissionCreated) {
          result.permissionsDeployed++;
        }

        result.roleAssignments += deployed.roleAssignments;

        if (deployed.errors.length > 0) {
          result.errors.push(...deployed.errors);
        }
        if (deployed.warnings.length > 0) {
          result.warnings.push(...deployed.warnings);
        }
      }

      result.success = result.errors.length === 0;
    } catch (error: any) {
      result.errors.push(`Failed to deploy feature ${featureId}: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Deploy a SINGLE permission to tenant
   * Handles:
   * 1. Create/update tenant permission record
   * 2. Apply role templates (assign to appropriate roles)
   *
   * NOTE: Uses elevated access methods to bypass RLS for super admin operations.
   * This is necessary when a super admin assigns a license to a tenant they don't belong to.
   */
  private async deployPermission(
    tenantId: string,
    featureId: string,
    featurePermission: FeaturePermission,
    options: DeploymentOptions
  ): Promise<{
    permissionCreated: boolean;
    roleAssignments: number;
    errors: string[];
    warnings: string[];
  }> {
    console.log(`[PERMISSION DEPLOY]       >> deployPermission() for ${featurePermission.permission_code}`);

    const deployResult = {
      permissionCreated: false,
      roleAssignments: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      // 1. Check if permission already exists for this tenant (using elevated access)
      console.log(`[PERMISSION DEPLOY]          Checking if permission exists in tenant RBAC...`);
      const existingPermission = await this.permissionRepository.findByCodeWithElevatedAccess(
        tenantId,
        featurePermission.permission_code
      );

      let tenantPermission: Permission;

      if (existingPermission && !options.forceReplace) {
        // Permission already exists - skip or warn
        console.log(`[PERMISSION DEPLOY]          Permission already exists, skipping creation`);
        deployResult.warnings.push(
          `Permission ${featurePermission.permission_code} already exists for tenant ${tenantId}`
        );
        tenantPermission = existingPermission;
      } else {
        // Create new permission or replace existing
        if (!options.dryRun) {
          // Parse category and action from permission_code (e.g., "members:view" → category="members", action="view")
          const [category, action] = featurePermission.permission_code.split(':');

          const permissionData = {
            code: featurePermission.permission_code,
            name: featurePermission.display_name,
            description: featurePermission.description,
            module: category || 'general',
            action: action || 'execute',
            is_active: true,
            tenant_id: tenantId,
            source: 'license_feature',
            source_reference: featureId,
          };

          console.log(`[PERMISSION DEPLOY]          Creating tenant permission:`, permissionData);

          if (existingPermission && options.forceReplace) {
            console.log(`[PERMISSION DEPLOY]          Updating existing permission (elevated access)...`);
            tenantPermission = await this.permissionRepository.updateWithElevatedAccess(
              existingPermission.id,
              permissionData
            );
          } else {
            console.log(`[PERMISSION DEPLOY]          Creating new permission (elevated access)...`);
            tenantPermission = await this.permissionRepository.createWithElevatedAccess(permissionData);
          }

          deployResult.permissionCreated = true;
        } else {
          // Dry run - just log what would happen
          console.log(
            `[DRY RUN] Would create permission: ${featurePermission.permission_code} for tenant ${tenantId}`
          );
          return deployResult;
        }
      }

      // 2. Apply role templates (if not skipped)
      if (!options.skipRoleTemplates) {
        console.log(`[PERMISSION DEPLOY]          Fetching role templates for permission ${featurePermission.id} (elevated access)...`);
        const templates = await this.featurePermissionRepository.getRoleTemplatesWithElevatedAccess(
          featurePermission.id
        );
        console.log(`[PERMISSION DEPLOY]          Found ${templates.length} role templates`);

        if (templates.length > 0) {
          templates.forEach((t, idx) => {
            console.log(`[PERMISSION DEPLOY]          Template ${idx + 1}: role_key=${t.role_key}, recommended=${t.is_recommended}`);
          });

          for (const template of templates) {
            const assigned = await this.applyRoleTemplate(
              tenantId,
              tenantPermission!.id,
              template,
              options
            );

            if (assigned) {
              deployResult.roleAssignments++;
              console.log(`[PERMISSION DEPLOY]          ✓ Role assignment successful`);
            } else {
              console.log(`[PERMISSION DEPLOY]          ✗ Role assignment failed or skipped`);
            }
          }
        } else {
          // FALLBACK: If no templates exist, always assign to tenant_admin
          console.log(`[PERMISSION DEPLOY]          No role templates found. Using fallback: assign to tenant_admin`);
          const assigned = await this.applyRoleTemplate(
            tenantId,
            tenantPermission!.id,
            { role_key: 'tenant_admin', is_recommended: true, reason: 'Fallback: no templates defined' } as any,
            options
          );

          if (assigned) {
            deployResult.roleAssignments++;
            console.log(`[PERMISSION DEPLOY]          ✓ Fallback: assigned permission to tenant_admin`);
          } else {
            console.log(`[PERMISSION DEPLOY]          ✗ Fallback: failed to assign to tenant_admin`);
          }
        }
      } else {
        console.log(`[PERMISSION DEPLOY]          Skipping role templates (skipRoleTemplates=true)`);
      }

      console.log(`[PERMISSION DEPLOY]       << deployPermission() complete: created=${deployResult.permissionCreated}, roleAssignments=${deployResult.roleAssignments}`);
    } catch (error: any) {
      console.error(`[PERMISSION DEPLOY]       ERROR in deployPermission():`, error);
      deployResult.errors.push(
        `Failed to deploy permission ${featurePermission.permission_code}: ${error.message}`
      );
    }

    return deployResult;
  }

  /**
   * Apply a role template to a tenant
   * Finds the tenant's role by metadata_key and assigns the permission
   * If the role doesn't exist, creates it first.
   *
   * NOTE: Uses elevated access methods to bypass RLS for super admin operations.
   * This is necessary when a super admin assigns a license to a tenant they don't belong to.
   */
  private async applyRoleTemplate(
    tenantId: string,
    permissionId: string,
    template: PermissionRoleTemplate,
    options: DeploymentOptions
  ): Promise<boolean> {
    console.log(`[PERMISSION DEPLOY]             >> applyRoleTemplate() for role_key=${template.role_key}`);

    try {
      // 1. Find tenant role by metadata_key (using elevated access)
      // Template.role_key is like "tenant_admin", role.metadata_key is like "role_tenant_admin"
      const metadataKey = template.role_key.startsWith('role_')
        ? template.role_key
        : `role_${template.role_key}`;

      console.log(`[PERMISSION DEPLOY]                Searching for role with metadata_key: ${metadataKey} (elevated access)`);
      let tenantRole = await this.roleRepository.findByMetadataKeyWithElevatedAccess(tenantId, metadataKey);

      // 2. If role doesn't exist, create it
      if (!tenantRole) {
        console.log(`[PERMISSION DEPLOY]                Role not found with metadata_key=${metadataKey}. Creating...`);

        if (!options.dryRun) {
          // Map role_key to human-readable name and configuration
          const roleConfig = this.getRoleConfigForKey(template.role_key);

          console.log(`[PERMISSION DEPLOY]                Creating role: ${roleConfig.name} (${metadataKey})`);
          tenantRole = await this.roleRepository.createRoleWithElevatedAccess(
            {
              name: roleConfig.name,
              description: roleConfig.description,
              scope: roleConfig.scope,
              metadata_key: metadataKey,
              is_delegatable: roleConfig.is_delegatable,
            },
            tenantId
          );
          console.log(`[PERMISSION DEPLOY]                ✓ Created role: ${tenantRole.name} (id=${tenantRole.id})`);
        } else {
          console.log(`[DRY RUN] Would create role with metadata_key=${metadataKey}`);
          return false;
        }
      } else {
        console.log(`[PERMISSION DEPLOY]                ✓ Found tenant role: ${tenantRole.name} (id=${tenantRole.id})`);
      }

      // 3. Check if role already has this permission (using elevated access)
      console.log(`[PERMISSION DEPLOY]                Checking if role already has permission ${permissionId}...`);
      const existing = await this.rolePermissionRepository.findByRoleAndPermissionWithElevatedAccess(
        tenantRole.id,
        permissionId
      );

      if (existing) {
        console.log(`[PERMISSION DEPLOY]                Permission already assigned to role. Skipping.`);
        return false;
      }

      console.log(`[PERMISSION DEPLOY]                Permission not yet assigned. Proceeding with assignment...`);

      // 4. Assign permission to role (using elevated access)
      if (!options.dryRun) {
        console.log(`[PERMISSION DEPLOY]                Assigning permission ${permissionId} to role ${tenantRole.id} (elevated access)...`);
        await this.rolePermissionRepository.assignWithElevatedAccess(tenantRole.id, permissionId, tenantId);
        console.log(`[PERMISSION DEPLOY]                ✓ Successfully assigned permission to role ${tenantRole.name}`);
        return true;
      } else {
        console.log(
          `[DRY RUN] Would assign permission ${permissionId} to role ${tenantRole.name} (${metadataKey})`
        );
        return false;
      }
    } catch (error: any) {
      console.error(`[PERMISSION DEPLOY]                ERROR in applyRoleTemplate():`, error);
      console.error(
        `Failed to apply role template ${template.role_key}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Get role configuration for a given role_key
   * Maps role_key to human-readable name and settings
   */
  private getRoleConfigForKey(roleKey: string): {
    name: string;
    description: string;
    scope: 'tenant' | 'delegated';
    is_delegatable: boolean;
  } {
    // Normalize the role_key (remove 'role_' prefix if present)
    const normalizedKey = roleKey.startsWith('role_') ? roleKey.substring(5) : roleKey;

    // Map role keys to configurations (matches seedDefaultRBAC.ts)
    const roleConfigs: Record<string, { name: string; description: string; scope: 'tenant' | 'delegated'; is_delegatable: boolean }> = {
      tenant_admin: {
        name: 'Tenant Administrator',
        description: 'Full administrative access to all church management features',
        scope: 'tenant',
        is_delegatable: false,
      },
      staff: {
        name: 'Staff Member',
        description: 'Extended access for church staff members',
        scope: 'tenant',
        is_delegatable: true,
      },
      volunteer: {
        name: 'Volunteer',
        description: 'Limited access for church volunteers',
        scope: 'tenant',
        is_delegatable: true,
      },
      member: {
        name: 'Church Member',
        description: 'Basic access for church members',
        scope: 'tenant',
        is_delegatable: false,
      },
    };

    // Return the config for the role_key, or a default config
    return roleConfigs[normalizedKey] || {
      name: this.formatRoleName(normalizedKey),
      description: `Auto-created role for ${normalizedKey}`,
      scope: 'tenant',
      is_delegatable: true,
    };
  }

  /**
   * Convert a role_key to a human-readable name
   * e.g., "tenant_admin" → "Tenant Admin"
   */
  private formatRoleName(roleKey: string): string {
    return roleKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Remove permissions for features that are NO LONGER licensed
   * Called when license is downgraded or features are removed
   */
  async removeUnlicensedPermissions(
    tenantId: string,
    options: DeploymentOptions = {}
  ): Promise<{
    permissionsRemoved: number;
    errors: string[];
  }> {
    const result = {
      permissionsRemoved: 0,
      errors: [] as string[],
    };

    try {
      // 1. Get all permissions for this tenant where source='license_feature'
      const allPermissions = await this.permissionRepository.getByTenantId(tenantId);
      const licensedPermissions = allPermissions.filter(
        (p: any) => p.source === 'license_feature'
      );

      // 2. Get all currently granted features
      const featureGrants = await this.tenantFeatureGrantRepository.getByTenantId(tenantId);
      const grantedFeatureIds = new Set(featureGrants.map((fg) => fg.feature_id));

      // 3. Find permissions whose source_reference is NOT in granted features
      const orphanedPermissions = licensedPermissions.filter(
        (p: any) => !grantedFeatureIds.has(p.source_reference)
      );

      // 4. Delete orphaned permissions
      if (!options.dryRun) {
        for (const permission of orphanedPermissions) {
          await this.permissionRepository.delete(permission.id);
          result.permissionsRemoved++;
        }
      } else {
        console.log(
          `[DRY RUN] Would remove ${orphanedPermissions.length} unlicensed permissions`
        );
      }
    } catch (error: any) {
      result.errors.push(`Failed to remove unlicensed permissions: ${error.message}`);
    }

    return result;
  }

  /**
   * Synchronize tenant permissions with current license state
   * Adds new permissions, removes unlicensed ones
   */
  async syncTenantPermissions(
    tenantId: string,
    options: DeploymentOptions = {}
  ): Promise<DeploymentSummary> {
    // 1. Deploy all licensed features
    const deploymentSummary = await this.deployAllFeaturePermissions(tenantId, options);

    // 2. Remove unlicensed permissions
    if (!options.dryRun) {
      const removeResult = await this.removeUnlicensedPermissions(tenantId, options);
      deploymentSummary.errors.push(...removeResult.errors);
    }

    return deploymentSummary;
  }

  /**
   * Get deployment status for a tenant
   * Shows what permissions are deployed vs what should be deployed
   */
  async getDeploymentStatus(tenantId: string): Promise<{
    totalLicensedFeatures: number;
    totalDeployedPermissions: number;
    missingPermissions: number;
    orphanedPermissions: number;
    features: Array<{
      featureCode: string;
      featureName: string;
      permissionCount: number;
      deployedCount: number;
      status: 'complete' | 'partial' | 'missing';
    }>;
  }> {
    const status = {
      totalLicensedFeatures: 0,
      totalDeployedPermissions: 0,
      missingPermissions: 0,
      orphanedPermissions: 0,
      features: [] as any[],
    };

    // Get licensed features
    const featureGrants = await this.tenantFeatureGrantRepository.getByTenantId(tenantId);
    status.totalLicensedFeatures = featureGrants.length;

    // Get deployed permissions
    const allPermissions = await this.permissionRepository.getByTenantId(tenantId);
    const deployedPermissions = allPermissions.filter(
      (p: any) => p.source === 'license_feature'
    );
    status.totalDeployedPermissions = deployedPermissions.length;

    // Analyze each feature
    for (const grant of featureGrants) {
      const feature = await this.featureCatalogRepository.getById(grant.feature_id);
      if (!feature) continue;

      const featurePermissions = await this.featurePermissionRepository.getByFeatureId(
        grant.feature_id
      );
      const deployedForFeature = deployedPermissions.filter(
        (p: any) => p.source_reference === grant.feature_id
      );

      const featureStatus = {
        featureCode: feature.code,
        featureName: feature.name,
        permissionCount: featurePermissions.length,
        deployedCount: deployedForFeature.length,
        status: 'complete' as 'complete' | 'partial' | 'missing',
      };

      if (deployedForFeature.length === 0) {
        featureStatus.status = 'missing';
        status.missingPermissions += featurePermissions.length;
      } else if (deployedForFeature.length < featurePermissions.length) {
        featureStatus.status = 'partial';
        status.missingPermissions += featurePermissions.length - deployedForFeature.length;
      }

      status.features.push(featureStatus);
    }

    // Check for orphaned permissions
    const grantedFeatureIds = new Set(featureGrants.map((fg) => fg.feature_id));
    status.orphanedPermissions = deployedPermissions.filter(
      (p: any) => !grantedFeatureIds.has(p.source_reference)
    ).length;

    return status;
  }
}
