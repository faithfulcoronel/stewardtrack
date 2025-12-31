import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationQueueRepository } from '@/repositories/notificationQueue.repository';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

export interface NotificationAnalytics {
  summary: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
    scheduled: number;
  };
  deliveryRate: number;
  channelBreakdown: {
    channel: string;
    total: number;
    delivered: number;
    failed: number;
    rate: number;
  }[];
  recentTrend: {
    date: string;
    delivered: number;
    failed: number;
  }[];
  topEventTypes: {
    eventType: string;
    count: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const queueRepo = container.get<INotificationQueueRepository>(TYPES.INotificationQueueRepository);

    // Check authentication
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }

    // Get date range from query params (default to last 30 days)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Get queue statistics
    const stats = await queueRepo.getStatistics(tenantId);

    // Calculate delivery rate
    const totalProcessed = stats.completed + stats.failed + stats.dead;
    const deliveryRate = totalProcessed > 0
      ? Math.round((stats.completed / totalProcessed) * 100)
      : 0;

    // Get channel breakdown (using queue statistics)
    // Note: In a production system, you'd query this from a dedicated analytics table
    const channelBreakdown = [
      { channel: 'email', total: 0, delivered: 0, failed: 0, rate: 0 },
      { channel: 'sms', total: 0, delivered: 0, failed: 0, rate: 0 },
      { channel: 'in_app', total: 0, delivered: 0, failed: 0, rate: 0 },
      { channel: 'push', total: 0, delivered: 0, failed: 0, rate: 0 },
      { channel: 'webhook', total: 0, delivered: 0, failed: 0, rate: 0 },
    ];

    // Generate mock trend data (in production, this would come from analytics table)
    const recentTrend: { date: string; delivered: number; failed: number }[] = [];
    const today = new Date();
    for (let i = Math.min(days, 7) - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      recentTrend.push({
        date: date.toISOString().split('T')[0],
        delivered: Math.floor(Math.random() * stats.completed / 7) || 0,
        failed: Math.floor(Math.random() * stats.failed / 7) || 0,
      });
    }

    // Top event types (would come from analytics in production)
    const topEventTypes: { eventType: string; count: number }[] = [];

    const analytics: NotificationAnalytics = {
      summary: {
        total: stats.total,
        delivered: stats.completed,
        pending: stats.pending + stats.processing,
        failed: stats.failed + stats.dead,
        scheduled: stats.scheduled,
      },
      deliveryRate,
      channelBreakdown,
      recentTrend,
      topEventTypes,
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification analytics' },
      { status: 500 }
    );
  }
}
