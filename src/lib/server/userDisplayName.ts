import type { SupabaseClient } from '@supabase/supabase-js';

interface ProfileRow {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export async function getUserDisplayNameMap(
  supabase: SupabaseClient,
  _tenantId: string | null,
  userIds: string[]
): Promise<Record<string, string>> {
  if (!userIds.length) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email')
      .in('id', userIds)
      .returns<ProfileRow[]>();

    if (error) {
      throw error;
    }

    const map: Record<string, string> = {};

    data?.forEach(profile => {
      const parts = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .map(part => part!.trim());
      const displayName =
        profile.full_name?.trim() ||
        (parts.length ? parts.join(' ') : profile.email?.trim() || profile.id);
      map[profile.id] = displayName;
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
