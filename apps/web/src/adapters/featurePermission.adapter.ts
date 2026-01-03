/**
 * Feature Permission Adapter
 *
 * Handles data access for feature_permissions table (GLOBAL TABLE - no tenant_id)
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
  FeaturePermission,
  PermissionRoleTemplate,
  DbFeaturePermissionWithTemplates
} from '@/models/featurePermission.model';
import type { IBaseAdapter } from '@/lib/repository/adapter.interfaces';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

export interface IFeaturePermissionAdapter extends IBaseAdapter<FeaturePermission> {
  getByFeatureId(featureId: string): Promise<FeaturePermission[]>;
  getByCode(permissionCode: string): Promise<FeaturePermission | null>;
  getWithTemplates(featureId: string): Promise<DbFeaturePermissionWithTemplates[]>;
  getRoleTemplates(featurePermissionId: string): Promise<PermissionRoleTemplate[]>;
  isPermissionCodeAvailable(permissionCode: string, excludeFeatureId?: string): Promise<boolean>;
  /** Get role templates with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY */
  getRoleTemplatesWithElevatedAccess(featurePermissionId: string): Promise<PermissionRoleTemplate[]>;
}

@injectable()
export class FeaturePermissionAdapter extends BaseAdapter<FeaturePermission> implements IFeaturePermissionAdapter {
  protected tableName = 'feature_permissions';
  protected defaultSelect = '*';

  /**
   * Override create to handle global table (no tenant_id)
   * SECURITY: Only super admins can create feature permissions
   */
  async create(data: Partial<FeaturePermission>): Promise<FeaturePermission> {
    try {
      console.log('[DEBUG ADAPTER] create() called with data:', JSON.stringify(data, null, 2));

      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      console.log('[DEBUG ADAPTER] Calling get_user_admin_role RPC...');
      const { data: adminRole, error: rpcError } = await supabase.rpc('get_user_admin_role');
      console.log('[DEBUG ADAPTER] get_user_admin_role result:', { adminRole, error: rpcError });

      if (adminRole !== 'super_admin') {
        console.log('[DEBUG ADAPTER] Access denied - role is not super_admin');
        throw new Error('Access denied. Only super admins can create feature permissions.');
      }

      // Parse category and action from permission_code
      if (data.permission_code) {
        const [category, action] = data.permission_code.split(':');
        data.category = category;
        data.action = action;
        console.log('[DEBUG ADAPTER] Parsed category and action:', { category, action });
      }

      // Run pre-create hook
      console.log('[DEBUG ADAPTER] Running onBeforeCreate hook...');
      const processedData = await this.onBeforeCreate(data);
      console.log('[DEBUG ADAPTER] Processed data:', JSON.stringify(processedData, null, 2));

      // Create record (NO tenant_id filter - this is a global table)
      const userId = await this.getUserId();
      console.log('[DEBUG ADAPTER] Current userId:', userId);

      const insertData = {
        ...processedData,
        created_by: userId,
        updated_by: userId,
      };
      console.log('[DEBUG ADAPTER] Insert data:', JSON.stringify(insertData, null, 2));

      console.log('[DEBUG ADAPTER] Executing INSERT query...');
      const { data: created, error: createError } = await supabase
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      console.log('[DEBUG ADAPTER] Insert result:', { created, error: createError });

      if (createError || !created) {
        console.error('[DEBUG ADAPTER] Insert failed:', createError);
        throw new Error(createError?.message || 'Create failed');
      }

      const result = created as FeaturePermission;
      console.log('[DEBUG ADAPTER] Running onAfterCreate hook...');
      await this.onAfterCreate(result);
      console.log('[DEBUG ADAPTER] Feature permission created successfully:', result.id);

      return result;
    } catch (error: any) {
      console.error('[DEBUG ADAPTER] Error in create():', error);
      throw new Error(`Failed to create feature permission: ${error.message}`);
    }
  }

  /**
   * Override update to handle global table (no tenant_id)
   * SECURITY: Only super admins can update feature permissions
   */
  async update(
    id: string,
    data: Partial<FeaturePermission>,
    relations?: Record<string, string[]>,
    fieldsToRemove?: string[]
  ): Promise<FeaturePermission> {
    try {
      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can update feature permissions.');
      }

      // Parse category and action from permission_code if updated
      if (data.permission_code) {
        const [category, action] = data.permission_code.split(':');
        data.category = category;
        data.action = action;
      }

      let processedData = await this.onBeforeUpdate(id, data);

      if (fieldsToRemove) {
        const sanitized = { ...processedData };
        for (const field of fieldsToRemove) {
          delete (sanitized as any)[field];
        }
        processedData = sanitized;
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

      const result = updated as FeaturePermission;
      await this.onAfterUpdate(result);

      return result;
    } catch (error: any) {
      throw new Error(`Failed to update feature permission: ${error.message}`);
    }
  }

  /**
   * Override delete to handle global table (no tenant_id)
   * SECURITY: Only super admins can delete feature permissions
   */
  async delete(id: string): Promise<void> {
    try {
      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can delete feature permissions.');
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
      throw new Error(`Failed to delete feature permission: ${error.message}`);
    }
  }

