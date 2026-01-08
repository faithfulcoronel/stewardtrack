import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

type RouteContext = { params: Promise<{ keyResultId: string }> };

/**
 * GET /api/community/planning/goals/key-results/[keyResultId]/progress
 * Get progress history for a key result
 */
export async function GET(
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
    const { searchParams } = new URL(request.url);

    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const history = await goalsService.getProgressHistory(keyResultId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return NextResponse.json({ data: history });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/key-results/[keyResultId]/progress' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/planning/goals/key-results/[keyResultId]/progress
 * Record a progress update for a key result
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

    const { keyResultId } = await context.params;
    const body = await request.json();

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const result = await goalsService.recordProgress({
      key_result_id: keyResultId,
      new_value: body.new_value,
      notes: body.notes,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const handledError = handleError(error, { context: 'POST /api/community/planning/goals/key-results/[keyResultId]/progress' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
