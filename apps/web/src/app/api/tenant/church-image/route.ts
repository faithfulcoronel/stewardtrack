/**
 * GET /api/tenant/church-image
 *
 * Returns the current tenant's church image URL.
 * Used by the HeroSection component for displaying tenant branding.
 */

import { NextResponse } from 'next/server';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ITenantRepository } from '@/repositories/tenant.repository';

export async function GET() {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ url: null }, { status: 200 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ url: null }, { status: 200 });
    }

    const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);
    const tenant = await tenantRepo.findById(tenantId);

    return NextResponse.json({
      url: tenant?.church_image_url ?? null,
      tenantName: tenant?.name ?? null,
    });
  } catch (error) {
    console.error('Error fetching church image:', error);
    return NextResponse.json({ url: null }, { status: 200 });
  }
}
