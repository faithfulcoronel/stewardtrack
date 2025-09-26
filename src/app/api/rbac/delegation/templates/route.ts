import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(_request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    const permissionTemplates = await rbacService.getPermissionTemplates();

    return NextResponse.json({
      success: true,
      data: permissionTemplates
    });
  } catch (error) {
    console.error('Error fetching permission templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permission templates'
      },
      { status: 500 }
    );
  }
}