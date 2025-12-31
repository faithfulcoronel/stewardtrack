/**
 * Permission Role Template Adapter
 *
 * Handles data access for permission_role_templates table (GLOBAL TABLE - no tenant_id)
 * Follows CLAUDE_AI_GUIDELINES.md pattern for global tables:
 * - Overrides create/update/delete to check super_admin role
 * - Omits tenant_id filtering (table has no tenant_id column)
 *
 * Part of: Feature Creation with Surface ID & Permission Definition
 */

import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter } from './base.adapter';
import type {
  PermissionRoleTemplate,
  CreatePermissionRoleTemplateDto
} from '@/models/featurePermission.model';
import type { IBaseAdapter } from '@/lib/repository/adapter.interfaces';

export interface IPermissionRoleTemplateAdapter extends IBaseAdapter<PermissionRoleTemplate> {
  getByPermissionId(featurePermissionId: string): Promise<PermissionRoleTemplate[]>;
  deleteByPermissionId(featurePermissionId: string): Promise<void>;
}

@injectable()
export class PermissionRoleTemplateAdapter extends BaseAdapter<PermissionRoleTemplate> implements IPermissionRoleTemplateAdapter {
  protected tableName = 'permission_role_templates';
  protected defaultSelect = '*';

  /**
   * Override create to handle global table (no tenant_id)
   * SECURITY: Only super admins can create permission role templates
   */
  async create(data: Partial<PermissionRoleTemplate>): Promise<PermissionRoleTemplate> {
    try {
      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can create permission role templates.');
      }

      // Run pre-create hook
      const processedData = await this.onBeforeCreate(data);

      // Create record (NO tenant_id filter - this is a global table)
      const userId = await this.getUserId();
      const { data: created, error: createError } = await supabase
        .from(this.tableName)
        .insert({
          ...processedData,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (createError || !created) {
        throw new Error(createError?.message || 'Create failed');
      }

      const result = created as PermissionRoleTemplate;
      await this.onAfterCreate(result);

      return result;
    } catch (error: any) {
      throw new Error(`Failed to create permission role template: ${error.message}`);
    }
  }

  /**
   * Override update to handle global table (no tenant_id)
   * SECURITY: Only super admins can update permission role templates
   */
  async update(
    id: string,
    data: Partial<PermissionRoleTemplate>,
    relations?: Record<string, string[]>,
    fieldsToRemove?: string[]
  ): Promise<PermissionRoleTemplate> {
    try {
      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can update permission role templates.');
      }

      let processedData = await this.onBeforeUpdate(id, data);

      if (fieldsToRemove) {
        processedData = this.sanitizeData(processedData, fieldsToRemove);
      }

      // Update record (NO tenant_id filter - global table)
      const userId = await this.getUserId();
      const { data: updated, error: updateError } = await supabase
        .from(this.tableName)
        .update({
          ...processedData,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message || 'Update failed');
      }

      const result = updated as PermissionRoleTemplate;
      await this.onAfterUpdate(result);

      return result;
    } catch (error: any) {
      throw new Error(`Failed to update permission role template: ${error.message}`);
    }
  }

  /**
   * Override delete to handle global table (no tenant_id)
   * SECURITY: Only super admins can delete permission role templates
   */
  async delete(id: string): Promise<void> {
    try {
      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can delete permission role templates.');
      }

      await this.onBeforeDelete(id);

      // Hard delete (NO tenant_id filter - global table)
      const { error: deleteError } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await this.onAfterDelete(id);
    } catch (error: any) {
      throw new Error(`Failed to delete permission role template: ${error.message}`);
    }
  }

  /**
   * Get all role templates for a permission
   */
  async getByPermissionId(featurePermissionId: string): Promise<PermissionRoleTemplate[]> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('feature_permission_id', featurePermissionId)
        .order('role_key');

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as PermissionRoleTemplate[];
    } catch (error: any) {
      throw new Error(`Failed to get role templates for permission: ${error.message}`);
    }
  }

  /**
   * Delete all role templates for a permission
   * Used when deleting a feature permission
   */
  async deleteByPermissionId(featurePermissionId: string): Promise<void> {
    try {
      // Check admin role
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can delete permission role templates.');
      }

      const { error: deleteError } = await supabase
        .from(this.tableName)
        .delete()
        .eq('feature_permission_id', featurePermissionId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    } catch (error: any) {
      throw new Error(`Failed to delete role templates: ${error.message}`);
    }
  }

  /**
   * Helper method for sanitizing data
   */
  protected sanitizeData(data: Partial<PermissionRoleTemplate>, fieldsToRemove: string[]): Partial<PermissionRoleTemplate> {
    const sanitized = { ...data };
    for (const field of fieldsToRemove) {
      delete (sanitized as any)[field];
    }
    return sanitized;
  }
}
