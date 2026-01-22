/**
 * Admin Settings Page
 *
 * Canva-style settings interface for tenant-level configuration.
 *
 * SECURITY: Protected by AccessGate allowing super admins or tenant admins.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { CompositeAccessGate, Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { TenantService } from "@/services/TenantService";
import type { SettingService } from "@/services/SettingService";
import { CanvaStyleSettingsPage } from "@/components/dynamic/admin/CanvaStyleSettingsPage";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings | StewardTrack",
  description: "Configure your church settings, profile, and preferences",
};

// Loading fallback
function SettingsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    </div>
  );
}

// Server component that fetches initial data
async function SettingsContent() {
  const tenantId = await getCurrentTenantId({ optional: true });

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tenant context available</p>
      </div>
    );
  }

  // Fetch initial tenant data on server
  let initialData = undefined;

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (tenant) {
      // Also fetch settings for timezone and currency
      let timezone = "Asia/Manila";
      let currency = "PHP";

      try {
        const settingService = container.get<SettingService>(TYPES.SettingService);
        const fetchedTimezone = await settingService.getTenantTimezone();
        const fetchedCurrency = await settingService.getTenantCurrency();
        timezone = fetchedTimezone || timezone;
        currency = fetchedCurrency || currency;
      } catch {
        // Settings may not exist yet, use defaults
      }

      initialData = {
        tenantId: tenant.id,
        name: tenant.name,
        email: tenant.email || undefined,
        phone: tenant.contact_number || undefined,
        address: tenant.address || undefined,
        website: tenant.website || undefined,
        logoUrl: tenant.logo_url || undefined,
        coverUrl: tenant.church_image_url || undefined,
        currency,
        timezone,
      };
    }
  } catch (error) {
    console.error("Error fetching tenant data:", error);
    // Will fall back to client-side fetch
  }

  return <CanvaStyleSettingsPage initialData={initialData} />;
}

export default async function AdminSettingsPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId({ optional: true });

  const gate = new CompositeAccessGate(
    [
      Gate.superAdminOnly({ fallbackPath: "/unauthorized?reason=super_admin_only" }),
      Gate.withRole("role_tenant_admin", "any", { fallbackPath: "/unauthorized?reason=tenant_admin_required" }),
    ],
    { requireAll: false, fallbackPath: "/unauthorized?reason=admin_settings" }
  );

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId ?? undefined}>
      <div className="w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Suspense fallback={<SettingsLoading />}>
          <SettingsContent />
        </Suspense>
      </div>
    </ProtectedPage>
  );
}
