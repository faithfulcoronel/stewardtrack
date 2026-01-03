import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IProductOfferingRepository } from '@/repositories/productOffering.repository';
import type { ITenantFeatureGrantRepository } from '@/repositories/tenantFeatureGrant.repository';
import type { ILicenseAssignmentRepository } from '@/repositories/licenseAssignment.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { AuditService } from '@/services/AuditService';
import type { PermissionDeploymentService } from '@/services/PermissionDeploymentService';

/**
 * Deployment result for a single tenant
 */
export interface TenantDeploymentResult {
  tenantId: string;
  tenantName: string;
  success: boolean;
  featuresGranted: number;
  featuresRevoked: number;
  permissionsAdded: number;
  permissionsRemoved: number;
  rolesUpdated: string[];
  errors: string[];
}

/**
 * Cleanup result for orphaned grants
 */
export interface OrphanedGrantCleanupResult {
  success: boolean;
  tenantsProcessed: number;
  grantsRemoved: number;
  errors: string[];
  details: Array<{
    tenantId: string;
    tenantName: string;
    grantsRemoved: number;
  }>;
}

/**
 * Full deployment result
 */
export interface FullDeploymentResult {
  success: boolean;
  tenantResults: TenantDeploymentResult[];
  cleanupResult?: OrphanedGrantCleanupResult;
  summary: {
    totalTenants: number;
    successfulDeployments: number;
    failedDeployments: number;
    totalFeaturesGranted: number;
    totalFeaturesRevoked: number;
    totalPermissionsAdded: number;
    totalPermissionsRemoved: number;
  };
}

/**
 * Options for deployment
 */
export interface DeploymentOptions {
  /** Whether to run cleanup of orphaned grants before deployment */
  cleanupOrphanedGrants?: boolean;
  /** Whether to sync tenant role permissions with new features */
  syncRolePermissions?: boolean;
  /** Specific tenant IDs to deploy to (if empty, deploys to all tenants with the offering) */
  targetTenantIds?: string[];
  /** Whether to perform a dry run (no actual changes) */
  dryRun?: boolean;
}


/**
 * ProductOfferingDeploymentService
 *
 * Orchestrates the deployment of product offerings to tenants, including:
 * - Cleanup of orphaned feature grants (tenants without assigned offerings)
 * - Synchronization of tenant feature grants when offering changes
 * - Synchronization of tenant role permissions based on licensed features
 * - Audit logging of all deployment operations
 *
 * This service follows SOLID principles:
 * - Single Responsibility: Handles only deployment orchestration
 * - Open/Closed: Can be extended with new deployment strategies
 * - Liskov Substitution: Depends on repository interfaces
 * - Interface Segregation: Uses specific repository interfaces
 * - Dependency Inversion: Depends on abstractions, not implementations
 */
@injectable()
export class ProductOfferingDeploymentService {
  constructor(
    @inject(TYPES.IProductOfferingRepository)
    private productOfferingRepository: IProductOfferingRepository,
    @inject(TYPES.ITenantFeatureGrantRepository)
    private tenantFeatureGrantRepository: ITenantFeatureGrantRepository,
    @inject(TYPES.ILicenseAssignmentRepository)
    private licenseAssignmentRepository: ILicenseAssignmentRepository,
    @inject(TYPES.ITenantRepository)
    private tenantRepository: ITenantRepository,
    @inject(TYPES.AuditService)
    private auditService: AuditService,
    @inject(TYPES.PermissionDeploymentService)
    private permissionDeploymentService: PermissionDeploymentService
  ) {}

