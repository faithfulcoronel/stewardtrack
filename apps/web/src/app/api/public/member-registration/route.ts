import "server-only";
import "reflect-metadata";
import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { PublicMemberRegistrationService } from "@/services/PublicMemberRegistrationService";

// Force Node.js runtime for this route
export const runtime = "nodejs";

interface RegistrationRequest {
  tenantToken: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  address?: string;
  password: string;
  confirmPassword: string;
  turnstileToken?: string;
}

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      "[Member Registration API] TURNSTILE_SECRET_KEY not configured, skipping verification"
    );
    return { success: true };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      console.error(
        "[Member Registration API] Turnstile verification failed:",
        result["error-codes"]
      );
      return {
        success: false,
        error: "Security verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[Member Registration API] Turnstile verification error:", error);
    return {
      success: false,
      error: "Security verification failed. Please try again.",
    };
  }
}

/**
 * POST /api/public/member-registration
 *
 * Public endpoint to register a new member for a tenant.
 * This endpoint:
 * 1. Validates the tenant token
 * 2. Creates a Supabase auth user
 * 3. Creates a member record
 * 4. Links the user to the member
 * 5. Assigns the "member" role
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with defensive error handling
    let body: RegistrationRequest;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Request body is empty" },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("[Member Registration API] JSON parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Verify Turnstile token if provided
    if (body.turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(body.turnstileToken);
      if (!turnstileResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: turnstileResult.error || "Security verification failed",
          },
          { status: 400 }
        );
      }
    } else if (process.env.TURNSTILE_SECRET_KEY) {
      // If Turnstile is configured but no token provided, reject the request
      return NextResponse.json(
        { success: false, error: "Security verification required" },
        { status: 400 }
      );
    }

    // Basic validation
    const validationErrors: string[] = [];

    if (!body.tenantToken) {
      validationErrors.push("Registration link is invalid");
    }
    if (!body.firstName?.trim()) {
      validationErrors.push("First name is required");
    }
    if (!body.lastName?.trim()) {
      validationErrors.push("Last name is required");
    }
    if (!body.email?.trim()) {
      validationErrors.push("Email is required");
    }
    if (!body.phone?.trim()) {
      validationErrors.push("Phone is required");
    }
    if (!body.password) {
      validationErrors.push("Password is required");
    } else if (body.password.length < 8) {
      validationErrors.push("Password must be at least 8 characters");
    }
    if (body.password !== body.confirmPassword) {
      validationErrors.push("Passwords do not match");
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(", ") },
        { status: 400 }
      );
    }

    // Get service from container
    const registrationService = container.get<PublicMemberRegistrationService>(
      TYPES.PublicMemberRegistrationService
    );

    // Execute registration
    const result = await registrationService.register({
      tenantToken: body.tenantToken,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      preferredName: body.preferredName?.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      address: body.address?.trim(),
      password: body.password,
    });

    // Handle result
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return success
    return NextResponse.json(
      {
        success: true,
        data: {
          memberId: result.memberId,
          userId: result.userId,
          message: result.message,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Member registration route error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 500 }
    );
  }
}
