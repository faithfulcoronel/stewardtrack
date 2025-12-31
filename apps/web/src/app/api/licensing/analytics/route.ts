import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import { LicenseMonitoringService } from '@/services/LicenseMonitoringService';

/**
 * GET /api/licensing/analytics
 * Gets system-wide licensing analytics for super_admin users
 * This includes metrics across ALL tenants in the system
 */
export async function GET() {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const monitoringService = container.get<LicenseMonitoringService>(TYPES.LicenseMonitoringService);
    const summary = await monitoringService.getSystemAnalytics();

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching licensing analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch licensing analytics',
      },
      { status: 500 }
    );
  }
}