  /**
   * Cleans up orphaned feature grants for tenants without an assigned product offering
   *
   * When a tenant has no product offering assigned (subscription_offering_id is null),
   * any existing feature grants should be removed as they are orphaned.
   *
   * @returns Cleanup result with details of removed grants
   */
  async cleanupOrphanedFeatureGrants(): Promise<OrphanedGrantCleanupResult> {
    const result: OrphanedGrantCleanupResult = {
      success: true,
      tenantsProcessed: 0,
      grantsRemoved: 0,
      errors: [],
      details: [],
    };

    try {
      // Get all tenants for assignment to check their offering status
      const tenants = await this.licenseAssignmentRepository.getTenantsForAssignment();

      // Filter tenants with no offering assigned
      const tenantsWithNoOffering = tenants.filter(t => !t.current_offering_id);

      for (const tenant of tenantsWithNoOffering) {
        try {
          // Get all feature grants for this tenant
          const grants = await this.tenantFeatureGrantRepository.getByTenantId(tenant.tenant_id);

          if (grants.length === 0) {
            continue; // No grants to clean up
          }

          // Remove all feature grants for this tenant
          const removedCount = await this.removeAllFeatureGrantsForTenant(tenant.tenant_id);

          result.tenantsProcessed++;
          result.grantsRemoved += removedCount;
          result.details.push({
            tenantId: tenant.tenant_id,
            tenantName: tenant.tenant_name,
            grantsRemoved: removedCount,
          });

          // Log the cleanup using update action (closest to cleanup semantically)
          await this.auditService.logAuditEvent(
            'update',
            'tenant_feature_grants',
            tenant.tenant_id,
            {
              action: 'cleanup_orphaned_grants',
              tenant_name: tenant.tenant_name,
              grants_removed: removedCount,
              reason: 'No product offering assigned',
            }
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to cleanup tenant ${tenant.tenant_id}: ${message}`);
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.errors.push(`Cleanup failed: ${message}`);
      return result;
    }
  }

  /**
   * Deploys a product offering to a specific tenant
   *
   * This orchestrates the full deployment including:
   * 1. Granting/revoking features based on the new offering
   * 2. Syncing role permissions to match the new feature set
   *
   * @param tenantId The tenant to deploy to
   * @param offeringId The product offering to deploy
   * @param assignedBy The user performing the deployment
   * @param options Deployment options
   * @returns Deployment result for the tenant
   */
  async deployOfferingToTenant(
    tenantId: string,
    offeringId: string,
    assignedBy: string,
    options: DeploymentOptions = {}
  ): Promise<TenantDeploymentResult> {
    const { syncRolePermissions = true, dryRun = false } = options;

    const result: TenantDeploymentResult = {
      tenantId,
      tenantName: '',
      success: true,
      featuresGranted: 0,
      featuresRevoked: 0,
      permissionsAdded: 0,
      permissionsRemoved: 0,
      rolesUpdated: [],
      errors: [],
    };

    try {
      // Get tenant info
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }
      result.tenantName = tenant.name;

      // Get the offering with features
      const offering = await this.productOfferingRepository.getOfferingWithFeatures(offeringId);
      if (!offering) {
        throw new Error(`Product offering ${offeringId} not found`);
      }

      // Step 1: Assign the license (this handles feature grant/revoke via DB function)
      if (!dryRun) {
        const assignmentResult = await this.licenseAssignmentRepository.assignLicenseToTenant({
          tenant_id: tenantId,
          offering_id: offeringId,
          assigned_by: assignedBy,
          notes: `Deployed via ProductOfferingDeploymentService`,
        });

        result.featuresGranted = assignmentResult.features_granted;
        result.featuresRevoked = assignmentResult.features_revoked;
      } else {
        // Dry run - calculate what would change
        const changeSummary = await this.licenseAssignmentRepository.getFeatureChangeSummary(
          tenantId,
          offeringId
        );
        result.featuresGranted = changeSummary.features_to_add.length;
        result.featuresRevoked = changeSummary.features_to_remove.length;
      }

      // Step 2: Sync role permissions if requested
      if (syncRolePermissions) {
        const permissionResult = await this.syncTenantRolePermissions(
          tenantId,
          offeringId,
          dryRun
        );
        result.permissionsAdded = permissionResult.added;
        result.permissionsRemoved = permissionResult.removed;
        result.rolesUpdated = permissionResult.rolesUpdated;
      }

      // Log successful deployment
      if (!dryRun) {
        await this.auditService.logAuditEvent(
          'update',
          'license_assignment',
          tenantId,
          {
            action: 'deploy_offering',
            offering_id: offeringId,
            offering_name: offering.name,
            features_granted: result.featuresGranted,
            features_revoked: result.featuresRevoked,
            permissions_added: result.permissionsAdded,
            permissions_removed: result.permissionsRemoved,
            assigned_by: assignedBy,
          }
        );
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.errors.push(message);
      return result;
    }
  }

  /**
   * Deploys a product offering to multiple tenants
   *
   * @param offeringId The product offering to deploy
   * @param assignedBy The user performing the deployment
   * @param options Deployment options
   * @returns Full deployment result with all tenant results
   */
  async deployOfferingToAllTenants(
    offeringId: string,
    assignedBy: string,
    options: DeploymentOptions = {}
  ): Promise<FullDeploymentResult> {
    const { cleanupOrphanedGrants = true, targetTenantIds } = options;

    const result: FullDeploymentResult = {
      success: true,
      tenantResults: [],
      summary: {
        totalTenants: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        totalFeaturesGranted: 0,
        totalFeaturesRevoked: 0,
        totalPermissionsAdded: 0,
        totalPermissionsRemoved: 0,
      },
    };

    // Step 1: Cleanup orphaned grants if requested
    if (cleanupOrphanedGrants) {
      result.cleanupResult = await this.cleanupOrphanedFeatureGrants();
      if (!result.cleanupResult.success) {
        result.success = false;
      }
    }

    // Step 2: Get target tenants
    let tenants = await this.licenseAssignmentRepository.getTenantsForAssignment();

    // Filter to specific tenants if provided
    if (targetTenantIds && targetTenantIds.length > 0) {
      tenants = tenants.filter(t => targetTenantIds.includes(t.tenant_id));
    } else {
      // Only deploy to tenants that have this offering or no offering
      tenants = tenants.filter(
        t => t.current_offering_id === offeringId || !t.current_offering_id
      );
    }

    result.summary.totalTenants = tenants.length;

    // Step 3: Deploy to each tenant
    for (const tenant of tenants) {
      const tenantResult = await this.deployOfferingToTenant(
        tenant.tenant_id,
        offeringId,
        assignedBy,
        options
      );

      result.tenantResults.push(tenantResult);

      if (tenantResult.success) {
        result.summary.successfulDeployments++;
        result.summary.totalFeaturesGranted += tenantResult.featuresGranted;
        result.summary.totalFeaturesRevoked += tenantResult.featuresRevoked;
        result.summary.totalPermissionsAdded += tenantResult.permissionsAdded;
        result.summary.totalPermissionsRemoved += tenantResult.permissionsRemoved;
      } else {
        result.summary.failedDeployments++;
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Synchronizes a tenant's role permissions based on their licensed features
   *
   * This method uses the PermissionDeploymentService to:
   * 1. Deploy permissions from feature_permissions to tenant's permissions table
   * 2. Apply role templates to assign permissions to appropriate tenant roles
   * 3. Remove permissions for features that are no longer licensed
   *
   * @param tenantId The tenant to sync
   * @param _offeringId The offering ID (unused, kept for API compatibility)
   * @param dryRun Whether to simulate the sync without making changes
   * @returns Summary of permission changes
   */
  async syncTenantRolePermissions(
    tenantId: string,
    _offeringId: string,
    dryRun: boolean = false
  ): Promise<{
    added: number;
    removed: number;
    rolesUpdated: string[];
  }> {
    const result = { added: 0, removed: 0, rolesUpdated: [] as string[] };

    try {
      // Use PermissionDeploymentService to deploy all feature permissions
      // This service handles:
      // 1. Creating permissions in tenant's permissions table from feature_permissions
      // 2. Applying role templates to assign permissions to tenant roles
      // 3. Removing orphaned permissions for unlicensed features
      const deploymentSummary = await this.permissionDeploymentService.syncTenantPermissions(
        tenantId,
        { dryRun }
      );

      // Map deployment summary to our result format
      result.added = deploymentSummary.totalPermissionsDeployed;
      result.removed = 0; // removeUnlicensedPermissions runs separately in syncTenantPermissions

      // Extract unique role keys from deployment results
      const roleKeys = new Set<string>();
      for (const featureResult of deploymentSummary.results) {
        if (featureResult.roleAssignments > 0) {
          // We don't have direct access to role keys, but we know roles were updated
          // The PermissionDeploymentService logs this information
          roleKeys.add('roles_updated');
        }
      }

      // Get total role assignments as a proxy for roles updated
      if (deploymentSummary.totalRoleAssignments > 0) {
        result.rolesUpdated = [`${deploymentSummary.totalRoleAssignments} role assignments`];
      }

      console.log(`[ProductOfferingDeployment] Permission sync for tenant ${tenantId}:`, {
        totalFeatures: deploymentSummary.totalFeatures,
        permissionsDeployed: deploymentSummary.totalPermissionsDeployed,
        roleAssignments: deploymentSummary.totalRoleAssignments,
        errors: deploymentSummary.errors,
      });

      return result;
    } catch (error) {
      console.error('Error syncing tenant role permissions:', error);
      return result;
    }
  }

  /**
   * Removes all feature grants for a tenant
   */
  private async removeAllFeatureGrantsForTenant(tenantId: string): Promise<number> {
    return await this.tenantFeatureGrantRepository.deleteByTenantId(tenantId);
  }

  /**
   * Validates a deployment before executing
   *
   * @param offeringId The offering to validate
   * @param tenantIds Optional specific tenant IDs to validate
   * @returns Validation result
   */
  async validateDeployment(
    offeringId: string,
    tenantIds?: string[]
  ): Promise<{
    valid: boolean;
    warnings: string[];
    errors: string[];
    affectedTenants: number;
    featuresCount: number;
  }> {
    const result = {
      valid: true,
      warnings: [] as string[],
      errors: [] as string[],
      affectedTenants: 0,
      featuresCount: 0,
    };

    // Validate offering exists
    const offering = await this.productOfferingRepository.getOfferingWithFeatures(offeringId);
    if (!offering) {
      result.valid = false;
      result.errors.push(`Product offering ${offeringId} not found`);
      return result;
    }

    result.featuresCount = offering.features?.length || 0;

    if (result.featuresCount === 0) {
      result.warnings.push('Product offering has no features assigned');
    }

    // Validate tenants
    let tenants = await this.licenseAssignmentRepository.getTenantsForAssignment();

    if (tenantIds && tenantIds.length > 0) {
      const foundIds = new Set(tenants.map(t => t.tenant_id));
      for (const id of tenantIds) {
        if (!foundIds.has(id)) {
          result.errors.push(`Tenant ${id} not found`);
          result.valid = false;
        }
      }
      tenants = tenants.filter(t => tenantIds.includes(t.tenant_id));
    }

    result.affectedTenants = tenants.length;

    // Check for tenants that would lose features
    for (const tenant of tenants) {
      if (tenant.current_offering_id && tenant.current_offering_id !== offeringId) {
        result.warnings.push(
          `Tenant "${tenant.tenant_name}" will have their offering changed from ${tenant.current_offering_name || 'Unknown'} to ${offering.name}`
        );
      }
    }

    return result;
  }
}
