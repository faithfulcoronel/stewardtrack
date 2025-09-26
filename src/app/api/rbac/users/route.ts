import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(_request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    const users = await rbacService.getUsers();

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      },
      { status: 500 }
    );
  }
}