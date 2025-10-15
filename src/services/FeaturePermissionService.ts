import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFeaturePermissionRepository } from '@/repositories/featurePermission.repository';
import type { IPermissionRoleTemplateRepository } from '@/repositories/permissionRoleTemplate.repository';
import type { IFeatureCatalogRepository } from '@/repositories/featureCatalog.repository';
import type { PermissionValidationService } from './PermissionValidationService';
import type {
  FeaturePermission,
  CreateFeaturePermissionDto,
  UpdateFeaturePermissionDto,
  PermissionRoleTemplate,
  CreatePermissionRoleTemplateDto,
  DbFeaturePermissionWithTemplates,
} from '@/models/featurePermission.model';

/**
 * Input DTO for creating a feature permission with role templates
 */
export interface CreateFeaturePermissionWithTemplatesDto {
  permission: CreateFeaturePermissionDto;
  roleTemplates?: Array<{
    role_key: string;
    is_recommended?: boolean;
    reason?: string;
  }>;
}

/**
 * Result of bulk permission creation
 */
export interface BulkPermissionCreationResult {
  success: boolean;
  created: FeaturePermission[];
  errors: Array<{ code: string; error: string }>;
}

/**
 * Feature Permission Service
 *
 * Orchestrates the creation and management of feature permissions and their
 * associated role templates. This service coordinates between feature permissions,
 * role templates, and validation.
 */
@injectable()
export class FeaturePermissionService {
  constructor(
    @inject(TYPES.IFeaturePermissionRepository)
    private featurePermissionRepository: IFeaturePermissionRepository,
    @inject(TYPES.IPermissionRoleTemplateRepository)
    private permissionRoleTemplateRepository: IPermissionRoleTemplateRepository,
    @inject(TYPES.IFeatureCatalogRepository)
    private featureCatalogRepository: IFeatureCatalogRepository,
    @inject(TYPES.PermissionValidationService)
    private validationService: PermissionValidationService
  ) {}

  /**
   * Create a feature permission with optional role templates
   * This is the primary method for creating permissions from the UI
   */
  async createPermissionWithTemplates(
    input: CreateFeaturePermissionWithTemplatesDto
  ): Promise<{
    permission: FeaturePermission;
    templates: PermissionRoleTemplate[];
  }> {
    const { permission: permissionData, roleTemplates } = input;

    // Validate permission code format
    const formatValidation = this.validationService.validatePermissionCodeFormat(
      permissionData.permission_code
    );
    if (!formatValidation.valid) {
      throw new Error(`Invalid permission code: ${formatValidation.error}`);
    }

    // Check if permission code is available
    const isAvailable = await this.validationService.isPermissionCodeAvailable(
      permissionData.permission_code,
      permissionData.feature_id
    );
    if (!isAvailable) {
      throw new Error(`Permission code '${permissionData.permission_code}' is already in use`);
    }

    // Verify feature exists
    const feature = await this.featureCatalogRepository.findById(permissionData.feature_id);
    if (!feature) {
      throw new Error(`Feature with ID '${permissionData.feature_id}' not found`);
    }

    // Create the permission
    const permission = await this.featurePermissionRepository.create(permissionData);

    // Create role templates if provided
    const templates: PermissionRoleTemplate[] = [];
    if (roleTemplates && roleTemplates.length > 0) {
      // Validate role keys
      const roleKeyValidation = this.validationService.validateRoleKeyBatch(
        roleTemplates.map(t => t.role_key)
      );
      if (!roleKeyValidation.valid) {
        // Rollback permission creation
        await this.featurePermissionRepository.delete(permission.id);
        throw new Error(
          `Invalid role keys: ${roleKeyValidation.errors.map(e => e.error).join(', ')}`
        );
      }

      // Create templates
      for (const templateData of roleTemplates) {
        const template = await this.permissionRoleTemplateRepository.create({
          feature_permission_id: permission.id,
          role_key: templateData.role_key,
          is_recommended: templateData.is_recommended ?? true,
          reason: templateData.reason,
        });
        templates.push(template);
      }
    }

    return { permission, templates };
  }

