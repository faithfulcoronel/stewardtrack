import { NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { encodeTenantToken } from '@/lib/tokens/shortUrlTokens';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';

/**
 * GET /api/donations/share-link
 * Returns the public donation link for the current tenant
 */
export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 401 }
      );
    }

    // Get tenant info for display
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Generate the donation token
    const token = encodeTenantToken(tenantId);

    // Build the full URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const donationUrl = `${baseUrl}/donate/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        tenantName: tenant.name,
        token,
        donationUrl,
        // Short URL format for QR codes and sharing
        shortPath: `/donate/${token}`,
      },
    });
  } catch (error) {
    console.error('Error generating donation link:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate donation link',
      },
      { status: 500 }
    );
  }
}
