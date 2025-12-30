import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationQueueService } from '@/services/notification/NotificationQueueService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/notifications/scheduled
 * List scheduled notifications for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const queueService = container.get<INotificationQueueService>(TYPES.INotificationQueueService);

    // Get pending items that are scheduled for future delivery
    const items = await queueService.getPendingItems({
      tenantId,
      includeScheduled: true,
      batchSize: 100,
    });

    // Filter to only show scheduled items (those with future scheduled_for)
    const now = new Date().toISOString();
    const scheduledItems = items.filter(
      (item) => item.scheduled_for && item.scheduled_for > now
    );

    return NextResponse.json({
      success: true,
      data: scheduledItems,
      count: scheduledItems.length,
    });
  } catch (error) {
    console.error('[GET /api/notifications/scheduled] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/scheduled
 * Create a new scheduled notification
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const {
      event_type,
      recipient_id,
      channel,
      payload,
      scheduled_for,
      priority = 0,
    } = body;

    // Validate required fields
    if (!event_type) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    if (!recipient_id) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      );
    }

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel is required' },
        { status: 400 }
      );
    }

    if (!scheduled_for) {
      return NextResponse.json(
        { error: 'Scheduled date/time is required' },
        { status: 400 }
      );
    }

    // Validate scheduled_for is in the future
    const scheduledDate = new Date(scheduled_for);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    const queueService = container.get<INotificationQueueService>(TYPES.INotificationQueueService);

    // Generate a unique event ID
    const eventId = crypto.randomUUID();

    const queueItem = await queueService.enqueue({
      event_type,
      event_id: eventId,
      tenant_id: tenantId,
      recipient_id,
      channel,
      payload: payload || {},
      priority,
      scheduled_for: scheduledDate.toISOString(),
      correlation_id: crypto.randomUUID(),
    });

    return NextResponse.json({
      success: true,
      data: queueItem,
      message: `Notification scheduled for ${scheduledDate.toLocaleString()}`,
    });
  } catch (error) {
    console.error('[POST /api/notifications/scheduled] Error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule notification' },
      { status: 500 }
    );
  }
}