  /**
   * Update a feature permission
   * Note: This does not update role templates. Use separate methods for that.
   */
  async updatePermission(
    permissionId: string,
    data: UpdateFeaturePermissionDto
  ): Promise<FeaturePermission> {
    // Validate permission code format if being updated
    if (data.permission_code) {
      const formatValidation = this.validationService.validatePermissionCodeFormat(
        data.permission_code
      );
      if (!formatValidation.valid) {
        throw new Error(`Invalid permission code: ${formatValidation.error}`);
      }

      // Check if new permission code is available
      const existing = await this.featurePermissionRepository.findById(permissionId);
      if (!existing) {
        throw new Error(`Permission with ID '${permissionId}' not found`);
      }

      if (data.permission_code !== existing.permission_code) {
        const isAvailable = await this.validationService.isPermissionCodeAvailable(
          data.permission_code,
          existing.feature_id
        );
        if (!isAvailable) {
          throw new Error(`Permission code '${data.permission_code}' is already in use`);
        }
      }
    }

    return await this.featurePermissionRepository.update(permissionId, data);
  }

  /**
   * Delete a feature permission and all its role templates
   */
  async deletePermission(permissionId: string): Promise<void> {
    // Delete role templates first (CASCADE will handle this, but explicit is better)
    await this.permissionRoleTemplateRepository.deleteByPermissionId(permissionId);

    // Delete the permission
    await this.featurePermissionRepository.delete(permissionId);
  }

  /**
   * Get a feature permission with its role templates
   */
  async getPermissionWithTemplates(permissionId: string): Promise<{
    permission: FeaturePermission;
    templates: PermissionRoleTemplate[];
  }> {
    const permission = await this.featurePermissionRepository.findById(permissionId);
    if (!permission) {
      throw new Error(`Permission with ID '${permissionId}' not found`);
    }

    const templates = await this.permissionRoleTemplateRepository.getByPermissionId(permissionId);

    return { permission, templates };
  }

  /**
   * Get all permissions for a feature with their role templates
   */
  async getFeaturePermissionsWithTemplates(
    featureId: string
  ): Promise<DbFeaturePermissionWithTemplates[]> {
    return await this.featurePermissionRepository.getWithTemplates(featureId);
  }

  /**
   * Replace all role templates for a permission
   */
  async updateRoleTemplates(
    permissionId: string,
    templates: Array<{
      role_key: string;
      is_recommended?: boolean;
      reason?: string;
    }>
  ): Promise<PermissionRoleTemplate[]> {
    // Verify permission exists
    const permission = await this.featurePermissionRepository.findById(permissionId);
    if (!permission) {
      throw new Error(`Permission with ID '${permissionId}' not found`);
    }

    // Validate role keys
    const roleKeyValidation = this.validationService.validateRoleKeyBatch(
      templates.map(t => t.role_key)
    );
    if (!roleKeyValidation.valid) {
      throw new Error(
        `Invalid role keys: ${roleKeyValidation.errors.map(e => e.error).join(', ')}`
      );
    }

    // Replace templates
    const templateDtos: CreatePermissionRoleTemplateDto[] = templates.map(t => ({
      feature_permission_id: permissionId,
      role_key: t.role_key,
      is_recommended: t.is_recommended ?? true,
      reason: t.reason,
    }));

    return await this.permissionRoleTemplateRepository.replaceTemplatesForPermission(
      permissionId,
      templateDtos
    );
  }

