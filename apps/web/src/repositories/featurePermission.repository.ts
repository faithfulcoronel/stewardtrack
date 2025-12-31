/**
 * Feature Permission Repository
 *
 * Business logic layer for feature permissions
 * Follows three-layer architecture: Service → Repository → Adapter
 *
 * Part of: Feature Creation with Surface ID & Permission Definition
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { TYPES } from '@/lib/types';
import type {
  FeaturePermission,
  PermissionRoleTemplate,
  CreateFeaturePermissionDto,
  UpdateFeaturePermissionDto,
  DbFeaturePermissionWithTemplates
} from '@/models/featurePermission.model';
import type { IFeaturePermissionAdapter } from '@/adapters/featurePermission.adapter';

export interface IFeaturePermissionRepository {
  create(data: Partial<FeaturePermission>): Promise<FeaturePermission>;
  update(id: string, data: Partial<FeaturePermission>): Promise<FeaturePermission>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<FeaturePermission | null>;
  getByFeatureId(featureId: string): Promise<FeaturePermission[]>;
  getByCode(permissionCode: string): Promise<FeaturePermission | null>;
  getWithTemplates(featureId: string): Promise<DbFeaturePermissionWithTemplates[]>;
  getRoleTemplates(featurePermissionId: string): Promise<PermissionRoleTemplate[]>;
  isPermissionCodeAvailable(permissionCode: string, excludeFeatureId?: string): Promise<boolean>;
  deleteByFeatureId(featureId: string): Promise<void>;
}

@injectable()
export class FeaturePermissionRepository extends BaseRepository<FeaturePermission> implements IFeaturePermissionRepository {
  constructor(
    @inject(TYPES.IFeaturePermissionAdapter)
    protected adapter: IFeaturePermissionAdapter
  ) {
    super(adapter);
  }

  /**
   * Create a feature permission
   */
  async create(data: Partial<FeaturePermission>): Promise<FeaturePermission> {
    return await super.create(data);
  }

  /**
   * Update a feature permission
   */
  async update(id: string, data: Partial<FeaturePermission>): Promise<FeaturePermission> {
    return await super.update(id, data);
  }

  /**
   * Delete a feature permission
   */
  async delete(id: string): Promise<void> {
    return await super.delete(id);
  }

  /**
   * Get permission by ID
   */
  async getById(id: string): Promise<FeaturePermission | null> {
    return await this.findById(id);
  }

  /**
   * Get all permissions for a feature
   */
  async getByFeatureId(featureId: string): Promise<FeaturePermission[]> {
    return await this.adapter.getByFeatureId(featureId);
  }

  /**
   * Get permission by code
   */
  async getByCode(permissionCode: string): Promise<FeaturePermission | null> {
    return await this.adapter.getByCode(permissionCode);
  }

  /**
   * Get feature permissions with default role templates
   */
  async getWithTemplates(featureId: string): Promise<DbFeaturePermissionWithTemplates[]> {
    return await this.adapter.getWithTemplates(featureId);
  }

  /**
   * Get role templates for a specific feature permission
   */
  async getRoleTemplates(featurePermissionId: string): Promise<PermissionRoleTemplate[]> {
    return await this.adapter.getRoleTemplates(featurePermissionId);
  }

  /**
   * Check if permission code is available
   */
  async isPermissionCodeAvailable(permissionCode: string, excludeFeatureId?: string): Promise<boolean> {
    return await this.adapter.isPermissionCodeAvailable(permissionCode, excludeFeatureId);
  }

  /**
   * Delete all permissions for a feature
   * Used when deleting a feature
   */
  async deleteByFeatureId(featureId: string): Promise<void> {
    const permissions = await this.getByFeatureId(featureId);

    for (const permission of permissions) {
      await this.delete(permission.id);
    }
  }

  /**
   * Repository-level validation before creating
   */
  protected async beforeCreate(data: Partial<FeaturePermission>): Promise<Partial<FeaturePermission>> {
    // Validate permission code format
    if (data.permission_code && !this.isValidPermissionCodeFormat(data.permission_code)) {
      throw new Error('Invalid permission code format. Must be {category}:{action} (lowercase, underscores only)');
    }

    // Parse category and action from permission_code if not provided
    if (data.permission_code && !data.category && !data.action) {
      const [category, action] = data.permission_code.split(':');
      data.category = category;
      data.action = action;
    }

    return data;
  }

  /**
   * Repository-level validation before updating
   */
  protected async beforeUpdate(id: string, data: Partial<FeaturePermission>): Promise<Partial<FeaturePermission>> {
    // Validate permission code format if being updated
    if (data.permission_code && !this.isValidPermissionCodeFormat(data.permission_code)) {
      throw new Error('Invalid permission code format. Must be {category}:{action} (lowercase, underscores only)');
    }

    // Parse category and action from permission_code if updated
    if (data.permission_code) {
      const [category, action] = data.permission_code.split(':');
      data.category = category;
      data.action = action;
    }

    return data;
  }

  /**
   * Validate permission code format: {category}:{action}
   */
  private isValidPermissionCodeFormat(code: string): boolean {
    const regex = /^[a-z_]+:[a-z_]+$/;
    return regex.test(code);
  }
}
