import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

/**
 * Available System Metrics for Auto-Linking
 *
 * These metrics can be linked to Key Results for automatic progress updates.
 * When a metric is linked, the system will periodically calculate the current
 * value from the source data and update the key result.
 */
interface AvailableMetric {
  id: string;
  category: string;
  name: string;
  description: string;
  type: 'number' | 'percentage' | 'currency' | 'boolean';
  unit?: string;
  source: string;
  requiresFeature?: string;
  isAvailable: boolean;
}

/**
 * GET /api/community/planning/goals/available-metrics
 * Get all available system metrics that can be linked to key results
 */
export async function GET(): Promise<NextResponse> {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define available metrics
    // In the future, availability could be checked against tenant's licensed features
    const metrics: AvailableMetric[] = [
      // Membership Metrics
      {
        id: 'members.total_count',
        category: 'Membership',
        name: 'Total Members',
        description: 'Total number of active members in the church',
        type: 'number',
        source: 'members',
        isAvailable: true,
      },
      {
        id: 'members.active_count',
        category: 'Membership',
        name: 'Active Members',
        description: 'Members with recent activity or engagement',
        type: 'number',
        source: 'members',
        isAvailable: true,
      },
      {
        id: 'members.new_this_month',
        category: 'Membership',
        name: 'New Members This Month',
        description: 'Members added in the current month',
        type: 'number',
        source: 'members',
        isAvailable: true,
      },
      {
        id: 'members.new_this_quarter',
        category: 'Membership',
        name: 'New Members This Quarter',
        description: 'Members added in the current quarter',
        type: 'number',
        source: 'members',
        isAvailable: true,
      },
      {
        id: 'members.new_this_year',
        category: 'Membership',
        name: 'New Members This Year',
        description: 'Members added in the current year',
        type: 'number',
        source: 'members',
        isAvailable: true,
      },

      // Household/Family Metrics
      {
        id: 'families.total_count',
        category: 'Households',
        name: 'Total Families',
        description: 'Total number of family units in the church',
        type: 'number',
        source: 'families',
        isAvailable: true,
      },

      // Attendance Metrics (requires attendance feature)
      {
        id: 'attendance.average_weekly',
        category: 'Attendance',
        name: 'Average Weekly Attendance',
        description: 'Average attendance across all services per week',
        type: 'number',
        source: 'attendance',
        requiresFeature: 'attendance.core',
        isAvailable: false, // TODO: Check if attendance feature is enabled
      },
      {
        id: 'attendance.total_services',
        category: 'Attendance',
        name: 'Total Services Held',
        description: 'Number of services held in the period',
        type: 'number',
        source: 'attendance',
        requiresFeature: 'attendance.core',
        isAvailable: false,
      },

      // Financial Metrics (requires finance feature)
      {
        id: 'donations.total_amount',
        category: 'Financial',
        name: 'Total Donations',
        description: 'Total donation amount in the period',
        type: 'currency',
        unit: 'PHP',
        source: 'donations',
        requiresFeature: 'finance.core',
        isAvailable: false, // TODO: Check if finance feature is enabled
      },
      {
        id: 'donations.donor_count',
        category: 'Financial',
        name: 'Unique Donors',
        description: 'Number of unique donors in the period',
        type: 'number',
        source: 'donations',
        requiresFeature: 'finance.core',
        isAvailable: false,
      },
      {
        id: 'donations.average_gift',
        category: 'Financial',
        name: 'Average Gift Amount',
        description: 'Average donation amount per gift',
        type: 'currency',
        unit: 'PHP',
        source: 'donations',
        requiresFeature: 'finance.core',
        isAvailable: false,
      },

      // Care & Engagement Metrics
      {
        id: 'care_plans.active_count',
        category: 'Care',
        name: 'Active Care Plans',
        description: 'Number of active care plans',
        type: 'number',
        source: 'care_plans',
        isAvailable: true,
      },
      {
        id: 'care_plans.completed_count',
        category: 'Care',
        name: 'Completed Care Plans',
        description: 'Number of care plans completed in the period',
        type: 'number',
        source: 'care_plans',
        isAvailable: true,
      },

      // Discipleship Metrics
      {
        id: 'discipleship.enrolled_count',
        category: 'Discipleship',
        name: 'Enrolled in Discipleship',
        description: 'Members currently in discipleship programs',
        type: 'number',
        source: 'discipleship_plans',
        isAvailable: true,
      },
      {
        id: 'discipleship.completed_count',
        category: 'Discipleship',
        name: 'Completed Discipleship',
        description: 'Members who completed discipleship programs',
        type: 'number',
        source: 'discipleship_plans',
        isAvailable: true,
      },

      // Events Metrics
      {
        id: 'events.scheduled_count',
        category: 'Events',
        name: 'Scheduled Events',
        description: 'Number of events scheduled in the period',
        type: 'number',
        source: 'events',
        isAvailable: true,
      },
      {
        id: 'events.total_registrations',
        category: 'Events',
        name: 'Total Event Registrations',
        description: 'Total registrations across all events',
        type: 'number',
        source: 'events',
        isAvailable: true,
      },

      // Volunteer Metrics
      {
        id: 'volunteers.active_count',
        category: 'Volunteers',
        name: 'Active Volunteers',
        description: 'Members currently serving as volunteers',
        type: 'number',
        source: 'volunteers',
        requiresFeature: 'volunteers.core',
        isAvailable: false,
      },
      {
        id: 'volunteers.hours_logged',
        category: 'Volunteers',
        name: 'Volunteer Hours',
        description: 'Total volunteer hours logged in the period',
        type: 'number',
        unit: 'hours',
        source: 'volunteers',
        requiresFeature: 'volunteers.core',
        isAvailable: false,
      },
    ];

    // Group metrics by category
    const categories = [...new Set(metrics.map((m) => m.category))];
    const groupedMetrics = categories.map((category) => ({
      category,
      metrics: metrics.filter((m) => m.category === category),
    }));

    return NextResponse.json({
      data: {
        metrics,
        groupedMetrics,
        categories,
      },
    });
  } catch (error) {
    const handledError = handleError(error, {
      context: 'GET /api/community/planning/goals/available-metrics',
    });
    return NextResponse.json({ error: handledError.message }, { status: 500 });
  }
}
