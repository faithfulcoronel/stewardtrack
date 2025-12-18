import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { AuthError, AuthResponse } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

interface IAuthAdapter {
  signIn(email: string, password: string): Promise<AuthResponse>;
  resetPasswordForEmail(email: string, redirectTo: string): Promise<{ error: AuthError | null }>;
  updatePassword(password: string): Promise<{ error: AuthError | null }>;
  signUp(email: string, password: string, profile?: Record<string, any>): Promise<AuthResponse>;
  signUpMember(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse>;
  deleteUser(userId: string): Promise<{ error: AuthError | null }>;
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
    // Admin operation - requires service role
    const supabase = await this.getServiceClient();
    return supabase.auth.admin.deleteUser(userId);
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

  async getUser() {
    const supabase = await this.getServerClient();
    return supabase.auth.getUser();
  }

  /**
   * Get the current user's admin role using centralized RPC
   * Returns one of: super_admin, tenant_admin, staff, member, or null
   */
  async getAdminRole(): Promise<'super_admin' | 'tenant_admin' | 'staff' | 'member' | null> {
    const supabase = await this.getServerClient();
    const { data, error } = await supabase.rpc('get_user_admin_role');

    if (error) {
      console.error('[AuthAdapter] get_user_admin_role RPC error:', error);
      return null;
    }

    return data as 'super_admin' | 'tenant_admin' | 'staff' | 'member' | null;
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
