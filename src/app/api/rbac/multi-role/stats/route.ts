import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(_request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    const stats = await rbacService.getMultiRoleStats();

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching multi-role stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch multi-role stats'
      },
      { status: 500 }
    );
  }
}