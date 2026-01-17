/**
 * POST /api/onboarding/upload-logo
 *
 * Uploads a church logo.
 * Stores the logo in Supabase Storage and updates the tenant record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { StorageService } from '@/services/StorageService';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get services from container
    const storageService = container.get<StorageService>(TYPES.StorageService);
    const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);

    // Get current tenant to delete old logo if exists
    const currentTenant = await tenantRepo.findById(tenantId);
    if (currentTenant?.logo_url) {
      try {
        await storageService.deleteChurchLogo(currentTenant.logo_url);
      } catch (deleteError) {
        console.error('Error deleting old logo:', deleteError);
        // Continue anyway
      }
    }

    // Upload logo using storage service
    const uploadResult = await storageService.uploadChurchLogo(tenantId, file);

    // Update tenant with logo URL
    await tenantRepo.update(tenantId, {
      logo_url: uploadResult.publicUrl,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.publicUrl,
      path: uploadResult.path,
    });
  } catch (error) {
    console.error('Error uploading church logo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/onboarding/upload-logo
 *
 * Removes the church logo.
 */
export async function DELETE(_request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    // Get services from container
    const storageService = container.get<StorageService>(TYPES.StorageService);
    const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);

    // Get current tenant to find the logo URL
    const tenant = await tenantRepo.findById(tenantId);

    if (tenant?.logo_url) {
      try {
        await storageService.deleteChurchLogo(tenant.logo_url);
      } catch (deleteError) {
        console.error('Error deleting from storage:', deleteError);
        // Continue anyway to clear the URL from tenant record
      }
    }

    // Clear logo URL from tenant
    await tenantRepo.update(tenantId, {
      logo_url: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Logo removed successfully',
    });
  } catch (error) {
    console.error('Error removing church logo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove logo' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/upload-logo
 *
 * Gets the current church logo URL.
 */
export async function GET(_request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    // Get tenant repository
    const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);

    // Get current tenant
    const tenant = await tenantRepo.findById(tenantId);

    return NextResponse.json({
      success: true,
      url: tenant?.logo_url || null,
    });
  } catch (error) {
    console.error('Error getting church logo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get logo' },
      { status: 500 }
    );
  }
}
