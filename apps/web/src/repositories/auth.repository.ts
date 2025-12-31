import { injectable, inject } from 'inversify';
import type { AuthError, AuthResponse } from '@supabase/supabase-js';

import type { IAuthAdapter } from '@/adapters/auth.adapter';
import { TYPES } from '@/lib/types';

export interface IAuthRepository {
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
  getUser(): ReturnType<IAuthAdapter['getUser']>;
  getAdminRole(): ReturnType<IAuthAdapter['getAdminRole']>;
  refreshSession(): ReturnType<IAuthAdapter['refreshSession']>;
  onAuthStateChange(callback: (event: string, session: any) => void): () => void;
}

@injectable()
export class AuthRepository implements IAuthRepository {
  constructor(@inject(TYPES.IAuthAdapter) private adapter: IAuthAdapter) {}

  signIn(email: string, password: string) {
    return this.adapter.signIn(email, password);
  }

  resetPasswordForEmail(email: string, redirectTo: string) {
    return this.adapter.resetPasswordForEmail(email, redirectTo);
  }

  updatePassword(password: string) {
    return this.adapter.updatePassword(password);
  }

  signUp(email: string, password: string, profile: Record<string, any> = {}) {
    return this.adapter.signUp(email, password, profile);
  }

  signUpMember(email: string, password: string, firstName: string, lastName: string) {
    return this.adapter.signUpMember(email, password, firstName, lastName);
  }

  deleteUser(userId: string) {
    return this.adapter.deleteUser(userId);
  }

  searchPublicTenants(query: string) {
    return this.adapter.searchPublicTenants(query);
  }

  completeMemberRegistration(params: { userId: string; tenantId: string; firstName: string; lastName: string }) {
    return this.adapter.completeMemberRegistration(params);
  }

  handleNewTenantRegistration(params: { userId: string; churchName: string; subdomain: string; address: string; contactNumber: string; churchEmail: string; website: string | null }) {
    return this.adapter.handleNewTenantRegistration(params);
  }

  signOut() {
    return this.adapter.signOut();
  }

  // Updated to use getUser() instead of getSession() for security
  getUser() {
    return this.adapter.getUser();
  }

  getAdminRole() {
    return this.adapter.getAdminRole();
  }

  refreshSession() {
    return this.adapter.refreshSession();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.adapter.onAuthStateChange(callback);
  }
}
