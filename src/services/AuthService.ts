import 'server-only';
import { injectable, inject } from 'inversify';
import type { AuthError, AuthResponse } from '@supabase/supabase-js';
import type { IAuthRepository } from '@/repositories/auth.repository';
import { TYPES } from '@/lib/types';

export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResponse>;
  resetPasswordForEmail(email: string, redirectTo: string): Promise<{ error: AuthError | null }>;
  updatePassword(password: string): Promise<{ error: AuthError | null }>;
  signUp(email: string, password: string, profile?: Record<string, any>): Promise<AuthResponse>;
  signUpMember(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse>;
  searchPublicTenants(query: string): Promise<{ data: any[] | null; error: any }>;
  completeMemberRegistration(params: { userId: string; tenantId: string; firstName: string; lastName: string }): Promise<{ data: any; error: any }>; 
  handleNewTenantRegistration(params: { userId: string; churchName: string; subdomain: string; address: string; contactNumber: string; churchEmail: string; website: string | null }): Promise<{ error: any }>;
  signOut(): Promise<{ error: AuthError | null }>;
  getUser(): ReturnType<IAuthRepository['getUser']>;
  refreshSession(): ReturnType<IAuthRepository['refreshSession']>;
  onAuthStateChange(callback: (event: string, session: any) => void): () => void;
}

@injectable()
export class AuthServiceImpl implements AuthService {
  constructor(@inject(TYPES.IAuthRepository) private repository: IAuthRepository) {}

  signIn(email: string, password: string) {
    return this.repository.signIn(email, password);
  }

  resetPasswordForEmail(email: string, redirectTo: string) {
    return this.repository.resetPasswordForEmail(email, redirectTo);
  }

  updatePassword(password: string) {
    return this.repository.updatePassword(password);
  }

  signUp(email: string, password: string, profile: Record<string, any> = {}) {
    return this.repository.signUp(email, password, profile);
  }

  signUpMember(email: string, password: string, firstName: string, lastName: string) {
    return this.repository.signUpMember(email, password, firstName, lastName);
  }

  searchPublicTenants(query: string) {
    return this.repository.searchPublicTenants(query);
  }

  completeMemberRegistration(params: { userId: string; tenantId: string; firstName: string; lastName: string }) {
    return this.repository.completeMemberRegistration(params);
  }

  handleNewTenantRegistration(params: { userId: string; churchName: string; subdomain: string; address: string; contactNumber: string; churchEmail: string; website: string | null }) {
    return this.repository.handleNewTenantRegistration(params);
  }

  signOut() {
    return this.repository.signOut();
  }

  // Updated to use getUser() instead of getSession() for security
  getUser() {
    return this.repository.getUser();
  }

  refreshSession() {
    return this.repository.refreshSession();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.repository.onAuthStateChange(callback);
  }
}