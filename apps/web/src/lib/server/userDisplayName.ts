import type { SupabaseClient } from '@supabase/supabase-js';

export async function getUserDisplayNameMap(
  supabase: SupabaseClient,
  _tenantId: string | null,
  userIds: string[]
): Promise<Record<string, string>> {
  if (!userIds.length) {
    return {};
  }

  try {
    type TenantUserRow = {
      user_id: string;
      member: {
        preferred_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      } | null;
    };

    const { data, error } = await supabase
      .from('tenant_users')
      .select('user_id, member:member_id(preferred_name, first_name, last_name, email)')
      .in('user_id', userIds)
      .returns<TenantUserRow[]>();

    if (error) {
      throw error;
    }

    const map: Record<string, string> = {};

    data?.forEach((row) => {
      const member = row.member ?? null;
      const preferred = member?.preferred_name?.trim();
      const first = member?.first_name?.trim();
      const last = member?.last_name?.trim();
      const combined = [first, last].filter(Boolean).join(' ').trim();
      const email = member?.email?.trim();
      const displayName =
        preferred ||
        (combined.length ? combined : null) ||
        email ||
        row.user_id;
      map[row.user_id] = displayName;
    });

    for (const id of userIds) {
      if (!map[id]) {
        map[id] = id;
      }
    }

    return map;
  } catch (error) {
    console.error('Failed to resolve user display names', error);
    return userIds.reduce<Record<string, string>>((acc, id) => {
      acc[id] = id;
      return acc;
    }, {});
  }
}
