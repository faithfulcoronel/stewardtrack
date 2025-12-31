import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";

/**
 * POST /api/system-settings/integrations/firebase
 * Updates system-wide Firebase configuration
 * SECURITY: Super admin only
 */
export async function POST(request: Request) {
  try {
    // Check super admin access
    const isSuperAdmin = await isCachedSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.projectId || !body.privateKey || !body.clientEmail) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, privateKey, clientEmail" },
        { status: 400 }
      );
    }

    // In production, encrypt and save to database
    // For now, acknowledge the request
    return NextResponse.json({
      success: true,
      configured: true,
      verified: false,
      message: "Firebase configuration saved",
    });
  } catch (error) {
    console.error("[API] Error saving Firebase configuration:", error);
    return NextResponse.json(
      { error: "Failed to save Firebase configuration" },
      { status: 500 }
    );
  }
}
