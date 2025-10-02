import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(_request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    const stats = await rbacService.getMultiRoleStats();

    // Transform snake_case to camelCase for frontend
    const transformedStats = {
      totalUsers: stats.total_users || 0,
      multiRoleUsers: stats.users_with_multiple_roles || 0,
      averageRolesPerUser: stats.avg_roles_per_user || 0,
      roleConflicts: stats.potential_conflicts || 0,
      effectivePermissions: 0, // Not currently calculated
      crossMinistryUsers: 0 // Not currently calculated
    };

    return NextResponse.json({
      success: true,
      data: transformedStats
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