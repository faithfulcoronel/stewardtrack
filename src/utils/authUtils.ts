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
  }
};