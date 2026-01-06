"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { AuthService } from "@/services/AuthService";
import type { TenantService } from "@/services/TenantService";
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
  const redirectTo = formData.get("redirectTo");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }

  const authService = container.get<AuthService>(TYPES.AuthService);
  const { data, error } = await authService.signIn(email, password);

  if (error) {
    return { error: error.message };
  }

  const sessionId = (data.session?.access_token as string | undefined) ?? null;
  let tenant = (data.user?.app_metadata?.tenant as string | undefined)?.trim() ?? null;

  if (!tenant) {
    try {
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenantData = await tenantService.getCurrentTenant();

      if (tenantData) {
        tenant = tenantData.id?.trim() ?? null;
      }
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

  // Determine the redirect destination
  // Default to /admin, but use the provided redirectTo if it's a valid path
  let destination = "/admin";
  if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
    // Security: Only allow internal paths (starting with /)
    // and specifically paths under /admin to prevent open redirect
    if (redirectTo.startsWith("/admin")) {
      destination = redirectTo;
    }
  }

  revalidatePath("/admin", "page");
  redirect(destination);
}

export async function signOut() {
  const authService = container.get<AuthService>(TYPES.AuthService);
  await authService.signOut();
  await clearTenantSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
