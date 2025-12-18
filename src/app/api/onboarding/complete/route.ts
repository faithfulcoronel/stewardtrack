import { NextRequest, NextResponse } from 'next/server';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { IOnboardingProgressRepository } from '@/repositories/onboardingProgress.repository';

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

    // Mark onboarding as complete
    const repository = container.get<IOnboardingProgressRepository>(TYPES.IOnboardingProgressRepository);
    await repository.markComplete(tenantId, authResult.userId!);

    // Log completion in audit trail
    try {
      const auditService = container.get<AuditService>(TYPES.AuditService);
      await auditService.log({
        operation: 'COMPLETE',
        table_name: 'onboarding_progress',
        record_id: tenantId,
        user_id: user.id,
        changes: {
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        metadata: {
          event: 'onboarding_completed',
          tenant_id: tenantId,
        },
      });
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
