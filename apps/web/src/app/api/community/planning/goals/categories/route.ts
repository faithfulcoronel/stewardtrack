import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalCategoryService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

/**
 * GET /api/community/planning/goals/categories
 * Get all goal categories for the tenant
 */
export async function GET(): Promise<NextResponse> {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoryService = container.get<IGoalCategoryService>(TYPES.GoalCategoryService);
    const categories = await categoryService.getAll();

    return NextResponse.json({ data: categories });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/categories' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/planning/goals/categories
 * Create a new goal category
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoryService = container.get<IGoalCategoryService>(TYPES.GoalCategoryService);
    const body = await request.json();

    const category = await categoryService.create(body);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    const handledError = handleError(error, { context: 'POST /api/community/planning/goals/categories' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