  /**
   * Override fetchById to handle global table (no tenant_id, no deleted_at)
   * This table doesn't use soft deletes
   */
  async fetchById(id: string): Promise<FeaturePermission | null> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return data as FeaturePermission | null;
    } catch (error: any) {
      throw new Error(`Failed to fetch feature permission: ${error.message}`);
    }
  }

  /**
   * Get all permissions for a feature
   */
  async getByFeatureId(featureId: string): Promise<FeaturePermission[]> {
    try {
      console.log(`[PERMISSION ADAPTER] >> getByFeatureId() called with featureId: ${featureId}`);
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('feature_id', featureId)
        .order('display_order')
        .order('permission_code');

      console.log(`[PERMISSION ADAPTER] Query result:`, { featureId, count: data?.length || 0, error });
      if (data && data.length > 0) {
        console.log(`[PERMISSION ADAPTER] Found permissions:`, data.map((p: any) => ({
          id: p.id,
          permission_code: p.permission_code,
          display_name: p.display_name
        })));
      }

      if (error) {
        console.error(`[PERMISSION ADAPTER] Query error:`, error);
        throw new Error(error.message);
      }

      return (data || []) as unknown as FeaturePermission[];
    } catch (error: any) {
      throw new Error(`Failed to get permissions for feature: ${error.message}`);
    }
  }

  /**
   * Get permission by code
   */
  async getByCode(permissionCode: string): Promise<FeaturePermission | null> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('permission_code', permissionCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return data as FeaturePermission | null;
    } catch (error: any) {
      throw new Error(`Failed to get permission by code: ${error.message}`);
    }
  }

  /**
   * Get feature permissions with default role templates
   * Calls database function and maps result to expected format
   */
  async getWithTemplates(featureId: string): Promise<DbFeaturePermissionWithTemplates[]> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase.rpc('get_feature_permissions_with_templates', {
        p_feature_id: featureId
      });

      if (error) {
        throw new Error(error.message);
      }

      // Map database result to expected format
      const mapped = (data || []).map((row: any) => ({
        id: row.result_permission_id,
        permission_code: row.result_permission_code,
        display_name: row.result_display_name,
        description: row.result_description,
        category: row.result_category,
        action: row.result_action,
        is_required: row.result_is_required,
        role_templates: row.result_default_roles || []
      }));

      return mapped as any;
    } catch (error: any) {
      throw new Error(`Failed to get permissions with templates: ${error.message}`);
    }
  }

  /**
   * Get role templates for a specific feature permission
   */
  async getRoleTemplates(featurePermissionId: string): Promise<PermissionRoleTemplate[]> {
    try {
      console.log(`[ROLE TEMPLATE ADAPTER] >> getRoleTemplates() called with featurePermissionId: ${featurePermissionId}`);
      const supabase = await this.getSupabaseClient();

      console.log(`[ROLE TEMPLATE ADAPTER] Executing query on permission_role_templates...`);
      const { data, error } = await supabase
        .from('permission_role_templates')
        .select('*')
        .eq('feature_permission_id', featurePermissionId)
        .order('role_key');

      console.log(`[ROLE TEMPLATE ADAPTER] Query result:`, {
        featurePermissionId,
        count: data?.length || 0,
        error: error ? { code: error.code, message: error.message, details: error.details } : null
      });

      if (data && data.length > 0) {
        console.log(`[ROLE TEMPLATE ADAPTER] Found role templates:`, data.map((t: any) => ({
          id: t.id,
          role_key: t.role_key,
          is_recommended: t.is_recommended
        })));
      }

      if (error) {
        console.error(`[ROLE TEMPLATE ADAPTER] Query error:`, error);
        throw new Error(error.message);
      }

      return (data || []) as PermissionRoleTemplate[];
    } catch (error: any) {
      console.error(`[ROLE TEMPLATE ADAPTER] Exception:`, error);
      throw new Error(`Failed to get role templates: ${error.message}`);
    }
  }

  /**
   * Check if permission code is available
   * Calls database function
   */
  async isPermissionCodeAvailable(permissionCode: string, excludeFeatureId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase.rpc('is_permission_code_available', {
        p_permission_code: permissionCode,
        p_feature_id: excludeFeatureId || null
      });

      if (error) {
        throw new Error(error.message);
      }

      return data === true;
    } catch (error: any) {
      throw new Error(`Failed to check permission code availability: ${error.message}`);
    }
  }

  /**
   * Get role templates with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to get permission templates.
   */
  async getRoleTemplatesWithElevatedAccess(featurePermissionId: string): Promise<PermissionRoleTemplate[]> {
    try {
      console.log(`[ROLE TEMPLATE ADAPTER] >> getRoleTemplatesWithElevatedAccess() called with featurePermissionId: ${featurePermissionId}`);
      const supabase = await getSupabaseServiceClient();

      console.log(`[ROLE TEMPLATE ADAPTER] Executing query on permission_role_templates (elevated access)...`);
      const { data, error } = await supabase
        .from('permission_role_templates')
        .select('*')
        .eq('feature_permission_id', featurePermissionId)
        .order('role_key');

      console.log(`[ROLE TEMPLATE ADAPTER] Query result:`, {
        featurePermissionId,
        count: data?.length || 0,
        error: error ? { code: error.code, message: error.message, details: error.details } : null
      });

      if (data && data.length > 0) {
        console.log(`[ROLE TEMPLATE ADAPTER] Found role templates:`, data.map((t: any) => ({
          id: t.id,
          role_key: t.role_key,
          is_recommended: t.is_recommended
        })));
      }

      if (error) {
        console.error(`[ROLE TEMPLATE ADAPTER] Query error:`, error);
        throw new Error(error.message);
      }

      return (data || []) as PermissionRoleTemplate[];
    } catch (error: any) {
      console.error(`[ROLE TEMPLATE ADAPTER] Exception:`, error);
      throw new Error(`Failed to get role templates with elevated access: ${error.message}`);
    }
  }
}
