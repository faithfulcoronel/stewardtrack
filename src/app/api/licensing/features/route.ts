import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { IFeatureCatalogRepository } from '@/repositories/featureCatalog.repository';

/**
 * GET /api/licensing/features
 * Gets all available features from the feature catalog
 */
export async function GET() {
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
    const features = await featureCatalogRepository.getFeatures({ is_active: true });

    const sortedFeatures = [...(features || [])].sort((a, b) => {
      const categoryCompare = (a.category || '').localeCompare(b.category || '');
      if (categoryCompare !== 0) return categoryCompare;
      return (a.code || '').localeCompare(b.code || '');
    });

    return NextResponse.json({
      success: true,
      data: sortedFeatures,
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch features',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/features
 * Create a new feature in the catalog
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Feature name is required' },
        { status: 400 }
      );
    }

    if (!body.tier) {
      return NextResponse.json(
        { success: false, error: 'License tier is required' },
        { status: 400 }
      );
    }

    const featureCatalogRepository = container.get<IFeatureCatalogRepository>(TYPES.IFeatureCatalogRepository);
    const feature = await featureCatalogRepository.createFeature({
      code: body.code || body.name.toLowerCase().replace(/\s+/g, '_'),
      name: body.name,
      description: body.description,
      tier: body.tier ?? null,
      category: body.category,
      is_active: body.is_active !== undefined ? body.is_active : true,
      is_delegatable: body.is_delegatable ?? false,
      phase: body.phase || '',
    });

    return NextResponse.json(
      {
        success: true,
        data: feature,
        message: 'Feature created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create feature',
      },
      { status: 500 }
    );
  }
}
