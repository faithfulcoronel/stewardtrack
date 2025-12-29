import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationService } from '@/services/notification/NotificationService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/notifications/[id]
 * Get a specific notification
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationService = container.get<INotificationService>(
      TYPES.NotificationService
    );

    const notification = await notificationService.getNotificationById(id);

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Verify ownership
    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error('[GET /api/notifications/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationService = container.get<INotificationService>(
      TYPES.NotificationService
    );

    await notificationService.deleteNotification(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/notifications/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
