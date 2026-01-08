import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

type RouteContext = { params: Promise<{ goalId: string }> };

/**
 * GET /api/community/planning/goals/[goalId]
 * Get a single goal with full details
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

    const { goalId } = await context.params;

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const goal = await goalsService.getGoalWithDetails(goalId);

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ data: goal });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/[goalId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/community/planning/goals/[goalId]
 * Update a goal
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

    const { goalId } = await context.params;
    const body = await request.json();

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const goal = await goalsService.updateGoal(goalId, body);

    return NextResponse.json({ data: goal });
  } catch (error) {
    const handledError = handleError(error, { context: 'PUT /api/community/planning/goals/[goalId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/planning/goals/[goalId]
 * Delete a goal (soft delete)
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

    const { goalId } = await context.params;

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    await goalsService.deleteGoal(goalId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const handledError = handleError(error, { context: 'DELETE /api/community/planning/goals/[goalId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
