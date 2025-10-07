import type { SupabaseClient } from "@supabase/supabase-js";

interface TenantLookupResult {
  tenant: string | null;
  error?: unknown;
}

function normalizeTenantId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchTenantFromAssignments(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<TenantLookupResult> {
  if (!userId) {
    return { tenant: null };
  }

  try {
    const { data, error } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      throw error;
    }

    const record = Array.isArray(data) ? data[0] : data;
    const tenantId = normalizeTenantId((record as { tenant_id?: string } | null)?.tenant_id);

    return { tenant: tenantId };
  } catch (error) {
    return { tenant: null, error };
  }
}

export async function resolveTenantForUser(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<TenantLookupResult> {
  return fetchTenantFromAssignments(supabase, userId);
}
