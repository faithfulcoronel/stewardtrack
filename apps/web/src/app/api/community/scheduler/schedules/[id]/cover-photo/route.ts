import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { ISchedulerService } from '@/services/SchedulerService';
import { getCurrentTenantId } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ id: string }> };

const BUCKET_NAME = 'schedule-covers';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /api/community/scheduler/schedules/[id]/cover-photo
 * Upload a cover photo for a schedule
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scheduleId } = await params;
    const tenantId = await getCurrentTenantId();
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);

    // Verify schedule exists
    const schedule = await schedulerService.getById(scheduleId);
    if (!schedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Ensure bucket exists (create if not)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      });
    }

    // Delete existing cover photo if present
    if (schedule.cover_photo_url) {
      const oldPath = extractPathFromUrl(schedule.cover_photo_url);
      if (oldPath) {
        await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
      }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${tenantId}/${scheduleId}/cover.${ext}`;

    // Upload file
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading cover photo:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
    const coverPhotoUrl = urlData.publicUrl;

    // Update schedule with cover photo URL
    const { error: updateError } = await supabase
      .from('ministry_schedules')
      .update({ cover_photo_url: coverPhotoUrl })
      .eq('id', scheduleId);

    if (updateError) {
      console.error('Error updating schedule with cover photo URL:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: coverPhotoUrl,
    });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upload cover photo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/scheduler/schedules/[id]/cover-photo
 * Remove the cover photo from a schedule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scheduleId } = await params;
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);

    // Verify schedule exists
    const schedule = await schedulerService.getById(scheduleId);
    if (!schedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();

    // Delete from storage if exists
    if (schedule.cover_photo_url) {
      const filePath = extractPathFromUrl(schedule.cover_photo_url);
      if (filePath) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      }
    }

    // Update schedule to remove cover photo URL
    const { error: updateError } = await supabase
      .from('ministry_schedules')
      .update({ cover_photo_url: null })
      .eq('id', scheduleId);

    if (updateError) {
      console.error('Error removing cover photo from schedule:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cover photo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete cover photo' },
      { status: 500 }
    );
  }
}

/**
 * Extract the file path from a Supabase storage URL
 */
function extractPathFromUrl(url: string): string | null {
  try {
    const match = url.match(new RegExp(`/storage/v1/object/public/${BUCKET_NAME}/(.+)$`));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
