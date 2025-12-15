/**
 * Menu Management Service
 *
 * Provides CRUD operations for menu items with validation and hierarchy management.
 * Handles menu item creation, updates, deletions, and reordering.
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMenuItemRepository } from '@/repositories/menuItem.repository';
import type { MenuItem } from '@/models/menuItem.model';
import type { AuditService } from '@/services/AuditService';

export interface CreateMenuItemInput {
  parent_id?: string | null;
  code: string;
  label: string;
  path: string;
  icon?: string | null;
  sort_order?: number;
  section?: string | null;
  permission_key?: string;
  feature_key?: string | null;
  badge_text?: string | null;
  badge_variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | null;
  description?: string | null;
  is_visible?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateMenuItemInput {
  parent_id?: string | null;
  code?: string;
  label?: string;
  path?: string;
  icon?: string | null;
  sort_order?: number;
  section?: string | null;
  permission_key?: string;
  feature_key?: string | null;
  badge_text?: string | null;
  badge_variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | null;
  description?: string | null;
  is_visible?: boolean;
  metadata?: Record<string, any>;
}

export interface MenuItemValidationError {
  field: string;
  message: string;
}

export interface MenuManagementResult<T = MenuItem> {
  success: boolean;
  data?: T;
  errors?: MenuItemValidationError[];
  message?: string;
}

/**
 * Service for managing menu items
 */
@injectable()
export class MenuManagementService {
  constructor(
    @inject(TYPES.IMenuItemRepository)
    private menuRepo: IMenuItemRepository,
    @inject(TYPES.AuditService)
    private auditService: AuditService
  ) {}

