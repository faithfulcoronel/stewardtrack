import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getCurrentTenantId } from '@/lib/server/context';

export async function POST(request: NextRequest) {
  try {
    await getCurrentTenantId(); // Validate tenant access
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    const { role_ids } = body;

    if (!role_ids || !Array.isArray(role_ids) || role_ids.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least 2 role_ids are required for conflict analysis'
        },
        { status: 400 }
      );
    }

    const conflicts = await rbacService.analyzeRoleConflicts(role_ids);

    return NextResponse.json({
      success: true,
      data: {
        conflicts,
        has_conflicts: conflicts.length > 0,
        high_severity_conflicts: conflicts.filter(c => c.severity === 'high').length
      }
    });
  } catch (error) {
    console.error('Error analyzing role conflicts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze role conflicts'
      },
      { status: 500 }
    );
  }
}