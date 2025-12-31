import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationService } from '@/services/notification/NotificationService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the current user
 */
export async function GET() {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const notificationService = container.get<INotificationService>(
      TYPES.NotificationService
    );

    const preferences = await notificationService.getUserPreferences(user.id, tenantId);

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('[GET /api/notifications/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Create or update a notification preference
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
    const { category, channel, enabled, digest_frequency, quiet_hours_start, quiet_hours_end, quiet_hours_timezone } = body;

    if (!category || !channel) {
      return NextResponse.json(
        { error: 'Category and channel are required' },
        { status: 400 }
      );
    }

    const notificationService = container.get<INotificationService>(
      TYPES.NotificationService
    );

    const preference = await notificationService.upsertPreference(user.id, tenantId, {
      category,
      channel,
      enabled: enabled ?? true,
      digest_frequency,
      quiet_hours_start,
      quiet_hours_end,
      quiet_hours_timezone,
    });

    return NextResponse.json({ preference });
  } catch (error) {
    console.error('[POST /api/notifications/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/preferences
 * Reset all preferences to defaults
 */
export async function DELETE() {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const notificationService = container.get<INotificationService>(
      TYPES.NotificationService
    );

    await notificationService.resetPreferencesToDefaults(user.id, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/notifications/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset notification preferences' },
      { status: 500 }
    );
  }
}
