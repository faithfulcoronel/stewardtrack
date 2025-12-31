import { NextRequest, NextResponse } from 'next/server';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { IOnboardingProgressRepository } from '@/repositories/onboardingProgress.repository';

interface SaveProgressRequest {
  step: string;
  data: Record<string, any>;
}

/**
 * POST /api/onboarding/save-progress
 *
 * Saves the current onboarding step progress for a tenant.
 * Creates or updates the onboarding_progress record.
 */
export async function POST(request: NextRequest) {
  try {
    const body: SaveProgressRequest = await request.json();
    const { step, data } = body;

    if (!step) {
      return NextResponse.json(
        {
          success: false,
          error: 'Step is required',
        },
        { status: 400 }
      );
    }

    // Check authentication
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.statusCode }
      );
    }

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    // Save progress using repository
    const repository = container.get<IOnboardingProgressRepository>(TYPES.IOnboardingProgressRepository);
    await repository.saveProgress(tenantId, authResult.userId!, step, data);

    return NextResponse.json({
      success: true,
      data: {
        step,
        message: 'Progress saved successfully',
      },
    });
  } catch (error) {
    console.error('Error saving onboarding progress:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save progress',
      },
      { status: 500 }
    );
  }
}
