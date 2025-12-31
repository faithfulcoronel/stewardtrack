import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { AuthorizationService } from "@/services/AuthorizationService";

export interface SuperAdminSettingsContext {
  role: string;
  locale: string;
  featureFlags: Record<string, boolean>;
}

/**
 * Get super admin settings context using service layer
 * NOTE: This context does NOT require tenant - it's for super admin system-wide settings
 * Follows architectural pattern: Utility -> Service -> Repository -> Adapter -> Supabase
 */
export async function getSuperAdminSettingsContext(): Promise<SuperAdminSettingsContext> {
  // Use AuthorizationService for authentication
  const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
  const authResult = await authService.checkAuthentication();

  if (!authResult.authorized || !authResult.user) {
    throw new Error("User not authenticated");
  }

  const user = authResult.user;
  const role = (user.app_metadata?.role as string | undefined) ?? "super_admin";
  const locale = (user.user_metadata?.locale as string | undefined) ?? "en-US";
  const featureFlags =
    (user.app_metadata?.featureFlags as Record<string, boolean> | undefined) ?? ({} as Record<string, boolean>);

  // Super admin pages don't need tenant context
  return { role, locale, featureFlags };
}
