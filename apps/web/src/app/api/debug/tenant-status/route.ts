import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ITenantRepository } from '@/repositories/tenant.repository';

/**
 * GET /api/debug/tenant-status?tenantId=xxx
 *
 * Diagnostic endpoint to check tenant provisioning status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const tenantRepository = container.get<ITenantRepository>(TYPES.ITenantRepository);
    const status = await tenantRepository.getTenantStatus(tenantId);

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      status
    });
  } catch (error) {
    console.error('Tenant status check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check tenant status'
    }, { status: 500 });
  }
}
