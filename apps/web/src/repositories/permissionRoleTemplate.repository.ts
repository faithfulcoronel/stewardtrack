import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { BaseRepository } from './base.repository';
import {
  PermissionRoleTemplate,
  CreatePermissionRoleTemplateDto,
  UpdatePermissionRoleTemplateDto,
} from '@/models/featurePermission.model';
import type { IPermissionRoleTemplateAdapter } from '@/adapters/permissionRoleTemplate.adapter';

/**
 * Repository interface for permission role templates
 */
export interface IPermissionRoleTemplateRepository {
  create(data: CreatePermissionRoleTemplateDto): Promise<PermissionRoleTemplate>;
  update(id: string, data: UpdatePermissionRoleTemplateDto): Promise<PermissionRoleTemplate>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<PermissionRoleTemplate | null>;
  getByPermissionId(permissionId: string): Promise<PermissionRoleTemplate[]>;
  deleteByPermissionId(permissionId: string): Promise<void>;
}

/**
 * Repository for managing permission role templates
 *
 * This repository handles the data access layer for permission role templates,
 * which define default role assignments for feature permissions. It enforces
 * business rules and validation before delegating to the adapter layer.
 *
 * @implements {IPermissionRoleTemplateRepository}
 */
@injectable()
export class PermissionRoleTemplateRepository
  extends BaseRepository<PermissionRoleTemplate>
  implements IPermissionRoleTemplateRepository
{
  constructor(
    @inject(TYPES.IPermissionRoleTemplateAdapter)
    protected adapter: IPermissionRoleTemplateAdapter
  ) {
    super(adapter);
  }

  /**
   * Get all templates for a specific feature permission
   * @param permissionId - The feature permission ID
   * @returns Array of permission role templates
   */
  async getByPermissionId(permissionId: string): Promise<PermissionRoleTemplate[]> {
    return await this.adapter.getByPermissionId(permissionId);
  }

  /**
   * Delete all templates for a specific feature permission
   * Useful when deleting a permission or resetting its role assignments
   * @param permissionId - The feature permission ID
   */
  async deleteByPermissionId(permissionId: string): Promise<void> {
    await this.adapter.deleteByPermissionId(permissionId);
  }

  /**
   * Validation hook before creating a permission role template
   * Ensures required fields are present and valid
   */
  protected async beforeCreate(
    data: Partial<PermissionRoleTemplate>
  ): Promise<Partial<PermissionRoleTemplate>> {
    // Validate required fields
    if (!data.feature_permission_id) {
      throw new Error('Feature permission ID is required');
    }

    if (!data.role_key) {
      throw new Error('Role key is required');
    }

    // Validate role_key format (snake_case)
    if (!this.isValidRoleKeyFormat(data.role_key)) {
      throw new Error(
        'Invalid role key format. Must be lowercase snake_case (e.g., tenant_admin, staff, member)'
      );
    }

    // Set default values
    if (data.is_recommended === undefined) {
      data.is_recommended = true;
    }

    return data;
  }

  /**
   * Validation hook before updating a permission role template
   */
  protected async beforeUpdate(
    data: Partial<PermissionRoleTemplate>
  ): Promise<Partial<PermissionRoleTemplate>> {
    // Validate role_key format if being updated
    if (data.role_key && !this.isValidRoleKeyFormat(data.role_key)) {
      throw new Error(
        'Invalid role key format. Must be lowercase snake_case (e.g., tenant_admin, staff, member)'
      );
    }

    return data;
  }

  /**
   * Validates role key format
   * Must be lowercase snake_case (letters, numbers, underscores)
   */
  private isValidRoleKeyFormat(roleKey: string): boolean {
    return /^[a-z][a-z0-9_]*$/.test(roleKey);
  }

  /**
   * Bulk create permission role templates
   * Useful when creating multiple default role assignments for a permission
   * @param templates - Array of template data to create
   * @returns Array of created templates
   */
  async bulkCreate(
    templates: CreatePermissionRoleTemplateDto[]
  ): Promise<PermissionRoleTemplate[]> {
    const created: PermissionRoleTemplate[] = [];

    for (const template of templates) {
      const result = await this.create(template);
      created.push(result);
    }

    return created;
  }

  /**
   * Replace all templates for a permission
   * Deletes existing templates and creates new ones
   * @param permissionId - The feature permission ID
   * @param templates - New templates to create
   * @returns Array of created templates
   */
  async replaceTemplatesForPermission(
    permissionId: string,
    templates: CreatePermissionRoleTemplateDto[]
  ): Promise<PermissionRoleTemplate[]> {
    // Delete existing templates
    await this.deleteByPermissionId(permissionId);

    // Create new templates
    return await this.bulkCreate(templates);
  }
}
