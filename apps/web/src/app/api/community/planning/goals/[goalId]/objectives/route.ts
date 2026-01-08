import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

type RouteContext = { params: Promise<{ goalId: string }> };

/**
 * GET /api/community/planning/goals/[goalId]/objectives
 * Get all objectives for a goal
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
    const objectives = await goalsService.getObjectivesByGoalId(goalId);

    return NextResponse.json({ data: objectives });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/[goalId]/objectives' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/planning/goals/[goalId]/objectives
 * Create a new objective for a goal
 */
export async function POST(
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
    const objective = await goalsService.createObjective({
      ...body,
      goal_id: goalId,
    });

    return NextResponse.json({ data: objective }, { status: 201 });
  } catch (error) {
    const handledError = handleError(error, { context: 'POST /api/community/planning/goals/[goalId]/objectives' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
