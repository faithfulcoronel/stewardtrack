import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { tenantUtils } from '@/utils/tenantUtils';

export interface RequestContext {
  userId?: string;
  tenantId?: string;
  roles?: string[];
}

export const defaultRequestContext: RequestContext = {};

interface UserOptions {
  redirectTo?: string;
}

export async function getCurrentUser(options: UserOptions = {}): Promise<User> {
  const redirectTo = options.redirectTo ?? '/login';
  const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
  const authResult = await authService.checkAuthentication();

  if (!authResult.authorized || !authResult.user) {
    redirect(redirectTo);
  }

  return authResult.user;
}

export async function getCurrentUserId(options: UserOptions = {}): Promise<string> {
  const user = await getCurrentUser(options);
  return user.id;
}

interface TenantOptions {
  optional?: boolean;
  redirectTo?: string;
}

export async function getCurrentTenantId(): Promise<string>;
export async function getCurrentTenantId(options: TenantOptions & { optional: true }): Promise<string | null>;
export async function getCurrentTenantId(options: TenantOptions = {}): Promise<string | null> {
  const redirectTo = options.redirectTo ?? '/unauthorized?reason=no_tenant';
  const tenantId = (await tenantUtils.getTenantId())?.trim() || null;

  if (!tenantId) {
    if (options.optional) {
      return null;
    }

    redirect(redirectTo);
  }

  return tenantId;
}