  /**
   * Bulk create permissions for a feature
   * Useful when setting up a new feature with multiple permissions at once
   */
  async bulkCreatePermissions(
    featureId: string,
    permissions: Array<CreateFeaturePermissionWithTemplatesDto>
  ): Promise<BulkPermissionCreationResult> {
    // Verify feature exists
    const feature = await this.featureCatalogRepository.findById(featureId);
    if (!feature) {
      throw new Error(`Feature with ID '${featureId}' not found`);
    }

    // Validate all permission codes
    const codes = permissions.map(p => p.permission.permission_code);
    const validation = await this.validationService.validatePermissionCodeBatch(codes, featureId);

    if (!validation.valid) {
      return {
        success: false,
        created: [],
        errors: validation.errors,
      };
    }

    // Create all permissions
    const created: FeaturePermission[] = [];
    const errors: Array<{ code: string; error: string }> = [];

    for (const permissionInput of permissions) {
      try {
        const result = await this.createPermissionWithTemplates({
          permission: {
            ...permissionInput.permission,
            feature_id: featureId,
          },
          roleTemplates: permissionInput.roleTemplates,
        });
        created.push(result.permission);
      } catch (error: any) {
        errors.push({
          code: permissionInput.permission.permission_code,
          error: error.message || 'Failed to create permission',
        });
      }
    }

    return {
      success: errors.length === 0,
      created,
      errors,
    };
  }

  /**
   * Generate suggested permissions for a feature based on its surface_id
   * This is a helper for the UI to pre-populate permission suggestions
   */
  async suggestPermissionsForFeature(featureId: string): Promise<
    Array<{
      permission_code: string;
      display_name: string;
      description: string;
      is_required: boolean;
      recommended_roles: string[];
    }>
  > {
    const feature = await this.featureCatalogRepository.findById(featureId);
    if (!feature) {
      throw new Error(`Feature with ID '${featureId}' not found`);
    }

    // If no surface_id, return basic suggestions
    if (!feature.surface_id) {
      return this.getBasicPermissionSuggestions();
    }

    // Generate suggestions based on surface_id
    const suggestions = [];
    const commonActions = this.validationService.getCommonActions();

    // Suggest view/read permission (required)
    suggestions.push({
      permission_code: this.validationService.suggestPermissionCode(feature.surface_id, 'view'),
      display_name: 'View',
      description: `View ${feature.name} information`,
      is_required: true,
      recommended_roles: ['tenant_admin', 'staff', 'volunteer'],
    });

    // Suggest manage permission
    suggestions.push({
      permission_code: this.validationService.suggestPermissionCode(feature.surface_id, 'manage'),
      display_name: 'Manage',
      description: `Manage ${feature.name} (create, update, delete)`,
      is_required: false,
      recommended_roles: ['tenant_admin', 'staff'],
    });

    // Suggest export permission
    suggestions.push({
      permission_code: this.validationService.suggestPermissionCode(feature.surface_id, 'export'),
      display_name: 'Export',
      description: `Export ${feature.name} data`,
      is_required: false,
      recommended_roles: ['tenant_admin'],
    });

    return suggestions;
  }

  /**
   * Get basic permission suggestions when no surface_id is available
   */
  private getBasicPermissionSuggestions(): Array<{
    permission_code: string;
    display_name: string;
    description: string;
    is_required: boolean;
    recommended_roles: string[];
  }> {
    return [
      {
        permission_code: 'feature:view',
        display_name: 'View',
        description: 'View feature information',
        is_required: true,
        recommended_roles: ['tenant_admin', 'staff'],
      },
      {
        permission_code: 'feature:manage',
        display_name: 'Manage',
        description: 'Manage feature (create, update, delete)',
        is_required: false,
        recommended_roles: ['tenant_admin'],
      },
    ];
  }

  /**
   * Validate that a feature has proper permission configuration
   */
  async validateFeatureConfiguration(featureId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check feature exists
    const feature = await this.featureCatalogRepository.findById(featureId);
    if (!feature) {
      errors.push(`Feature with ID '${featureId}' not found`);
      return { valid: false, errors, warnings };
    }

    // Check permissions exist
    const validation = await this.validationService.validateFeaturePermissions(featureId);
    if (!validation.valid) {
      errors.push(validation.error!);
    }
    if (validation.warnings) {
      warnings.push(...validation.warnings);
    }

    // Check that each permission has at least one role template
    const permissions = await this.featurePermissionRepository.getWithTemplates(featureId);
    for (const permission of permissions) {
      if (!permission.role_templates || permission.role_templates.length === 0) {
        warnings.push(
          `Permission '${permission.permission_code}' has no role templates. Consider adding default role assignments.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
