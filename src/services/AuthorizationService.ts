import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IAuthRepository } from '@/repositories/auth.repository';
import type { IUserRoleManagementAdapter } from '@/adapters/userRoleManagement.adapter';

export interface AuthorizationResult {
  authorized: boolean;
  userId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * AuthorizationService
 *
 * Handles authorization checks for protected routes.
 * Uses existing UserRoleManagementAdapter for role checks.
 */
@injectable()
export class AuthorizationService {
  constructor(
    @inject(TYPES.IAuthRepository) private authRepository: IAuthRepository,
    @inject(TYPES.IUserRoleManagementAdapter) private userRoleAdapter: IUserRoleManagementAdapter
  ) {}

  /**
   * Check if user is authenticated
   */
  async checkAuthentication(): Promise<AuthorizationResult> {
    const { data, error } = await this.authRepository.getUser();

    if (error || !data.user) {
      return {
        authorized: false,
        error: 'Unauthorized',
        statusCode: 401,
      };
    }

    return {
      authorized: true,
      userId: data.user.id,
    };
  }

  /**
   * Check if user has admin role
   */
  async checkAdminRole(userId: string): Promise<AuthorizationResult> {
    try {
      const isAdmin = await this.userRoleAdapter.isAdmin(userId);

      if (!isAdmin) {
        return {
          authorized: false,
          userId,
          error: 'Forbidden: Admin access required',
          statusCode: 403,
        };
      }

      return {
        authorized: true,
        userId,
      };
    } catch (_error) {
      return {
        authorized: false,
        userId,
        error: 'Failed to check admin role',
        statusCode: 500,
      };
    }
  }

  /**
   * Combined check for authentication and admin role
   */
  async requireAdmin(): Promise<AuthorizationResult> {
    // First check authentication
    const authResult = await this.checkAuthentication();
    if (!authResult.authorized) {
      return authResult;
    }

    // Then check admin role
    return this.checkAdminRole(authResult.userId!);
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(userId: string, permission: string, tenantId?: string): Promise<AuthorizationResult> {
    try {
      const canPerform = await this.userRoleAdapter.canUser(permission, tenantId);

      if (!canPerform) {
        return {
          authorized: false,
          userId,
          error: `Forbidden: Required permission: ${permission}`,
          statusCode: 403,
        };
      }

      return {
        authorized: true,
        userId,
      };
    } catch (_error) {
      return {
        authorized: false,
        userId,
        error: 'Failed to check user permission',
        statusCode: 500,
      };
    }
  }

  /**
   * Combined check for authentication and specific permission
   */
  async requirePermission(permission: string, tenantId?: string): Promise<AuthorizationResult> {
    // First check authentication
    const authResult = await this.checkAuthentication();
    if (!authResult.authorized) {
      return authResult;
    }

    // Then check permission
    return this.checkPermission(authResult.userId!, permission, tenantId);
  }

  /**
   * Combined check for authentication and super admin role
   */
  async requireSuperAdmin(): Promise<AuthorizationResult> {
    const authResult = await this.checkAuthentication();
    if (!authResult.authorized) {
      return authResult;
    }

    const adminRole = await this.authRepository.getAdminRole();
    if (adminRole !== 'super_admin') {
      return {
        authorized: false,
        userId: authResult.userId,
        error: 'Forbidden: Super admin access required',
        statusCode: 403
      };
    }

    return {
      authorized: true,
      userId: authResult.userId
    };
  }
}
