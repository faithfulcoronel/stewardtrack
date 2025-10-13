import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkSuperAdmin as checkSuperAdminHelper } from '@/lib/rbac/permissionHelpers';

export const authUtils = {
  getUser: async () => {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  /**
   * Check if current user is a super admin
   * Uses the centralized permissionHelpers method
   */
  checkSuperAdmin: async (): Promise<{ isAuthorized: boolean; user: any | null }> => {
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
export async function checkSuperAdmin(): Promise<{ isAuthorized: boolean; user: any | null }> {
  return authUtils.checkSuperAdmin();
}