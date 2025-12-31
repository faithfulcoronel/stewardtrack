import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PlanningService } from '@/services/PlanningService';
import type { AuthorizationService } from '@/services/AuthorizationService';

/**
 * GET /api/community/planning/categories
 * Get all calendar categories
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planningService = container.get<PlanningService>(TYPES.PlanningService);
    const categories = await planningService.getCategories();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching calendar categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/planning/categories
 * Create a new calendar category
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planningService = container.get<PlanningService>(TYPES.PlanningService);
    const body = await request.json();

    const category = await planningService.createCategory(body);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar category:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar category' },
      { status: 500 }
    );
  }
}
