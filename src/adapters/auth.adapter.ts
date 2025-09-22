import 'reflect-metadata';
import { injectable } from 'inversify';
import { AuthError, AuthResponse } from '@supabase/supabase-js';
import { createClient } from '../../utils/supabase/client';
import { createClient as createServerClient } from '../../utils/supabase/server';

interface IAuthAdapter {
  signIn(email: string, password: string): Promise<AuthResponse>;
  resetPasswordForEmail(email: string, redirectTo: string): Promise<{ error: AuthError | null }>;
  updatePassword(password: string): Promise<{ error: AuthError | null }>;
  signUp(email: string, password: string, profile?: Record<string, any>): Promise<AuthResponse>;
  signUpMember(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse>;
  searchPublicTenants(query: string): Promise<{ data: any[] | null; error: any }>;
  completeMemberRegistration(params: { userId: string; tenantId: string; firstName: string; lastName: string }): Promise<{ data: any; error: any }>;
  handleNewTenantRegistration(params: { userId: string; churchName: string; subdomain: string; address: string; contactNumber: string; churchEmail: string; website: string | null }): Promise<{ error: any }>;
  signOut(): Promise<{ error: AuthError | null }>;
  getUser(): Promise<any>;
  refreshSession(): Promise<any>;
  onAuthStateChange(callback: (event: string, session: any) => void): () => void;
}

@injectable()
export class AuthAdapter implements IAuthAdapter {
  // Reuse one browser client instance so auth state listeners observe sign-in events
  private browserClient: ReturnType<typeof createClient> | null = null;

  private getBrowserClient() {
    if (!this.browserClient) {
      this.browserClient = createClient();
    }
    return this.browserClient;
  }

  private async getSupabaseClient() {
    // Use client-side client for browser operations
    if (typeof window !== 'undefined') {
      return this.getBrowserClient();
    }
    // Use server-side client for server operations
    return await createServerClient();
  }

  async signIn(email: string, password: string) {
    const supabase = await this.getSupabaseClient();
    return supabase.auth.signInWithPassword({ email, password });
  }

  async resetPasswordForEmail(email: string, redirectTo: string) {
    const supabase = await this.getSupabaseClient();
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async updatePassword(password: string) {
    const supabase = await this.getSupabaseClient();
    return supabase.auth.updateUser({ password });
  }

  async signUp(email: string, password: string, profile: Record<string, any> = {}) {
    const supabase = await this.getSupabaseClient();
    return supabase.auth.signUp({ email, password, options: { data: profile } });
  }

  async signUpMember(email: string, password: string, firstName: string, lastName: string) {
    return this.signUp(email, password, { first_name: firstName, last_name: lastName });
  }

  async searchPublicTenants(query: string) {
    const supabase = await this.getSupabaseClient();
    return await supabase
      .from('public_tenants')
      .select('id, name')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10);
  }

  async completeMemberRegistration(params: { userId: string; tenantId: string; firstName: string; lastName: string }) {
    const supabase = await this.getSupabaseClient();
    return await supabase.rpc('complete_member_registration', {
      p_user_id: params.userId,
      p_tenant_id: params.tenantId,
      p_first_name: params.firstName,
      p_last_name: params.lastName,
    });
  }

  async handleNewTenantRegistration(params: { userId: string; churchName: string; subdomain: string; address: string; contactNumber: string; churchEmail: string; website: string | null }) {
    const supabase = await this.getSupabaseClient();
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
    const supabase = await this.getSupabaseClient();
    return supabase.auth.signOut();
  }

  async getUser() {
    const supabase = await this.getSupabaseClient();
    return supabase.auth.getUser();
  }

  async refreshSession() {
    const supabase = await this.getSupabaseClient();
    return supabase.auth.refreshSession();
  }

  onAuthStateChange(callback: (event: string, session: any) => void): () => void {
    // For client-side only
    if (typeof window !== 'undefined') {
      const supabase = this.getBrowserClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

      return () => {
        subscription.unsubscribe();
      };
    }

    // Return no-op for server-side
    return () => {};
  }
}

export type { IAuthAdapter };
