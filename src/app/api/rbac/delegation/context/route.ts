import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    // In a real implementation, this would come from the authenticated user context
    const userId = request.headers.get('x-user-id') || 'current-user-id';

    const delegatedContext = await rbacService.getDelegatedContext(userId);

    if (!delegatedContext) {
      return NextResponse.json({
        success: false,
        error: 'No delegation permissions found'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: delegatedContext
    });
  } catch (error) {
    console.error('Error fetching delegation context:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegation context'
      },
      { status: 500 }
    );
  }
}