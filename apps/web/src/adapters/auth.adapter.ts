import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { AuthError, AuthResponse } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { getCachedUser, getCachedAdminRole, isCachedSuperAdmin } from '@/lib/auth/authCache';
import { UnauthorizedError } from '@/utils/errorHandler';

interface IAuthAdapter {
  signIn(email: string, password: string): Promise<AuthResponse>;
  resetPasswordForEmail(email: string, redirectTo: string): Promise<{ error: AuthError | null }>;
  updatePassword(password: string): Promise<{ error: AuthError | null }>;
  signUp(email: string, password: string, profile?: Record<string, any>): Promise<AuthResponse>;
  signUpMember(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse>;
  deleteUser(userId: string): Promise<{ error: AuthError | null }>;
  getUserById(userId: string): Promise<{ data: { user: any } | null; error: AuthError | null }>;
  searchPublicTenants(query: string): Promise<{ data: any[] | null; error: any }>;
  completeMemberRegistration(params: { userId: string; tenantId: string; firstName: string; lastName: string }): Promise<{ data: any; error: any }>;
  handleNewTenantRegistration(params: { userId: string; churchName: string; subdomain: string; address: string; contactNumber: string; churchEmail: string; website: string | null }): Promise<{ error: any }>;
  signOut(): Promise<{ error: AuthError | null }>;
  getUser(): Promise<any>;
  getAdminRole(): Promise<'super_admin' | 'tenant_admin' | 'staff' | 'member' | null>;
  refreshSession(): Promise<any>;
  onAuthStateChange(callback: (event: string, session: any) => void): () => void;
}

@injectable()
export class AuthAdapter implements IAuthAdapter {
  /**
   * Get server client for user-scoped auth operations
   * Uses the user's session context from cookies
   */
  private async getServerClient() {
    return await createSupabaseServerClient();
  }

  /**
   * Get service role client for admin operations
   * Has elevated privileges to bypass RLS and perform admin tasks
   */
  private async getServiceClient() {
    return await getSupabaseServiceClient();
  }

  async signIn(email: string, password: string) {
    const supabase = await this.getServerClient();
    return supabase.auth.signInWithPassword({ email, password });
  }

  async resetPasswordForEmail(email: string, redirectTo: string) {
    const supabase = await this.getServerClient();
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async updatePassword(password: string) {
    const supabase = await this.getServerClient();
    return supabase.auth.updateUser({ password });
  }

  async signUp(email: string, password: string, profile: Record<string, any> = {}) {
    const supabase = await this.getServerClient();
    return supabase.auth.signUp({ email, password, options: { data: profile } });
  }

  async signUpMember(email: string, password: string, firstName: string, lastName: string) {
    return this.signUp(email, password, { first_name: firstName, last_name: lastName });
  }

  async deleteUser(userId: string) {
    // Admin operation - requires super admin privileges
    const isSuperAdmin = await isCachedSuperAdmin();
    if (!isSuperAdmin) {
      throw new UnauthorizedError('Deleting users requires super admin privileges');
    }

    const supabase = await this.getServiceClient();
    return supabase.auth.admin.deleteUser(userId);
  }

  /**
   * Get a user by ID using admin API
   * This requires service role key access
   */
  async getUserById(userId: string): Promise<{ data: { user: any } | null; error: AuthError | null }> {
    const supabase = await this.getServiceClient();
    return supabase.auth.admin.getUserById(userId);
  }

  async searchPublicTenants(query: string) {
    const supabase = await this.getServerClient();
    return await supabase
      .from('public_tenants')
      .select('id, name')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10);
  }

  async completeMemberRegistration(params: { userId: string; tenantId: string; firstName: string; lastName: string }) {
    // RPC function - may need service role if it bypasses RLS
    const supabase = await this.getServiceClient();
    return await supabase.rpc('complete_member_registration', {
      p_user_id: params.userId,
      p_tenant_id: params.tenantId,
      p_first_name: params.firstName,
      p_last_name: params.lastName,
    });
  }

  async handleNewTenantRegistration(params: { userId: string; churchName: string; subdomain: string; address: string; contactNumber: string; churchEmail: string; website: string | null }) {
    // RPC function - may need service role if it bypasses RLS
    const supabase = await this.getServiceClient();
    return await supabase.rpc('handle_new_tenant_registration', {
      p_user_id: params.userId,
      p_tenant_name: params.churchName,
      p_tenant_subdomain: params.subdomain,
      p_tenant_address: params.address,
      p_tenant_contact: params.contactNumber,
      p_tenant_email: params.churchEmail,
      p_tenant_website: params.website,
    });
  }

  async signOut() {
    const supabase = await this.getServerClient();
    return supabase.auth.signOut();
  }

  /**
   * Get the current user with request-level caching.
   * Uses cached auth to prevent redundant Supabase Auth API calls.
   */
  async getUser() {
    const { user, error } = await getCachedUser();
    return {
      data: { user },
      error: error ? { message: error.message, status: 500 } : null,
    };
  }

  /**
   * Get the current user's admin role using cached RPC.
   * Uses request-level caching to prevent redundant database queries.
   * Returns one of: super_admin, tenant_admin, staff, member, or null
   */
  async getAdminRole(): Promise<'super_admin' | 'tenant_admin' | 'staff' | 'member' | null> {
    const { role } = await getCachedAdminRole();
    return role;
  }

  async refreshSession() {
    const supabase = await this.getServerClient();
    return supabase.auth.refreshSession();
  }

  onAuthStateChange(_callback: (event: string, session: any) => void): () => void {
    // This method is not applicable for server-only adapter
    // Auth state changes should be handled on the client side
    console.warn('onAuthStateChange called on server-only AuthAdapter - this is a no-op');
    return () => {};
  }
}

export type { IAuthAdapter };
