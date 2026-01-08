import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

type RouteContext = { params: Promise<{ objectiveId: string }> };

/**
 * GET /api/community/planning/goals/objectives/[objectiveId]
 * Get a single objective with its key results
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
    const objective = await goalsService.getObjectiveWithKeyResults(objectiveId);

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    return NextResponse.json({ data: objective });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/objectives/[objectiveId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/community/planning/goals/objectives/[objectiveId]
 * Update an objective
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

    const { objectiveId } = await context.params;
    const body = await request.json();

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const objective = await goalsService.updateObjective(objectiveId, body);

    return NextResponse.json({ data: objective });
  } catch (error) {
    const handledError = handleError(error, { context: 'PUT /api/community/planning/goals/objectives/[objectiveId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/planning/goals/objectives/[objectiveId]
 * Delete an objective
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

    const { objectiveId } = await context.params;

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    await goalsService.deleteObjective(objectiveId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const handledError = handleError(error, { context: 'DELETE /api/community/planning/goals/objectives/[objectiveId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
