import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { StorageService } from '@/services/StorageService';
import { getCurrentTenantId } from '@/lib/server/context';

export const dynamic = 'force-dynamic';

// Facebook limits
const FACEBOOK_IMAGE_MAX_SIZE = 4 * 1024 * 1024; // 4MB
const FACEBOOK_VIDEO_MAX_SIZE = 1024 * 1024 * 1024; // 1GB (we cap, FB allows 10GB)

/**
 * POST /api/communication/media/upload
 *
 * Upload media (image or video) for social media posts.
 * Body: FormData with 'file' and 'mediaType' fields
 *
 * Returns: { success: true, url: string, filename: string, size: number }
 */
export async function POST(request: Request) {
  try {
    const tenantId = await getCurrentTenantId();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mediaType = formData.get('mediaType') as 'image' | 'video' | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid media type. Must be "image" or "video"' },
        { status: 400 }
      );
    }

    // Validate file size based on type
    const maxSize = mediaType === 'image' ? FACEBOOK_IMAGE_MAX_SIZE : FACEBOOK_VIDEO_MAX_SIZE;
    if (file.size > maxSize) {
      const sizeLabel = mediaType === 'image'
        ? `${FACEBOOK_IMAGE_MAX_SIZE / (1024 * 1024)}MB`
        : `${FACEBOOK_VIDEO_MAX_SIZE / (1024 * 1024 * 1024)}GB`;
      return NextResponse.json(
        { success: false, message: `File too large. Maximum size for ${mediaType}: ${sizeLabel}` },
        { status: 400 }
      );
    }

    // Upload via StorageService
    const storageService = container.get<StorageService>(TYPES.StorageService);
    const result = await storageService.uploadSocialMedia(tenantId, file, mediaType);

    return NextResponse.json({
      success: true,
      url: result.publicUrl,
      path: result.path,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('[communication/media/upload] Error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
