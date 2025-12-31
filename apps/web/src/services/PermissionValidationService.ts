import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFeaturePermissionRepository } from '@/repositories/featurePermission.repository';
import type { IPermissionRepository } from '@/repositories/permission.repository';

/**
 * Permission Validation Service
 *
 * Validates permission codes, formats, and ensures consistency between
 * feature permissions and RBAC permissions.
 */
@injectable()
export class PermissionValidationService {
  constructor(
    @inject(TYPES.IFeaturePermissionRepository)
    private featurePermissionRepository: IFeaturePermissionRepository,
    @inject(TYPES.IPermissionRepository)
    private permissionRepository: IPermissionRepository
  ) {}

  /**
   * Validates permission code format
   * Must be {category}:{action} with lowercase letters and underscores
   */
  validatePermissionCodeFormat(code: string): { valid: boolean; error?: string } {
    if (!code) {
      return { valid: false, error: 'Permission code is required' };
    }

    const parts = code.split(':');
    if (parts.length !== 2) {
      return { valid: false, error: 'Permission code must be in format {category}:{action}' };
    }

    const [category, action] = parts;

    if (!category || !action) {
      return { valid: false, error: 'Both category and action are required' };
    }

    // Validate format: lowercase letters, numbers, and underscores only
    const validPattern = /^[a-z][a-z0-9_]*$/;

    if (!validPattern.test(category)) {
      return {
        valid: false,
        error: 'Category must start with a letter and contain only lowercase letters, numbers, and underscores'
      };
    }

    if (!validPattern.test(action)) {
      return {
        valid: false,
        error: 'Action must start with a letter and contain only lowercase letters, numbers, and underscores'
      };
    }

    return { valid: true };
  }

  /**
   * Checks if a permission code is available (not already in use)
   * @param code - The permission code to check
   * @param excludeFeatureId - Optional feature ID to exclude from check (for updates)
   */
  async isPermissionCodeAvailable(code: string, excludeFeatureId?: string): Promise<boolean> {
    const existing = await this.featurePermissionRepository.getByCode(code);

    if (!existing) {
      return true;
    }

    // If excluding a feature ID, check if the existing permission belongs to that feature
    if (excludeFeatureId && existing.feature_id === excludeFeatureId) {
      return true;
    }

    return false;
  }

  /**
   * Validates a batch of permission codes
   * Checks format and uniqueness across the batch and existing permissions
   */
  async validatePermissionCodeBatch(
    codes: string[],
    featureId?: string
  ): Promise<{
    valid: boolean;
    errors: Array<{ code: string; error: string }>;
  }> {
    const errors: Array<{ code: string; error: string }> = [];
    const seenCodes = new Set<string>();

    for (const code of codes) {
      // Check format
      const formatValidation = this.validatePermissionCodeFormat(code);
      if (!formatValidation.valid) {
        errors.push({ code, error: formatValidation.error! });
        continue;
      }

      // Check for duplicates within batch
      if (seenCodes.has(code)) {
        errors.push({ code, error: 'Duplicate permission code in batch' });
        continue;
      }
      seenCodes.add(code);

      // Check availability in database
      const isAvailable = await this.isPermissionCodeAvailable(code, featureId);
      if (!isAvailable) {
        errors.push({ code, error: 'Permission code already exists' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates role keys for permission role templates
   * Must be lowercase snake_case
   */
  validateRoleKey(roleKey: string): { valid: boolean; error?: string } {
    if (!roleKey) {
      return { valid: false, error: 'Role key is required' };
    }

    // Must start with lowercase letter, contain only lowercase letters, numbers, underscores
    const validPattern = /^[a-z][a-z0-9_]*$/;

    if (!validPattern.test(roleKey)) {
      return {
        valid: false,
        error: 'Role key must start with a letter and contain only lowercase letters, numbers, and underscores'
      };
    }

    return { valid: true };
  }

  /**
   * Validates a batch of role keys
   */
  validateRoleKeyBatch(roleKeys: string[]): {
    valid: boolean;
    errors: Array<{ roleKey: string; error: string }>;
  } {
    const errors: Array<{ roleKey: string; error: string }> = [];
    const seenKeys = new Set<string>();

    for (const roleKey of roleKeys) {
      // Check format
      const validation = this.validateRoleKey(roleKey);
      if (!validation.valid) {
        errors.push({ roleKey, error: validation.error! });
        continue;
      }

      // Check for duplicates within batch
      if (seenKeys.has(roleKey)) {
        errors.push({ roleKey, error: 'Duplicate role key in batch' });
        continue;
      }
      seenKeys.add(roleKey);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates permission code against RBAC system
   * Checks if the permission code should be registered in the RBAC permissions table
   */
  async checkRbacAlignment(
    permissionCode: string,
    tenantId?: string
  ): Promise<{
    exists: boolean;
    shouldSync: boolean;
    recommendation?: string;
  }> {
    // Check if permission exists in RBAC system
    const rbacPermission = await this.permissionRepository.findByCode(permissionCode);

    if (rbacPermission) {
      return {
        exists: true,
        shouldSync: false,
        recommendation: 'Permission already exists in RBAC system',
      };
    }

    return {
      exists: false,
      shouldSync: true,
      recommendation: 'Permission should be synced to RBAC system when feature is licensed',
    };
  }

  /**
   * Suggests a permission code based on surface ID
   * @param surfaceId - Surface ID (e.g., 'admin/members/directory')
   * @param action - Action (e.g., 'view', 'manage', 'delete')
   */
  suggestPermissionCode(surfaceId: string, action: string): string {
    // Parse surface ID to extract category
    // Example: 'admin/members/directory' -> 'members'
    const parts = surfaceId.split('/').filter(p => p !== 'admin');
    const category = parts[0] || 'feature';

    // Normalize action to lowercase and replace spaces with underscores
    const normalizedAction = action.toLowerCase().replace(/\s+/g, '_');

    return `${category}:${normalizedAction}`;
  }

  /**
   * Validates common permission action patterns
   * Returns suggested actions for a given category
   */
  getCommonActions(): string[] {
    return [
      'view',
      'read',
      'create',
      'update',
      'delete',
      'manage',
      'export',
      'import',
      'approve',
      'reject',
      'publish',
      'archive',
    ];
  }

  /**
   * Validates that a feature has at least one required permission
   */
  async validateFeaturePermissions(featureId: string): Promise<{
    valid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const permissions = await this.featurePermissionRepository.getByFeatureId(featureId);

    if (permissions.length === 0) {
      return {
        valid: false,
        error: 'Feature must have at least one permission',
      };
    }

    const hasRequired = permissions.some(p => p.is_required);
    const warnings: string[] = [];

    if (!hasRequired) {
      warnings.push('Feature has no required permissions. Consider marking at least one permission as required.');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
