import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(_request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    const users = await rbacService.getMultiRoleUsers();

    // Transform data to match frontend MultiRoleUser interface
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      primary_role: user.roles && user.roles.length > 0 ? user.roles[0] : null,
      secondary_roles: user.roles && user.roles.length > 1 ? user.roles.slice(1) : [],
      effective_permissions: [], // TODO: Calculate effective permissions
      multi_role_context: null, // TODO: Get multi-role context if needed
      campus_assignments: [], // TODO: Get campus assignments
      ministry_assignments: [], // TODO: Get ministry assignments
      is_multi_role_enabled: user.roles && user.roles.length > 1
    }));

    return NextResponse.json({
      success: true,
      data: transformedUsers
    });
  } catch (error) {
    console.error('Error fetching multi-role users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch multi-role users'
      },
      { status: 500 }
    );
  }
}