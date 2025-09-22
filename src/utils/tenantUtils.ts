import { createSupabaseServerClient } from '@/lib/supabase/server';

async function fetchTenantId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_current_tenant');

  if (error) {
    throw error;
  }

  const tenant = Array.isArray(data) ? data[0] : data;
  return (tenant as { id?: string } | null)?.id ?? null;
}

export const tenantUtils = {
  async getTenantId(): Promise<string | null> {
    try {
      return await fetchTenantId();
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to determine tenant id', error);
      }
      return null;
    }
  },
};
