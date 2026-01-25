import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMediaService } from '@/services/MediaService';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/utils/tenantUtils';
import type { MediaCategory } from '@/adapters/media.adapter';

/**
 * GET /api/media/gallery
 * Get media items for the media gallery
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as MediaCategory | undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const mediaService = container.get<IMediaService>(TYPES.MediaService);

    // Get gallery items
    const gallery = await mediaService.getGallery(tenantId, {
      category: category || undefined,
      search,
      limit,
      offset,
    });

    // Get storage usage
    const storageUsage = await mediaService.getStorageUsage(tenantId);

    return NextResponse.json({
      success: true,
      data: {
        items: gallery.items,
        total: gallery.total,
        storageUsage,
      },
    });
  } catch (error) {
    console.error('[GET /api/media/gallery] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media gallery' },
      { status: 500 }
    );
  }
}
