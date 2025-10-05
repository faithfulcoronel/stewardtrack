import { createSupabaseServerClient } from '@/lib/supabase/server';

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

  checkSuperAdmin: async (): Promise<{ isAuthorized: boolean; user: any | null }> => {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return { isAuthorized: false, user: null };
      }

      // Check admin role using database function
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      return {
        isAuthorized: adminRole === 'super_admin',
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