import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { StorageService } from '@/services/StorageService';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and has tenant context
    const userId = await getCurrentUserId({ optional: true });
    const tenantId = await getCurrentTenantId({ optional: true });

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get storage service from DI container
    const storageService = container.get<StorageService>(TYPES.StorageService);

    // Upload the image
    const result = await storageService.uploadEditorImage(tenantId, file);

    return NextResponse.json({
      success: true,
      url: result.publicUrl,
      path: result.path,
    });
  } catch (error) {
    console.error('Editor image upload error:', error);

    const message = error instanceof Error ? error.message : 'Upload failed';

    // Return user-friendly error messages
    if (message.includes('Invalid file type')) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    if (message.includes('File too large')) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
