import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { QuotaService } from '@/services/QuotaService';
import { QuotaExceededException } from '@/services/QuotaService';
import { getCurrentTenantId } from '@/lib/server/context';
import type { QuotaType } from '@/models/tenantUsage.model';

/**
 * GET /api/tenant/quota
 *
 * Get the complete usage summary for the current tenant.
 * Returns all quotas with current usage, limits, percentages, and warnings.
 */
export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();

    const quotaService = container.get<QuotaService>(TYPES.QuotaService);
    const summary = await quotaService.getUsageSummary(tenantId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Failed to get quota summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quota summary',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/quota
 *
 * Check if a specific quota operation is allowed.
 *
 * Body:
 * - quotaType: The type of quota to check ('members', 'admin_users', 'storage_mb', 'sms', 'emails', 'transactions', 'ai_credits')
 * - increment: The amount to add (default: 1)
 *
 * Returns:
 * - allowed: Whether the operation is allowed
 * - current: Current usage value
 * - limit: Maximum allowed (null if unlimited)
 * - remaining: Remaining quota (null if unlimited)
 * - message: Error message if not allowed
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();

    const body = await request.json();
    const { quotaType, increment = 1 } = body as { quotaType: QuotaType; increment?: number };

    if (!quotaType) {
      return NextResponse.json(
        {
          success: false,
          error: 'quotaType is required',
        },
        { status: 400 }
      );
    }

    // Validate quota type
    const validQuotaTypes: QuotaType[] = [
      'members',
      'admin_users',
      'storage_mb',
      'sms',
      'emails',
      'transactions',
      'ai_credits',
    ];

    if (!validQuotaTypes.includes(quotaType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid quotaType. Must be one of: ${validQuotaTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const quotaService = container.get<QuotaService>(TYPES.QuotaService);
    const result = await quotaService.checkQuota(quotaType, increment, tenantId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to check quota:', error);

    if (error instanceof QuotaExceededException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          data: error.toJSON(),
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check quota',
      },
      { status: 500 }
    );
  }
}
