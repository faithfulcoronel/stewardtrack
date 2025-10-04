import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { LicenseValidationService } from '@/services/LicenseValidationService';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/validate-licenses
 *
 * Runs comprehensive license validation checks.
 * Returns detailed validation report with issues and fix suggestions.
 *
 * Request body:
 * - tenant_id?: string - Validate specific tenant (optional, defaults to all)
 *
 * Returns:
 * - Validation report with all detected issues
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id, roles(code)')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some((ur: any) =>
      ['super_admin', 'admin', 'system_admin'].includes(ur.roles?.code)
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { tenant_id } = body;

    // Get validation service
    const validationService = container.get<LicenseValidationService>(
      LicenseValidationService
    );

    let reports;

    if (tenant_id) {
      // Validate specific tenant
      const report = await validationService.validateTenant(tenant_id);
      reports = [report];
    } else {
      // Validate all tenants
      reports = await validationService.validateAllTenants();
    }

    // Calculate summary
    const summary = {
      total_tenants: reports.length,
      healthy_tenants: reports.filter(r => r.is_healthy).length,
      tenants_with_issues: reports.filter(r => !r.is_healthy).length,
      total_issues: reports.reduce((sum, r) => sum + r.total_issues, 0),
      critical_issues: reports.reduce((sum, r) => sum + r.critical_issues, 0),
      high_issues: reports.reduce((sum, r) => sum + r.high_issues, 0),
      medium_issues: reports.reduce((sum, r) => sum + r.medium_issues, 0),
      low_issues: reports.reduce((sum, r) => sum + r.low_issues, 0),
    };

    return NextResponse.json({
      success: true,
      summary,
      reports: tenant_id ? reports[0] : reports,
      validated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error validating licenses:', error);
    return NextResponse.json(
      {
        error: 'Failed to validate licenses',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/validate-licenses
 *
 * Gets validation summary without running full validation
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id, roles(code)')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some((ur: any) =>
      ['super_admin', 'admin', 'system_admin'].includes(ur.roles?.code)
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get validation service
    const validationService = container.get<LicenseValidationService>(
      LicenseValidationService
    );

    const summary = await validationService.getValidationSummary();

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('Error getting validation summary:', error);
    return NextResponse.json(
      {
        error: 'Failed to get validation summary',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
