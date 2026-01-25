import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { ISchedulerService } from '@/services/SchedulerService';
import type { StorageService } from '@/services/StorageService';
import { getCurrentTenantId } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ id: string }> };

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

    // Get storage service from container (single source of truth for all uploads)
    const storageService = container.get<StorageService>(TYPES.StorageService);

    // Delete existing cover photo if present
    if (schedule.cover_photo_url) {
      try {
        await storageService.deleteScheduleCover(schedule.cover_photo_url);
      } catch (deleteError) {
        console.error('Error deleting old cover photo:', deleteError);
        // Continue anyway
      }
    }

    // Upload new cover photo using storage service (handles validation and tracking automatically)
    const uploadResult = await storageService.uploadScheduleCover(tenantId, scheduleId, file);

    // Update schedule with cover photo URL
    const supabase = await createSupabaseServerClient();
    const { error: updateError } = await supabase
      .from('ministry_schedules')
      .update({ cover_photo_url: uploadResult.publicUrl })
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
      url: uploadResult.publicUrl,
    });
  } catch (error) {
    console.error('Error uploading cover photo:', error);

    const message = error instanceof Error ? error.message : 'Failed to upload cover photo';

    // Return user-friendly error messages for validation errors
    if (message.includes('Invalid file type') || message.includes('File too large')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: message },
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

    // Delete from storage if exists
    if (schedule.cover_photo_url) {
      try {
        const storageService = container.get<StorageService>(TYPES.StorageService);
        await storageService.deleteScheduleCover(schedule.cover_photo_url);
      } catch (deleteError) {
        console.error('Error deleting cover photo from storage:', deleteError);
        // Continue anyway to clear the URL from schedule record
      }
    }

    // Update schedule to remove cover photo URL
    const supabase = await createSupabaseServerClient();
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
