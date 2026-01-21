import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { EmailVerificationService } from '@/services/EmailVerificationService';

// Force Node.js runtime for this route (needed for inversify)
export const runtime = 'nodejs';

interface VerifyEmailRequest {
  token: string;
}

/**
 * POST /api/auth/verify-email
 *
 * Verifies email and completes tenant provisioning:
 * 1. Validates the verification token
 * 2. Marks the token as used
 * 3. Confirms the user's email in Supabase
 * 4. Completes tenant provisioning (creates tenant, seeds RBAC, etc.)
 *
 * Returns tenant details on success.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: VerifyEmailRequest;
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
      console.error('[Verify-Email API] JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate token presence
    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Get EmailVerificationService from container
    const emailVerificationService = container.get<EmailVerificationService>(TYPES.EmailVerificationService);

    // Verify email and complete registration
    const result = await emailVerificationService.verifyEmailAndComplete(body.token);

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

    // Return success with tenant details and checkout data
    return NextResponse.json(
      {
        success: true,
        data: {
          tenantId: result.tenantId,
          subdomain: result.subdomain,
          message: 'Email verified successfully. Your church is being set up.',
          // Include offering type flags for redirect logic
          offeringId: result.offeringId,
          isTrial: result.isTrial,
          isFree: result.isFree,
          priceIsZero: result.priceIsZero,
          // Include user data for checkout
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          couponCode: result.couponCode,
          couponDiscountId: result.couponDiscountId,
          couponDurationBillingCycles: result.couponDurationBillingCycles,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Verify-Email API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
