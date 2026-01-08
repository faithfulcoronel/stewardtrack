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

    const map: Record<string, string> = {};

    // First, try to get names from tenant_users with linked members
    const { data: tenantUserData, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('user_id, member:member_id(preferred_name, first_name, last_name, email)')
      .in('user_id', userIds)
      .returns<TenantUserRow[]>();

    if (tenantUserError) {
      console.error('Failed to fetch tenant_users', tenantUserError);
    }

    tenantUserData?.forEach((row) => {
      const member = row.member ?? null;
      const preferred = member?.preferred_name?.trim();
      const first = member?.first_name?.trim();
      const last = member?.last_name?.trim();
      const combined = [first, last].filter(Boolean).join(' ').trim();
      const email = member?.email?.trim();
      // Only use member data if we have actual name/email
      if (preferred || combined.length || email) {
        map[row.user_id] = preferred || combined || email || 'Unknown User';
      }
    });

    // For any users not found or without member info, try auth.users via get_user_profiles RPC
    const missingUserIds = userIds.filter((id) => !map[id]);
    if (missingUserIds.length > 0) {
      // Use the get_user_profiles RPC function to get user data from auth.users
      const { data: authUserData, error: authUserError } = await supabase
        .rpc('get_user_profiles', { user_ids: missingUserIds });

      if (authUserError) {
        console.error('Failed to fetch auth user profiles', authUserError);
      }

      // Type for the RPC response
      type AuthUserProfile = {
        id: string;
        email: string | null;
        raw_user_meta_data: {
          full_name?: string;
          name?: string;
          first_name?: string;
          firstName?: string;
          last_name?: string;
          lastName?: string;
        } | null;
      };

      (authUserData as AuthUserProfile[] | null)?.forEach((profile) => {
        const meta = profile.raw_user_meta_data ?? {};
        // Try various name fields that might exist in raw_user_meta_data
        const fullName = meta.full_name?.trim() || meta.name?.trim();
        const firstName = meta.first_name?.trim() || meta.firstName?.trim();
        const lastName = meta.last_name?.trim() || meta.lastName?.trim();
        const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
        const email = profile.email?.trim();

        const displayName = fullName || combined || email;
        if (displayName) {
          map[profile.id] = displayName;
        }
      });
    }

    // Final fallback: use "Unknown User" instead of raw UUID
    for (const id of userIds) {
      if (!map[id]) {
        map[id] = 'Unknown User';
      }
    }

    return map;
  } catch (error) {
    console.error('Failed to resolve user display names', error);
    return userIds.reduce<Record<string, string>>((acc, id) => {
      acc[id] = 'Unknown User';
      return acc;
    }, {});
  }
}
