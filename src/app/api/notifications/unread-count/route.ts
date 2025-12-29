import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationService } from '@/services/notification/NotificationService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/unread-count
 * Get the unread notification count for the current user
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationService = container.get<INotificationService>(
      TYPES.NotificationService
    );

    const count = await notificationService.getUnreadCount(user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('[GET /api/notifications/unread-count] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
