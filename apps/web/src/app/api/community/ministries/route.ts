import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IMinistryService } from '@/services/MinistryService';
import type { MinistryFilters, MinistryCreateInput } from '@/models/scheduler/ministry.model';

/**
 * GET /api/community/ministries
 * Get all ministries with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);

    const { searchParams } = new URL(request.url);

    // Build filters
    const filters: MinistryFilters = {};

    const category = searchParams.get('category');
    if (category) filters.category = category as MinistryFilters['category'];

    const isActive = searchParams.get('is_active');
    if (isActive !== null) filters.isActive = isActive === 'true';

    const leaderId = searchParams.get('leader_id');
    if (leaderId) filters.leaderId = leaderId;

    const search = searchParams.get('search');
    if (search) filters.search = search;

    const includeTeamCounts = searchParams.get('include_team_counts') === 'true';

    let data;
    if (includeTeamCounts) {
      const ministriesWithCounts = await ministryService.getWithTeamCounts();
      data = ministryService.toMinistryViewList(ministriesWithCounts);
    } else if (Object.keys(filters).length > 0) {
      data = await ministryService.getByFilters(filters);
    } else {
      data = await ministryService.getAll();
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching ministries:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch ministries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/ministries
 * Create a new ministry
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);
    const body: MinistryCreateInput = await request.json();

    // Basic validation
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      );
    }

    const ministry = await ministryService.createMinistry(body, undefined, authResult.user?.id);

    return NextResponse.json({ success: true, data: ministry }, { status: 201 });
  } catch (error) {
    console.error('Error creating ministry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create ministry' },
      { status: 500 }
    );
  }
}
