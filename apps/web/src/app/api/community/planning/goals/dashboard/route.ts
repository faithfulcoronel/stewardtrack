import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { handleError } from '@/utils/errorHandler';

/**
 * GET /api/community/planning/goals/dashboard
 * Get dashboard statistics for goals
 */
export async function GET(): Promise<NextResponse> {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const stats = await goalsService.getDashboardStats();

    return NextResponse.json({ data: stats });
  } catch (error) {
    const handledError = handleError(error, { context: 'GET /api/community/planning/goals/dashboard' });
    return NextResponse.json(
      { error: handledError.message },
      { status: 500 }
    );
  }
}
