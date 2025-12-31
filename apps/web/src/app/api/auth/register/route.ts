import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RegistrationService } from '@/services/RegistrationService';

interface RegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  churchName: string;
  firstName: string;
  lastName: string;
  offeringId: string;
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
    const body: RegistrationRequest = await request.json();

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