  /**
   * Validate menu item data
   */
  private async validateMenuItem(
    input: CreateMenuItemInput | UpdateMenuItemInput,
    tenantId: string,
    existingId?: string
  ): Promise<MenuItemValidationError[]> {
    const errors: MenuItemValidationError[] = [];

    // Validate required fields (for create)
    if ('code' in input && !input.code) {
      errors.push({ field: 'code', message: 'Code is required' });
    }

    if ('label' in input && !input.label) {
      errors.push({ field: 'label', message: 'Label is required' });
    }

    if ('path' in input && !input.path) {
      errors.push({ field: 'path', message: 'Path is required' });
    }

    // Validate code uniqueness
    if ('code' in input && input.code) {
      const existing = await this.menuRepo.findAll({
        select: 'id',
        filters: {
          tenant_id: { operator: 'eq', value: tenantId },
          code: { operator: 'eq', value: input.code },
          deleted_at: { operator: 'isEmpty', value: true },
        },
      });

      if (existing.data && existing.data.length > 0 && existing.data[0].id !== existingId) {
        errors.push({ field: 'code', message: 'Code must be unique within tenant' });
      }
    }

    // Validate parent exists and is in same tenant
    if (input.parent_id) {
      const parent = await this.menuRepo.findById(input.parent_id);

      if (!parent || parent.tenant_id !== tenantId) {
        errors.push({ field: 'parent_id', message: 'Parent menu item not found or in different tenant' });
      }

      // Prevent circular reference
      if (existingId && input.parent_id === existingId) {
        errors.push({ field: 'parent_id', message: 'Menu item cannot be its own parent' });
      }
    }

    // Validate badge variant
    if ('badge_variant' in input && input.badge_variant) {
      const validVariants = ['default', 'primary', 'secondary', 'success', 'warning', 'danger'];
      if (!validVariants.includes(input.badge_variant)) {
        errors.push({ field: 'badge_variant', message: 'Invalid badge variant' });
      }
    }

    return errors;
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(
    input: CreateMenuItemInput,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult> {
    // Validate input
    const errors = await this.validateMenuItem(input, tenantId);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      // Get next sort order if not provided
      let sortOrder = input.sort_order;
      if (sortOrder === undefined) {
        const siblings = await this.menuRepo.findAll({
          select: 'sort_order',
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            parent_id: input.parent_id
              ? { operator: 'eq', value: input.parent_id }
              : { operator: 'isEmpty', value: true },
            deleted_at: { operator: 'isEmpty', value: true },
          },
          order: { column: 'sort_order', ascending: false },
        });

        sortOrder = siblings.data && siblings.data.length > 0 ? siblings.data[0].sort_order + 10 : 10;
      }

      // Create menu item
      const menuItem: Partial<MenuItem> = {
        ...input,
        tenant_id: tenantId,
        sort_order: sortOrder,
        is_system: false,
        is_visible: input.is_visible ?? true,
        metadata: input.metadata ?? {},
        created_by: userId,
        updated_by: userId,
      };

      const result = await this.menuRepo.create(menuItem as MenuItem);

      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating menu item:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing menu item
   */
  async updateMenuItem(
    id: string,
    input: UpdateMenuItemInput,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult> {
    // Verify menu item exists and belongs to tenant
    const existing = await this.menuRepo.findById(id);

    if (!existing || existing.tenant_id !== tenantId) {
      return {
        success: false,
        message: 'Menu item not found or access denied',
      };
    }

    if (existing.is_system) {
      return {
        success: false,
        message: 'Cannot modify system menu items',
      };
    }

    // Validate input
    const errors = await this.validateMenuItem(input, tenantId, id);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      const updates: Partial<MenuItem> = {
        ...input,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };

      const result = await this.menuRepo.update(id, updates);

      return { success: true, data: result };
    } catch (error) {
      console.error('Error updating menu item:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a menu item (soft delete)
   */
  async deleteMenuItem(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult<void>> {
    // Verify menu item exists and belongs to tenant
    const existing = await this.menuRepo.findById(id);

    if (!existing || existing.tenant_id !== tenantId) {
      return {
        success: false,
        message: 'Menu item not found or access denied',
      };
    }

    if (existing.is_system) {
      return {
        success: false,
        message: 'Cannot delete system menu items',
      };
    }

    // Check for children
    const children = await this.menuRepo.findAll({
      select: 'id',
      filters: {
        parent_id: { operator: 'eq', value: id },
        deleted_at: { operator: 'isEmpty', value: true },
      },
    });

    if (children.data && children.data.length > 0) {
      return {
        success: false,
        message: 'Cannot delete menu item with children. Delete children first.',
      };
    }

    try {
      await this.menuRepo.delete(id);

      await this.auditService.logAuditEvent('delete', 'menu_item', id, {
        deleted_by: userId,
        tenant_id: tenantId,
      });

      return { success: true, message: 'Menu item deleted successfully' };
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Toggle menu item visibility
   */
  async toggleVisibility(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult> {
    const existing = await this.menuRepo.findById(id);

    if (!existing || existing.tenant_id !== tenantId) {
      return {
        success: false,
        message: 'Menu item not found or access denied',
      };
    }

    return this.updateMenuItem(
      id,
      { is_visible: !existing.is_visible },
      tenantId,
      userId
    );
  }

  /**
   * Reorder menu items
   */
  async reorderMenuItems(
    items: Array<{ id: string; sort_order: number }>,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult<void>> {
    try {
      // Verify all items belong to tenant
      for (const item of items) {
        const existing = await this.menuRepo.findById(item.id);

        if (!existing || existing.tenant_id !== tenantId) {
          return {
            success: false,
            message: `Menu item ${item.id} not found or access denied`,
          };
        }
      }

      // Update sort orders
      for (const item of items) {
        await this.menuRepo.update(item.id, {
          sort_order: item.sort_order,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        });
      }

      // TODO: Update audit log when 'reorder' action is supported
      // await this.auditService.logAuditEvent('update', 'menu_items', tenantId, {
      //   items: items.map(i => ({ id: i.id, sort_order: i.sort_order })),
      //   updated_by: userId,
      // });

      return { success: true, message: 'Menu items reordered successfully' };
    } catch (error) {
      console.error('Error reordering menu items:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Move menu item to new parent
   */
  async moveMenuItem(
    id: string,
    newParentId: string | null,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult> {
    const existing = await this.menuRepo.findById(id);

    if (!existing || existing.tenant_id !== tenantId) {
      return {
        success: false,
        message: 'Menu item not found or access denied',
      };
    }

    // Get next sort order in new parent
    const siblings = await this.menuRepo.findAll({
      select: 'sort_order',
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        parent_id: newParentId
          ? { operator: 'eq', value: newParentId }
          : { operator: 'isEmpty', value: true },
        deleted_at: { operator: 'isEmpty', value: true },
      },
      order: { column: 'sort_order', ascending: false },
    });

    const sortOrder = siblings.data && siblings.data.length > 0 ? siblings.data[0].sort_order + 10 : 10;

    return this.updateMenuItem(
      id,
      { parent_id: newParentId, sort_order: sortOrder },
      tenantId,
      userId
    );
  }

  /**
   * Duplicate a menu item
   */
  async duplicateMenuItem(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult> {
    const existing = await this.menuRepo.findById(id);

    if (!existing || existing.tenant_id !== tenantId) {
      return {
        success: false,
        message: 'Menu item not found or access denied',
      };
    }

    // Create duplicate with modified code
    const duplicateInput: CreateMenuItemInput = {
      parent_id: existing.parent_id,
      code: `${existing.code}_copy`,
      label: `${existing.label} (Copy)`,
      path: `${existing.path}_copy`,
      icon: existing.icon,
      section: existing.section,
      permission_key: existing.permission_key,
      feature_key: existing.feature_key,
      badge_text: existing.badge_text,
      badge_variant: existing.badge_variant,
      description: existing.description,
      is_visible: existing.is_visible,
      metadata: existing.metadata,
    };

    return this.createMenuItem(duplicateInput, tenantId, userId);
  }

  /**
   * Bulk update menu items
   */
  async bulkUpdateMenuItems(
    updates: Array<{ id: string; data: UpdateMenuItemInput }>,
    tenantId: string,
    userId: string
  ): Promise<MenuManagementResult<void>> {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const update of updates) {
      const result = await this.updateMenuItem(update.id, update.data, tenantId, userId);
      results.push({
        id: update.id,
        success: result.success,
        error: result.message,
      });
    }

    const failedCount = results.filter(r => !r.success).length;

    if (failedCount > 0) {
      return {
        success: false,
        message: `${failedCount} of ${updates.length} updates failed`,
      };
    }

    return {
      success: true,
      message: `Successfully updated ${updates.length} menu items`,
    };
  }

  /**
   * Get menu item by code
   */
  async getMenuItemByCode(
    code: string,
    tenantId: string
  ): Promise<MenuItem | null> {
    const items = await this.menuRepo.findAll({
      select: '*',
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        code: { operator: 'eq', value: code },
        deleted_at: { operator: 'isEmpty', value: true },
      },
    });

    return items.data && items.data.length > 0 ? items.data[0] : null;
  }
}
