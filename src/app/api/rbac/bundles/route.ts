import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { CreatePermissionBundleDto } from '@/models/rbac.model';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const scopeFilter = searchParams.get('scope') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;

    const bundles = await rbacService.getPermissionBundles(tenantId, scopeFilter);

    return NextResponse.json({
      success: true,
      data: bundles
    });
  } catch (error) {
    console.error('Error fetching permission bundles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permission bundles'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body: CreatePermissionBundleDto = await request.json();

    // Validate required fields
    if (!body.name || !body.scope) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and scope are required'
        },
        { status: 400 }
      );
    }

    const bundle = await rbacService.createPermissionBundle(body);

    return NextResponse.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    console.error('Error creating permission bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create permission bundle'
      },
      { status: 500 }
    );
  }
}