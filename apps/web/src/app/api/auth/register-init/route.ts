import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { EmailVerificationService } from '@/services/EmailVerificationService';
import { verifyTurnstileToken, isTurnstileConfigured } from '@/lib/auth/turnstile';

// Force Node.js runtime for this route (needed for inversify)
export const runtime = 'nodejs';

interface RegisterInitRequest {
  email: string;
  password: string;
  churchName: string;
  firstName: string;
  lastName: string;
  offeringId: string;
  denomination?: string;
  contactNumber?: string;
  address?: string;
  turnstileToken?: string;
  // Offering type flags
  isTrial?: boolean;
  isFree?: boolean;
  priceIsZero?: boolean;
  // Coupon/discount data
  couponCode?: string;
  couponDiscountId?: string;
  couponDiscountAmount?: number;
  couponDiscountedPrice?: number;
  couponDurationBillingCycles?: number;
}

/**
 * POST /api/auth/register-init
 *
 * Initiates registration with email verification:
 * 1. Validates input data and Turnstile token
 * 2. Creates Supabase auth user (email not confirmed)
 * 3. Stores registration data in pending_registrations table
 * 4. Sends verification email to user
 *
 * User must verify email before tenant provisioning occurs.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: RegisterInitRequest;
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
      console.error('[Register-Init API] JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Verify Turnstile token if configured
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

    // Get EmailVerificationService from container
    const emailVerificationService = container.get<EmailVerificationService>(TYPES.EmailVerificationService);

    // Initiate verification
    const result = await emailVerificationService.initiateVerification({
      email: body.email,
      password: body.password,
      churchName: body.churchName,
      firstName: body.firstName,
      lastName: body.lastName,
      offeringId: body.offeringId,
      denomination: body.denomination,
      contactNumber: body.contactNumber,
      address: body.address,
      // Offering type flags
      isTrial: body.isTrial,
      isFree: body.isFree,
      priceIsZero: body.priceIsZero,
      // Coupon/discount data
      couponCode: body.couponCode,
      couponDiscountId: body.couponDiscountId,
      couponDiscountAmount: body.couponDiscountAmount,
      couponDiscountedPrice: body.couponDiscountedPrice,
      couponDurationBillingCycles: body.couponDurationBillingCycles,
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
          email: result.email,
          message: result.message,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Register-Init API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 }
    );
  }
}
