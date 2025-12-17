import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { RequestContext } from '@/lib/server/context';

export interface UserProfile {
  id: string;
  user_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  raw_user_meta_data?: any;
  user_metadata?: any;
  last_sign_in_at?: string;
  created_at?: string;
}

export interface IUserAdapter {
  fetchTenantUsers(tenantId: string): Promise<UserProfile[]>;
  fetchUserProfiles(tenantId: string): Promise<UserProfile[]>;
}

/**
 * User Adapter
 *
 * Handles all auth user data access via RPC functions.
 * This adapter abstracts away Supabase Auth user queries from repositories.
 */
@injectable()
export class UserAdapter implements IUserAdapter {
  private supabase: SupabaseClient | null = null;
  private context: RequestContext = {} as RequestContext;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  /**
   * Fetch user profiles using get_user_profiles RPC
   * This requires user IDs, so we get them from tenant_users first
   */
  async fetchUserProfiles(tenantId: string): Promise<UserProfile[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // First, get user IDs for this tenant
      const { data: tenantUsers, error: tenantError } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', tenantId);

      if (tenantError) {
        console.error('[UserAdapter] Error fetching tenant users:', tenantError);
        return [];
      }

      if (!tenantUsers || tenantUsers.length === 0) {
        console.log('[UserAdapter] No users found for tenant');
        return [];
      }

      const userIds = tenantUsers.map(tu => tu.user_id);

      // Now fetch user profiles with those IDs
      const { data: userProfiles, error: profilesError } = await supabase
        .rpc('get_user_profiles', { user_ids: userIds });

      if (profilesError) {
        console.error('[UserAdapter] Error fetching user profiles:', profilesError);
        return [];
      }

      console.log(`[UserAdapter] Got ${userProfiles?.length || 0} user profiles from get_user_profiles RPC`);
      return userProfiles || [];
    } catch (error) {
      console.error('[UserAdapter] get_user_profiles RPC failed:', error);
      return [];
    }
  }

  /**
   * Fetch tenant users using get_tenant_users RPC
   * Fallback method if get_user_profiles is not available
   */
  async fetchTenantUsers(tenantId: string): Promise<UserProfile[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data: rpcUsers, error: rpcError } = await supabase
        .rpc('get_tenant_users', { p_tenant_id: tenantId });

      if (rpcError) {
        console.error('[UserAdapter] Error fetching tenant users:', rpcError);
        return [];
      }

      console.log(`[UserAdapter] Got ${rpcUsers?.length || 0} users from get_tenant_users RPC`);
      return rpcUsers || [];
    } catch (error) {
      console.error('[UserAdapter] get_tenant_users RPC failed:', error);
      return [];
    }
  }

  /**
   * Fetch users with automatic fallback
   * Tries get_user_profiles first, falls back to get_tenant_users
   */
  async fetchUsers(tenantId: string): Promise<UserProfile[]> {
    // Try get_user_profiles first
    let users = await this.fetchUserProfiles(tenantId);

    // Fallback to get_tenant_users if no results
    if (users.length === 0) {
      console.log('[UserAdapter] Falling back to get_tenant_users');
      users = await this.fetchTenantUsers(tenantId);
    }

    return users;
  }
}
