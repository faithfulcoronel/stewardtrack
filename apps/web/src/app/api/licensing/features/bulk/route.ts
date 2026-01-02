import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { IFeatureCatalogRepository } from '@/repositories/featureCatalog.repository';

/**
 * PATCH /api/licensing/features/bulk
 * Bulk update features (e.g., activate/deactivate multiple features)
 *
 * Request body:
 * {
 *   ids: string[],          // Array of feature IDs to update
 *   updates: {              // Fields to update
 *     is_active?: boolean,
 *     tier?: string,
 *     category?: string
 *   }
 * }
 */
export async function PATCH(request: NextRequest) {
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
    const { ids, updates } = body;

    // Validate request
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Feature IDs array is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Only allow specific fields to be bulk updated
    const allowedFields = ['is_active', 'tier', 'category'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(f => !allowedFields.includes(f));

    if (invalidFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid fields for bulk update: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

    const featureCatalogRepository = container.get<IFeatureCatalogRepository>(TYPES.IFeatureCatalogRepository);

    // Update each feature
    const results: { success: string[]; failed: { id: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const id of ids) {
      try {
        await featureCatalogRepository.update(id, updates);
        results.success.push(id);
      } catch (error) {
        results.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const allSucceeded = results.failed.length === 0;
    const partialSuccess = results.success.length > 0 && results.failed.length > 0;

    return NextResponse.json({
      success: allSucceeded,
      data: results,
      message: allSucceeded
        ? `Successfully updated ${results.success.length} feature(s)`
        : partialSuccess
        ? `Updated ${results.success.length} feature(s), ${results.failed.length} failed`
        : `Failed to update features`,
    }, { status: allSucceeded ? 200 : partialSuccess ? 207 : 500 });
  } catch (error) {
    console.error('Error bulk updating features:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update features',
      },
      { status: 500 }
    );
  }
}
