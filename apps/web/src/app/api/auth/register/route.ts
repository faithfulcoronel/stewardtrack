import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RegistrationService } from '@/services/RegistrationService';
import { verifyTurnstileToken, isTurnstileConfigured } from '@/lib/auth/turnstile';

// Force Node.js runtime for this route (needed for inversify)
export const runtime = 'nodejs';

interface RegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  churchName: string;
  firstName: string;
  lastName: string;
  offeringId: string;
  denomination?: string;
  contactNumber?: string;
  address?: string;
  turnstileToken?: string;
}

/**
 * POST /api/auth/register
 *
 * Handles new user and tenant registration using RegistrationService.
 * The service orchestrates:
 * 1. Creating Supabase auth user
 * 2. Creating tenant record
 * 3. Generating encryption key for tenant
 * 4. Creating tenant_users junction record
 * 5. Provisioning license features based on selected offering
 * 6. Seeding default RBAC roles for the tenant
 * 7. Assigning tenant admin role to the user
 * 8. Deploying permissions from licensed features to tenant RBAC
 *
 * Returns success with tenant details (user is automatically logged in via Supabase session)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with defensive error handling
    let body: RegistrationRequest;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Request body is empty' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('[Register API] JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Verify Turnstile token if provided
    if (body.turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(body.turnstileToken);
      if (!turnstileResult.success) {
        return NextResponse.json(
          { success: false, error: turnstileResult.error || 'Security verification failed' },
          { status: 400 }
        );
      }
    } else if (isTurnstileConfigured()) {
      // If Turnstile is configured but no token provided, reject the request
      return NextResponse.json(
        { success: false, error: 'Security verification required' },
        { status: 400 }
      );
    }

    // Get RegistrationService from container
    const registrationService = container.get<RegistrationService>(TYPES.RegistrationService);

    // Execute registration
    const result = await registrationService.register({
      email: body.email,
      password: body.password,
      confirmPassword: body.confirmPassword,
      churchName: body.churchName,
      firstName: body.firstName,
      lastName: body.lastName,
      offeringId: body.offeringId,
      denomination: body.denomination,
      contactNumber: body.contactNumber,
      address: body.address,
    });

    // Handle result
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Return success
    return NextResponse.json(
      {
        success: true,
        data: {
          userId: result.userId,
          tenantId: result.tenantId,
          subdomain: result.subdomain,
          message: result.message,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration route error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 }
    );
  }
}
