import "server-only";
import "reflect-metadata";
import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { TenantService } from "@/services/TenantService";

// Force Node.js runtime for this route
export const runtime = "nodejs";

/**
 * GET /api/public/tenant-info
 *
 * Public endpoint to get basic tenant information for member registration.
 * Only returns non-sensitive tenant details (name, denomination).
 *
 * Query params:
 * - tenantId: The tenant UUID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Invalid tenant ID format" },
        { status: 400 }
      );
    }

    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getPublicTenantInfo(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error("Tenant info route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tenant info",
      },
      { status: 500 }
    );
  }
}
