import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    const publishingStatus = await rbacService.getMetadataPublishingStatus(tenantId);

    return NextResponse.json({
      success: true,
      data: publishingStatus
    });
  } catch (error) {
    console.error('Error fetching metadata publishing status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metadata publishing status'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;
    const { action, metadata } = await request.json();

    let result;
    switch (action) {
      case 'compile':
        result = await rbacService.compileMetadata(tenantId, metadata);
        break;
      case 'validate':
        result = await rbacService.validateMetadata(tenantId, metadata);
        break;
      case 'publish':
        result = await rbacService.publishMetadata(tenantId, metadata);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action specified'
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error managing metadata publishing:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage metadata publishing'
      },
      { status: 500 }
    );
  }
}