import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { CreateSurfaceBindingDto } from '@/models/rbac.model';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    const bindings = await rbacService.getSurfaceBindings(tenantId);

    return NextResponse.json({
      success: true,
      data: bindings
    });
  } catch (error) {
    console.error('Error fetching surface bindings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch surface bindings'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body: CreateSurfaceBindingDto = await request.json();

    // Validate that either role_id or bundle_id is provided
    if (!body.role_id && !body.bundle_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either role_id or bundle_id is required'
        },
        { status: 400 }
      );
    }

    const binding = await rbacService.createSurfaceBinding(body);

    return NextResponse.json({
      success: true,
      data: binding
    });
  } catch (error) {
    console.error('Error creating surface binding:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create surface binding'
      },
      { status: 500 }
    );
  }
}