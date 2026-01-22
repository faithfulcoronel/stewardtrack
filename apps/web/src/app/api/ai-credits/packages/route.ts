import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditPackageService } from '@/services/AICreditPackageService';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { SettingService } from '@/services/SettingService';

/**
 * GET /api/ai-credits/packages?currency=PHP
 * Lists available credit packages filtered by tenant's currency
 * Optional query param: currency (override tenant's default currency)
 */
export async function GET(request: NextRequest) {
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

    // Get currency from tenant settings or query params
    const { searchParams } = new URL(request.url);
    let currency = searchParams.get('currency');

    // If no currency specified, get from tenant settings
    if (!currency) {
      try {
        const settingService = container.get<SettingService>(TYPES.SettingService);
        currency = (await settingService.getTenantCurrency()) || 'PHP';
      } catch (error) {
        console.warn('[AI Credits Packages] Failed to get tenant currency, defaulting to PHP:', error);
        currency = 'PHP';
      }
    }

    // Validate currency
    if (!['PHP', 'USD'].includes(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency. Must be PHP or USD' },
        { status: 400 }
      );
    }

    // Get package service from DI container
    const packageService = container.get<AICreditPackageService>(
      TYPES.AICreditPackageService
    );

    // Fetch active packages for the currency
    const packages = await packageService.getActivePackages(currency);

    return NextResponse.json({
      success: true,
      data: {
        packages,
        currency,
      },
    });
  } catch (error) {
    console.error('[AI Credits Packages] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve credit packages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
