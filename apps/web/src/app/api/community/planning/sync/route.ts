import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PlanningService } from '@/services/PlanningService';
import type { AuthorizationService } from '@/services/AuthorizationService';

/**
 * POST /api/community/planning/sync
 * Sync calendar events from care plans and discipleship plans
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planningService = container.get<PlanningService>(TYPES.PlanningService);

    // First, ensure default categories exist
    await planningService.seedDefaultCategories();

    // Sync from all sources
    const result = await planningService.syncAllSources();

    return NextResponse.json({
      success: true,
      synced: result,
      message: `Synced ${result.carePlans} care plans, ${result.discipleshipPlans} discipleship plans, ${result.birthdays} birthdays, and ${result.anniversaries} anniversaries`,
    });
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar events' },
      { status: 500 }
    );
  }
}
