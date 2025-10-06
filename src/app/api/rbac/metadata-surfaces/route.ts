import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get('module') || undefined;
    const phase = searchParams.get('phase') || undefined;
    const surfaceType = searchParams.get('surface_type') || undefined;

    const surfaces = await rbacService.getMetadataSurfaces({
      module: moduleParam,
      phase,
      surface_type: surfaceType
    });

    return NextResponse.json({
      success: true,
      data: surfaces
    });
  } catch (error) {
    console.error('Error fetching metadata surfaces:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metadata surfaces'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    const surface = await rbacService.createMetadataSurface(body);

    return NextResponse.json({
      success: true,
      data: surface
    });
  } catch (error) {
    console.error('Error creating metadata surface:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create metadata surface'
      },
      { status: 500 }
    );
  }
}