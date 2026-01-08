import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalCategoryService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

type RouteContext = { params: Promise<{ categoryId: string }> };

/**
 * GET /api/community/planning/goals/categories/[categoryId]
 * Get a single category
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = await context.params;

    const categoryService = container.get<IGoalCategoryService>(TYPES.GoalCategoryService);
    const category = await categoryService.getById(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ data: category });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/categories/[categoryId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/community/planning/goals/categories/[categoryId]
 * Update a category
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = await context.params;
    const body = await request.json();

    const categoryService = container.get<IGoalCategoryService>(TYPES.GoalCategoryService);
    const category = await categoryService.update(categoryId, body);

    return NextResponse.json({ data: category });
  } catch (error) {
    const handledError = handleError(error, { context: 'PUT /api/community/planning/goals/categories/[categoryId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/planning/goals/categories/[categoryId]
 * Delete a category
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = await context.params;

    const categoryService = container.get<IGoalCategoryService>(TYPES.GoalCategoryService);

    // Check if category is in use
    const inUse = await categoryService.isInUse(categoryId);
    if (inUse) {
      return NextResponse.json(
        { error: 'Cannot delete category that is in use by goals' },
        { status: 400 }
      );
    }

    await categoryService.delete(categoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const handledError = handleError(error, { context: 'DELETE /api/community/planning/goals/categories/[categoryId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
