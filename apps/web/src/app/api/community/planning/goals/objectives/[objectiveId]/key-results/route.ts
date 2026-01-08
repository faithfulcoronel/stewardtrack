import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

type RouteContext = { params: Promise<{ objectiveId: string }> };

/**
 * GET /api/community/planning/goals/objectives/[objectiveId]/key-results
 * Get all key results for an objective
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

    const { objectiveId } = await context.params;

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const keyResults = await goalsService.getKeyResultsByObjectiveId(objectiveId);

    return NextResponse.json({ data: keyResults });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/objectives/[objectiveId]/key-results' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/planning/goals/objectives/[objectiveId]/key-results
 * Create a new key result for an objective
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

    const { objectiveId } = await context.params;
    const body = await request.json();

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const keyResult = await goalsService.createKeyResult({
      ...body,
      objective_id: objectiveId,
    });

    return NextResponse.json({ data: keyResult }, { status: 201 });
  } catch (error) {
    const handledError = handleError(error, { context: 'POST /api/community/planning/goals/objectives/[objectiveId]/key-results' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
