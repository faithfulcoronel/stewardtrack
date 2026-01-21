import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { EmailVerificationService } from '@/services/EmailVerificationService';

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
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(token: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('[Register-Init API] TURNSTILE_SECRET_KEY not configured, skipping verification');
    return { success: true };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('[Register-Init API] Turnstile verification failed:', result['error-codes']);
      return {
        success: false,
        error: 'Security verification failed. Please try again.'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Register-Init API] Turnstile verification error:', error);
    return {
      success: false,
      error: 'Security verification failed. Please try again.'
    };
  }
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
    } else if (process.env.TURNSTILE_SECRET_KEY) {
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
