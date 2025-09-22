import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { tenantUtils } from '../utils/tenantUtils';
import { handleSupabaseError } from '../utils/supabaseErrorHandler';
import { handleError } from '../utils/errorHandler';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { TYPES } from '../lib/types';
import type { AuditService } from '../services/AuditService';
import { User } from '../models/user.model';

export type IAuthUserAdapter = IBaseAdapter<User>;

@injectable()
export class AuthUserAdapter
  extends BaseAdapter<User>
  implements IAuthUserAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }

  // Fetch users for the current tenant using RPC
  public override async fetch(
    options: QueryOptions = {}
  ): Promise<{ data: User[]; count: number | null }> {
    try {
      if (options.enabled === false) {
        return { data: [], count: null };
      }

      const tenantId = await this.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context found');
      }

      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase.rpc('get_tenant_users', {
        p_tenant_id: tenantId,
      });

      if (error) {
        handleSupabaseError(error);
      }

      const users = (data || []) as User[];
      return { data: users, count: users.length };
    } catch (error) {
      throw handleError(error, { context: 'authUser.fetch', options });
    }
  }

  // Fetch single user by id
  public override async fetchById(
    id: string,
    _options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<User | null> {
    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context found');
      }

      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase.rpc('get_tenant_users', {
        p_tenant_id: tenantId,
      });

      if (error) {
        handleSupabaseError(error);
      }

      const user = (data || []).find((u: any) => u.id === id) || null;
      return user as User | null;
    } catch (error) {
      throw handleError(error, { context: 'authUser.fetchById', id });
    }
  }

  // Create a new user via Supabase Auth and setup roles/tenant
  public override async create(data: Partial<User>): Promise<User> {
    try {
      const tenantId = await this.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context found');
      }

      const supabase = await this.getSupabaseClient();
      
      // Sign up user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email!,
        password: data.password!,
        options: {
          data: {
            first_name: (data as any).first_name || '',
            last_name: (data as any).last_name || '',
          },
        },
      });

      if (signUpError || !signUpData.user) {
        if (signUpError) handleSupabaseError(signUpError as any);
        throw signUpError || new Error('Failed to sign up user');
      }

      const userId = signUpData.user.id;
      const { data: currentUserData } = await supabase.auth.getUser();
      const currentUser = currentUserData.user?.id;

      try {
        // Fetch role IDs
        const rolesToFetch = ['member', ...((data as any).roles || [])];
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('id, name')
          .in('name', rolesToFetch);

        if (rolesError) throw rolesError;

        const roleIds = roles?.map(r => r.id) || [];

        if (roleIds.length) {
          const userRoles = roleIds.map(roleId => ({
            user_id: userId,
            role_id: roleId,
            created_by: currentUser,
          }));

          const { error: urError } = await supabase
            .from('user_roles')
            .insert(userRoles);

          if (urError) throw urError;
        }

        const { error: tuError } = await supabase.from('tenant_users').insert([
          {
            tenant_id: tenantId,
            user_id: userId,
            admin_role: (data as any).admin_role || 'member',
            member_id: (data as any).member_id || null,
            created_by: currentUser,
          },
        ]);

        if (tuError) throw tuError;
      } catch (insertError) {
        await supabase.from('tenant_users').delete().eq('user_id', userId);
        await supabase.from('user_roles').delete().eq('user_id', userId);
        await supabase.rpc('delete_user', { user_id: userId });
        handleSupabaseError(insertError as any);
      }

      const { data: userData, error: fetchError } = await supabase.rpc('get_tenant_user', {
        p_tenant_id: tenantId,
        p_user_id: userId,
      });

      if (fetchError) {
        handleSupabaseError(fetchError);
      }

      const user = (userData as any)?.[0] as User;
      await this.auditService.logAuditEvent('create', 'user', user.id, user);
      return user;
    } catch (error) {
      throw handleError(error, { context: 'authUser.create', data });
    }
  }

  // Update user via manage_user RPC
  public override async update(id: string, data: Partial<User>): Promise<User> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data: updated, error } = await supabase.rpc('manage_user', {
        operation: 'update',
        target_user_id: id,
        user_data: data,
      });

      if (error) {
        handleSupabaseError(error);
      }

      const user = (updated as any) as User;
      await this.auditService.logAuditEvent('update', 'user', user.id, user);
      return user;
    } catch (error) {
      throw handleError(error, { context: 'authUser.update', id, data });
    }
  }

  // Delete user via delete_user RPC
  public override async delete(id: string): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient();
      const { error } = await supabase.rpc('delete_user', { user_id: id });
      if (error) {
        handleSupabaseError(error);
      }

      await this.auditService.logAuditEvent('delete', 'user', id, { id });
    } catch (error) {
      throw handleError(error, { context: 'authUser.delete', id });
    }
  }
}