import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationQueueRepository } from '@/repositories/notificationQueue.repository';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/notifications/scheduled/[id]
 * Get a specific scheduled notification
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const queueRepository = container.get<INotificationQueueRepository>(TYPES.INotificationQueueRepository);
    const item = await queueRepository.findById(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Scheduled notification not found' },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (item.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Scheduled notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('[GET /api/notifications/scheduled/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/scheduled/[id]
 * Cancel a scheduled notification
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const queueRepository = container.get<INotificationQueueRepository>(TYPES.INotificationQueueRepository);
    const item = await queueRepository.findById(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Scheduled notification not found' },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (item.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Scheduled notification not found' },
        { status: 404 }
      );
    }

    // Can only cancel pending items
    if (item.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel notification with status '${item.status}'` },
        { status: 400 }
      );
    }

    // Mark as dead (cancelled)
    await queueRepository.markDead(id, 'Cancelled by user');

    return NextResponse.json({
      success: true,
      message: 'Scheduled notification cancelled',
    });
  } catch (error) {
    console.error('[DELETE /api/notifications/scheduled/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel scheduled notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/scheduled/[id]
 * Update a scheduled notification (reschedule)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const { scheduled_for } = body;

    if (!scheduled_for) {
      return NextResponse.json(
        { error: 'New scheduled time is required' },
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

    const queueRepository = container.get<INotificationQueueRepository>(TYPES.INotificationQueueRepository);
    const item = await queueRepository.findById(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Scheduled notification not found' },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (item.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Scheduled notification not found' },
        { status: 404 }
      );
    }

    // Can only reschedule pending items
    if (item.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot reschedule notification with status '${item.status}'` },
        { status: 400 }
      );
    }

    // Update the scheduled time
    const updatedItem = await queueRepository.update(id, {
      scheduled_for: scheduledDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: `Notification rescheduled to ${scheduledDate.toLocaleString()}`,
    });
  } catch (error) {
    console.error('[PATCH /api/notifications/scheduled/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reschedule notification' },
      { status: 500 }
    );
  }
}
