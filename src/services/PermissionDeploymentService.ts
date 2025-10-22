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
  surfaceBindingsCreated: number;
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
  totalSurfaceBindings: number;
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
  skipSurfaceBindings?: boolean; // If true, don't create surface bindings
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
    const summary: DeploymentSummary = {
      tenantId,
      totalFeatures: 0,
      successfulDeployments: 0,
      failedDeployments: 0,
      totalPermissionsDeployed: 0,
      totalRoleAssignments: 0,
      totalSurfaceBindings: 0,
      results: [],
      errors: [],
      startedAt: new Date(),
      completedAt: new Date(),
    };

    try {
      // 1. Get all features granted to this tenant
      const featureGrants = await this.tenantFeatureGrantRepository.getByTenantId(tenantId);

      // Filter to specific features if requested
      const featuresToDeploy = options.specificFeatureIds
        ? featureGrants.filter((fg) => options.specificFeatureIds!.includes(fg.feature_id))
        : featureGrants;

      summary.totalFeatures = featuresToDeploy.length;

      // 2. Deploy each feature's permissions
      for (const grant of featuresToDeploy) {
        const result = await this.deployFeaturePermissions(
          tenantId,
          grant.feature_id,
          options
        );

        summary.results.push(result);

        if (result.success) {
          summary.successfulDeployments++;
          summary.totalPermissionsDeployed += result.permissionsDeployed;
          summary.totalRoleAssignments += result.roleAssignments;
          summary.totalSurfaceBindings += result.surfaceBindingsCreated;
        } else {
          summary.failedDeployments++;
          summary.errors.push(...result.errors);
        }
      }
    } catch (error: any) {
      summary.errors.push(`Deployment failed: ${error.message}`);
      summary.failedDeployments = summary.totalFeatures;
    } finally {
      summary.completedAt = new Date();
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
    const result: FeatureDeploymentResult = {
      featureId,
      featureCode: '',
      featureName: '',
      success: false,
      permissionsDeployed: 0,
      roleAssignments: 0,
      surfaceBindingsCreated: 0,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Get feature details
      const feature = await this.featureCatalogRepository.getById(featureId);
      if (!feature) {
        result.errors.push(`Feature not found: ${featureId}`);
        return result;
      }

      result.featureCode = feature.code;
      result.featureName = feature.name;

      // 2. Get all permissions defined for this feature
      const featurePermissions = await this.featurePermissionRepository.getByFeatureId(featureId);

      if (featurePermissions.length === 0) {
        result.warnings.push(
          `Feature ${feature.code} has no permissions defined in feature_permissions table`
        );
        result.success = true; // Not an error, just no permissions to deploy
        return result;
      }

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

      // Surface bindings removed - using direct feature-based access control

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
    const deployResult = {
      permissionCreated: false,
      roleAssignments: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      // 1. Check if permission already exists for this tenant
      const existingPermission = await this.permissionRepository.findByCode(
        tenantId,
        featurePermission.permission_code
      );

      let tenantPermission: Permission;

      if (existingPermission && !options.forceReplace) {
        // Permission already exists - skip or warn
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
            category: featurePermission.category,
            is_active: true,
            tenant_id: tenantId,
            source: 'license_feature',
            source_reference: featureId,
          };

          if (existingPermission && options.forceReplace) {
            tenantPermission = await this.permissionRepository.update(
              existingPermission.id,
              permissionData
            );
          } else {
            tenantPermission = await this.permissionRepository.create(permissionData);
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
        const templates = await this.featurePermissionRepository.getRoleTemplates(
          featurePermission.id
        );

        for (const template of templates) {
          const assigned = await this.applyRoleTemplate(
            tenantId,
            tenantPermission!.id,
            template,
            options
          );

          if (assigned) {
            deployResult.roleAssignments++;
          }
        }
      }
    } catch (error: any) {
      deployResult.errors.push(
        `Failed to deploy permission ${featurePermission.permission_code}: ${error.message}`
      );
    }

    return deployResult;
  }

  /**
   * Apply a role template to a tenant
   * Finds the tenant's role by metadata_key and assigns the permission
   */
  private async applyRoleTemplate(
    tenantId: string,
    permissionId: string,
    template: PermissionRoleTemplate,
    options: DeploymentOptions
  ): Promise<boolean> {
    try {
      // 1. Find tenant role by metadata_key
      // Template.role_key is like "tenant_admin", role.metadata_key is like "role_tenant_admin"
      const metadataKey = template.role_key.startsWith('role_')
        ? template.role_key
        : `role_${template.role_key}`;

      const tenantRole = await this.roleRepository.findByMetadataKey(tenantId, metadataKey);

      if (!tenantRole) {
        console.warn(
          `Role with metadata_key ${metadataKey} not found for tenant ${tenantId}. Skipping role template.`
        );
        return false;
      }

      // 2. Check if role already has this permission
      const existing = await this.rolePermissionRepository.findByRoleAndPermission(
        tenantRole.id,
        permissionId
      );

      if (existing) {
        // Already assigned
        return false;
      }

      // 3. Assign permission to role
      if (!options.dryRun) {
        await this.rolePermissionRepository.assign(tenantRole.id, permissionId);
        return true;
      } else {
        console.log(
          `[DRY RUN] Would assign permission ${permissionId} to role ${tenantRole.name} (${metadataKey})`
        );
        return false;
      }
    } catch (error: any) {
      console.error(
        `Failed to apply role template ${template.role_key}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Create surface binding for a feature's surface
   * Links the metadata surface to the feature's permissions
   */

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
