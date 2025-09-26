import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const userId = request.headers.get('x-user-id') || 'current-user-id';

    const scopes = await rbacService.getDelegationScopes(userId);

    return NextResponse.json({
      success: true,
      data: scopes
    });
  } catch (error) {
    console.error('Error fetching delegation scopes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegation scopes'
      },
      { status: 500 }
    );
  }
}