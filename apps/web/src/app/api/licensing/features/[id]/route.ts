import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { IFeatureCatalogRepository } from '@/repositories/featureCatalog.repository';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/features/[id]
 * Get a single feature by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const { id } = await params;
    const featureCatalogRepository = container.get<IFeatureCatalogRepository>(TYPES.IFeatureCatalogRepository);

    const feature = await featureCatalogRepository.getById(id);

    if (!feature) {
      return NextResponse.json(
        { success: false, error: 'Feature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    console.error('Error fetching feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch feature',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/licensing/features/[id]
 * Delete a feature
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const featureCatalogRepository = container.get<IFeatureCatalogRepository>(TYPES.IFeatureCatalogRepository);
    const { id } = await params;

    await featureCatalogRepository.deleteFeature(id);

    return NextResponse.json({
      success: true,
      message: 'Feature deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete feature',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/licensing/features/[id]
 * Update a feature
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const featureCatalogRepository = container.get<IFeatureCatalogRepository>(TYPES.IFeatureCatalogRepository);

    const feature = await featureCatalogRepository.update(id, {
      name: body.name,
      description: body.description,
      tier: body.tier,
      category: body.category,
      code: body.code || null,
      is_active: body.is_active,
      phase: body.phase,
      is_delegatable: body.is_delegatable,
    });

    return NextResponse.json({
      success: true,
      data: feature,
      message: 'Feature updated successfully',
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update feature',
      },
      { status: 500 }
    );
  }
}
