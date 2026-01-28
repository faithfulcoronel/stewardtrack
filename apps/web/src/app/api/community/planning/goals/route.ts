import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IGoalsService } from '@/services/goals';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { GoalFilters, GoalQueryOptions } from '@/models/goals';

/**
 * GET /api/community/planning/goals
 * Get goals with optional filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

    const { searchParams } = new URL(request.url);

    // Build filters
    const filters: GoalFilters = {};
    const categoryId = searchParams.get('category_id');
    if (categoryId) filters.category_id = categoryId;

    const status = searchParams.get('status');
    if (status) {
      filters.status = status.includes(',')
        ? (status.split(',') as GoalFilters['status'])
        : (status as GoalFilters['status']);
    }

    const visibility = searchParams.get('visibility');
    if (visibility) filters.visibility = visibility as GoalFilters['visibility'];

    const ownerId = searchParams.get('owner_id');
    if (ownerId) filters.owner_id = ownerId;

    const search = searchParams.get('search');
    if (search) filters.search = search;

    const startDateFrom = searchParams.get('start_date_from');
    if (startDateFrom) filters.start_date_from = startDateFrom;

    const startDateTo = searchParams.get('start_date_to');
    if (startDateTo) filters.start_date_to = startDateTo;

    const targetDateFrom = searchParams.get('target_date_from');
    if (targetDateFrom) filters.target_date_from = targetDateFrom;

    const targetDateTo = searchParams.get('target_date_to');
    if (targetDateTo) filters.target_date_to = targetDateTo;

    const tags = searchParams.get('tags');
    if (tags) filters.tags = tags.split(',');

    // Build query options
    const options: GoalQueryOptions = {};
    const sortBy = searchParams.get('sort_by');
    const validSortFields = ['title', 'target_date', 'overall_progress', 'created_at', 'updated_at'] as const;
    if (sortBy && validSortFields.includes(sortBy as typeof validSortFields[number])) {
      options.sort_by = sortBy as typeof validSortFields[number];
    }

    const sortOrder = searchParams.get('sort_order');
    if (sortOrder) options.sort_order = sortOrder as 'asc' | 'desc';

    const limit = searchParams.get('limit');
    if (limit) options.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) options.offset = parseInt(offset, 10);

    const includeOwner = searchParams.get('include_owner');
    if (includeOwner === 'false') options.include_owner = false;

    const includeCounts = searchParams.get('include_counts');
    if (includeCounts === 'false') options.include_counts = false;

    const { data, total } = await goalsService.getGoals(filters, options);

    return NextResponse.json({
      data,
      total,
      page: options.offset ? Math.floor(options.offset / (options.limit || 20)) + 1 : 1,
      pageSize: options.limit || 20,
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/planning/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check for goals:manage permission
    // const hasPermission = await authService.hasPermission('goals:manage');
    // if (!hasPermission) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const body = await request.json();

    const goal = await goalsService.createGoal(body);
    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create goal' },
      { status: 500 }
    );
  }
}
