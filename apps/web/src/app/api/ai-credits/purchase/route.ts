import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditPurchaseService } from '@/services/AICreditPurchaseService';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/ai-credits/purchase
 * Creates a credit purchase and returns Xendit payment URL
 *
 * Request body:
 * {
 *   packageId: string,
 *   successUrl?: string,
 *   failureUrl?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context not found' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { packageId, successUrl, failureUrl } = body;

    if (!packageId) {
      return NextResponse.json(
        { success: false, error: 'Package ID is required' },
        { status: 400 }
      );
    }

    // Construct default redirect URLs if not provided
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const defaultSuccessUrl = successUrl || `${baseUrl}/admin/settings?tab=ai-credits&payment=success`;
    const defaultFailureUrl = failureUrl || `${baseUrl}/admin/settings?tab=ai-credits&payment=failed`;

    // Get purchase service
    const purchaseService = container.get<AICreditPurchaseService>(
      TYPES.AICreditPurchaseService
    );

    // Create purchase and get Xendit invoice URL
    const result = await purchaseService.createPurchase(
      tenantId,
      packageId,
      user.email || '',
      user.user_metadata?.full_name || user.email || 'User',
      defaultSuccessUrl,
      defaultFailureUrl
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[AI Credits Purchase] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create purchase',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
