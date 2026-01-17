import { NextRequest, NextResponse } from 'next/server';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { IOnboardingProgressRepository } from '@/repositories/onboardingProgress.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';

/**
 * POST /api/onboarding/complete
 *
 * Marks the onboarding process as complete for a tenant.
 * Updates the onboarding_progress record and logs the completion.
 */
export async function POST(request: NextRequest) {
  try {
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

    // Mark onboarding as complete in progress repository
    const repository = container.get<IOnboardingProgressRepository>(TYPES.IOnboardingProgressRepository);
    await repository.markComplete(tenantId, authResult.userId!);

    // Also mark tenant as onboarding complete
    const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);
    await tenantRepo.update(tenantId, {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });

    // Log completion in audit trail
    try {
      const auditService = container.get<AuditService>(TYPES.AuditService);
      await auditService.logAuditEvent(
        'update',
        'onboarding_progress',
        tenantId,
        {
          is_completed: true,
          completed_at: new Date().toISOString(),
          user_id: authResult.userId,
        }
      );
    } catch (auditError) {
      console.error('Failed to log onboarding completion:', auditError);
      // Non-fatal error, continue
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Onboarding completed successfully',
        completed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/complete
 *
 * Returns the onboarding status for the current tenant.
 */
export async function GET(_request: NextRequest) {
  try {
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

    // Get tenant onboarding status
    const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);
    const tenant = await tenantRepo.findById(tenantId);

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        onboarding_completed: tenant.onboarding_completed ?? false,
        onboarding_completed_at: tenant.onboarding_completed_at ?? null,
        church_image_url: tenant.church_image_url ?? null,
      },
    });
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch onboarding status',
      },
      { status: 500 }
    );
  }
}
