import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { AuthorizationService } from "@/services/AuthorizationService";
import type { TenantService } from "@/services/TenantService";

export interface CommunicationContext {
  role: string;
  tenant: string | null;
  locale: string;
  featureFlags: Record<string, boolean>;
}

/**
 * Get communication context using service layer
 * Follows architectural pattern: Utility → Service → Repository → Adapter → Supabase
 */
export async function getCommunicationContext(): Promise<CommunicationContext> {
  // Use AuthorizationService for authentication
  const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
  const authResult = await authService.checkAuthentication();

  if (!authResult.authorized || !authResult.user) {
    throw new Error("User not authenticated");
  }

  const user = authResult.user;
  const role = (user.app_metadata?.role as string | undefined) ?? "admin";
  const locale = (user.user_metadata?.locale as string | undefined) ?? "en-US";
  const featureFlags =
    (user.app_metadata?.featureFlags as Record<string, boolean> | undefined) ?? ({} as Record<string, boolean>);

  // Use TenantService to get tenant context
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  let tenant: string | null = null;

  try {
    const currentTenant = await tenantService.getCurrentTenant();
    tenant = currentTenant?.id ?? null;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to resolve tenant for communication metadata context", error);
    }
  }

  if (!tenant) {
    throw new Error("Failed to determine tenant for communication metadata context");
  }

  return { role, tenant, locale, featureFlags };
}
