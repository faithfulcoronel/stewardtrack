import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMediaService } from '@/services/MediaService';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/media/[id]
 * Get a single media item by ID
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

    const media = await mediaService.getMediaById(id, tenantId);

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error('[GET /api/media/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/[id]
 * Delete a media item
 */
export async function DELETE(
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

    // Delete the media (soft delete in tenant_media, hard delete from storage)
    const result = await mediaService.deleteMedia(id, tenantId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, dependencies: result.dependencies },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/media/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
