import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(_request: NextRequest) {
  try {
    const _rbacService = container.get<RbacService>(TYPES.RbacService);

    // Mock multi-role stats for demonstration
    const stats = {
      totalMultiRoleUsers: 12,
      activeMultiRoleUsers: 8,
      averageRolesPerUser: 2.4,
      conflictResolutions: 3,
      totalRoleAssignments: 29,
      recentAssignments: 5
    };

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