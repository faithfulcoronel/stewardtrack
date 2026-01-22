import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { EmailVerificationService } from '@/services/EmailVerificationService';

// Force Node.js runtime for this route (needed for inversify)
export const runtime = 'nodejs';

interface ResendVerificationRequest {
  email: string;
}

/**
 * POST /api/auth/resend-verification
 *
 * Resends the verification email for a pending registration.
 * Rate limited to 3 attempts per 15 minutes per email address.
 *
 * If the token has expired, generates a new one.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ResendVerificationRequest;
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
      console.error('[Resend-Verification API] JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate email presence
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Get EmailVerificationService from container
    const emailVerificationService = container.get<EmailVerificationService>(TYPES.EmailVerificationService);

    // Resend verification email
    const result = await emailVerificationService.resendVerificationEmail(body.email);

    // Handle result
    if (!result.success) {
      // Check if it's a rate limit error
      if (result.error?.includes('Too many resend attempts')) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 429 } // Too Many Requests
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Return success
    // Note: For security, we always return success even if email doesn't exist
    return NextResponse.json(
      {
        success: true,
        data: {
          message: result.message || 'Verification email sent. Please check your inbox.',
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Resend-Verification API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend verification email',
      },
      { status: 500 }
    );
  }
}
