import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const phase = searchParams.get('phase') || undefined;
    const isActive = searchParams.get('is_active') === 'true' ? true :
                     searchParams.get('is_active') === 'false' ? false : undefined;

    const features = await rbacService.getFeatures({
      category,
      phase,
      is_active: isActive
    });

    return NextResponse.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch features'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    const feature = await rbacService.createFeature(body);

    return NextResponse.json({
      success: true,
      data: feature
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create feature'
      },
      { status: 500 }
    );
  }
}