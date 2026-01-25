import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMediaService } from '@/services/MediaService';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/media/[id]/dependencies
 * Get dependencies for a media item (entities that use this media)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const mediaService = container.get<IMediaService>(TYPES.MediaService);

    // First get the media item to get its public URL
    const media = await mediaService.getMediaById(id, tenantId);

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    // Get dependencies using the public URL
    const dependencies = await mediaService.getDependencies(id, tenantId);

    return NextResponse.json({
      success: true,
      data: {
        mediaId: id,
        dependencies,
        hasDependencies: dependencies.length > 0,
      },
    });
  } catch (error) {
    console.error('[GET /api/media/[id]/dependencies] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media dependencies' },
      { status: 500 }
    );
  }
}
