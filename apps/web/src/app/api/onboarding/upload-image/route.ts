/**
 * POST /api/onboarding/upload-image
 *
 * Uploads a church image for the hero section.
 * Stores the image in Supabase Storage and updates the tenant record.
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

    // Upload image using storage service
    const uploadResult = await storageService.uploadChurchImage(tenantId, file);

    // Update tenant with image URL
    await tenantRepo.update(tenantId, {
      church_image_url: uploadResult.publicUrl,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.publicUrl,
      path: uploadResult.path,
    });
  } catch (error) {
    console.error('Error uploading church image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/onboarding/upload-image
 *
 * Removes the church image.
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

    // Get current tenant to find the image URL
    const tenant = await tenantRepo.findById(tenantId);

    if (tenant?.church_image_url) {
      try {
        await storageService.deleteChurchImage(tenant.church_image_url);
      } catch (deleteError) {
        console.error('Error deleting from storage:', deleteError);
        // Continue anyway to clear the URL from tenant record
      }
    }

    // Clear image URL from tenant
    await tenantRepo.update(tenantId, {
      church_image_url: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Image removed successfully',
    });
  } catch (error) {
    console.error('Error removing church image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove image' },
      { status: 500 }
    );
  }
}
