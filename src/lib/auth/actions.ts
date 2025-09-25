"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearTenantSession, writeTenantSession } from "@/lib/tenant/session-cache";

export type SignInState = {
  error?: string;
};

export async function signInWithPassword(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const sessionId = (data.session?.access_token as string | undefined) ?? null;
  let tenant = (data.user?.app_metadata?.tenant as string | undefined)?.trim() ?? null;

  if (!tenant) {
    try {
      const { data: tenantData, error: tenantError } = await supabase.rpc("get_current_tenant");

      if (tenantError) {
        throw tenantError;
      }

      const tenantRecord = Array.isArray(tenantData) ? tenantData[0] : tenantData;
      const resolvedTenant = (tenantRecord as { id?: string } | null)?.id ?? null;
      tenant = typeof resolvedTenant === "string" ? resolvedTenant.trim() : null;
    } catch (tenantLookupError) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to determine tenant during sign-in", tenantLookupError);
      }
    }
  }

  if (tenant && sessionId) {
    await writeTenantSession(tenant, sessionId);
  } else {
    await clearTenantSession();
  }

  revalidatePath("/admin", "page");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearTenantSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
