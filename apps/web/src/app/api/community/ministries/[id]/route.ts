import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IMinistryService } from '@/services/MinistryService';
import type { MinistryUpdateInput } from '@/models/scheduler/ministry.model';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/community/ministries/[id]
 * Get a ministry by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);

    const ministry = await ministryService.getById(id);

    if (!ministry) {
      return NextResponse.json({ success: false, error: 'Ministry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ministry });
  } catch (error) {
    console.error('Error fetching ministry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch ministry' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/community/ministries/[id]
 * Update a ministry
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);
    const body: MinistryUpdateInput = await request.json();

    const ministry = await ministryService.updateMinistry(id, body, undefined, authResult.user?.id);

    return NextResponse.json({ success: true, data: ministry });
  } catch (error) {
    console.error('Error updating ministry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update ministry' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/ministries/[id]
 * Delete (soft delete) a ministry
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);

    await ministryService.deleteMinistry(id);

    return NextResponse.json({ success: true, message: 'Ministry deleted' });
  } catch (error) {
    console.error('Error deleting ministry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete ministry' },
      { status: 500 }
    );
  }
}
