/**
 * Auth Utils
 *
 * Provides convenient authentication utilities
 * Follows architectural pattern: Utility → Service → Repository → Adapter → Supabase
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { checkSuperAdmin as checkSuperAdminHelper } from '@/lib/rbac/permissionHelpers';
import type { User } from '@supabase/supabase-js';

export const authUtils = {
  getUser: async (): Promise<User | null> => {
    try {
      // Get user via service layer
      const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
      const authResult = await authService.checkAuthentication();

      if (!authResult.authorized || !authResult.user) {
        return null;
      }

      return authResult.user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  /**
   * Check if current user is a super admin
   * Uses the centralized permissionHelpers method
   */
  checkSuperAdmin: async (): Promise<{ isAuthorized: boolean; user: User | null }> => {
    try {
      const user = await authUtils.getUser();

      if (!user) {
        return { isAuthorized: false, user: null };
      }

      // Use centralized permission helper
      const isSuperAdmin = await checkSuperAdminHelper();

      return {
        isAuthorized: isSuperAdmin,
        user
      };
    } catch (error) {
      console.error('Error checking super admin:', error);
      return { isAuthorized: false, user: null };
    }
  }
};

// Export as named function for convenience
export async function checkSuperAdmin(): Promise<{ isAuthorized: boolean; user: User | null }> {
  return authUtils.checkSuperAdmin();
}