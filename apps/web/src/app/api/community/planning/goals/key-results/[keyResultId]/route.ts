import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

type RouteContext = { params: Promise<{ keyResultId: string }> };

/**
 * GET /api/community/planning/goals/key-results/[keyResultId]
 * Get a single key result
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

    const { keyResultId } = await context.params;

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const keyResult = await goalsService.getKeyResultById(keyResultId);

    if (!keyResult) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    return NextResponse.json({ data: keyResult });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/key-results/[keyResultId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/community/planning/goals/key-results/[keyResultId]
 * Update a key result
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

    const { keyResultId } = await context.params;
    const body = await request.json();

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const keyResult = await goalsService.updateKeyResult(keyResultId, body);

    return NextResponse.json({ data: keyResult });
  } catch (error) {
    const handledError = handleError(error, { context: 'PUT /api/community/planning/goals/key-results/[keyResultId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/planning/goals/key-results/[keyResultId]
 * Delete a key result
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

    const { keyResultId } = await context.params;

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    await goalsService.deleteKeyResult(keyResultId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const handledError = handleError(error, { context: 'DELETE /api/community/planning/goals/key-results/[keyResultId]' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
