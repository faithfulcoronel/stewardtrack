import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import {
  UpdateProductOfferingDto,
  type ProductOfferingWithFeatures,
  type ProductOfferingWithBundles,
  type ProductOfferingComplete,
} from '@/models/productOffering.model';
import { checkSuperAdmin } from '@/utils/authUtils';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PUBLIC_PRODUCT_OFFERINGS_RPC = 'get_public_product_offerings';

type PublicProductOfferingRow = Record<string, any>;

function normalizeCount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBooleanParam(value: string | null): boolean {
  return value === 'true';
}

async function getPublicProductOffering(
  supabase: SupabaseClient,
  options: { includeFeatures: boolean; includeBundles: boolean; includeComplete: boolean; id: string }
) {
  const { includeFeatures, includeBundles, includeComplete, id } = options;

  const { data, error } = await supabase.rpc(PUBLIC_PRODUCT_OFFERINGS_RPC, {
    include_features: includeFeatures || includeComplete,
    include_bundles: includeBundles || includeComplete,
    target_tier: null,
    target_id: id,
  });

  if (error) {
    throw new Error(`Failed to load public product offering: ${error.message}`);
  }

  const rows = Array.isArray(data) ? (data as PublicProductOfferingRow[]) : [];
  if (!rows.length) {
    return null;
  }

  const row = rows[0];

  return {
    ...row,
    features: Array.isArray(row?.features) ? row.features : [],
    bundles: Array.isArray(row?.bundles) ? row.bundles : [],
    feature_count: normalizeCount(row?.feature_count),
    bundle_count: normalizeCount(row?.bundle_count),
  };
}

async function resolveAuthenticatedOffering(
  licensingService: LicensingService,
  id: string,
  options: { includeFeatures: boolean; includeBundles: boolean; includeComplete: boolean }
): Promise<ProductOfferingWithFeatures | ProductOfferingWithBundles | ProductOfferingComplete | null> {
  const { includeFeatures, includeBundles, includeComplete } = options;

  if (includeComplete) {
    return await licensingService.getProductOfferingComplete(id);
  }
  if (includeBundles) {
    return await licensingService.getProductOfferingWithBundles(id);
  }
  if (includeFeatures) {
    return await licensingService.getProductOfferingWithFeatures(id);
  }

  return await licensingService.getProductOffering(id);
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/product-offerings/:id
 * Retrieves a single product offering by ID
 *
 * Query params:
 * - withFeatures: Include individual features
 * - withBundles: Include bundles
 * - complete: Include both bundles and features
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const withFeatures = parseBooleanParam(searchParams.get('withFeatures'));
    const withBundles = parseBooleanParam(searchParams.get('withBundles'));
    const complete = parseBooleanParam(searchParams.get('complete'));

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error retrieving Supabase session for product offerings detail route:', sessionError);
    }

    const isAuthenticated = !!sessionData?.session;

    if (!isAuthenticated) {
      const publicOffering = await getPublicProductOffering(supabase, {
        id,
        includeFeatures: withFeatures,
        includeBundles: withBundles,
        includeComplete: complete,
      });

      if (!publicOffering) {
        return NextResponse.json(
          {
            success: false,
            error: 'Product offering not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: publicOffering,
      });
    }

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);
    const offering = await resolveAuthenticatedOffering(licensingService, id, {
      includeFeatures: withFeatures,
      includeBundles: withBundles,
      includeComplete: complete,
    });

    if (!offering) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product offering not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offering,
    });
  } catch (error) {
    console.error('Error fetching product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product offering',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/licensing/product-offerings/:id
 * Updates a product offering
 *
 * Body can include bundle_ids and feature_ids arrays to update assignments
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    const { isAuthorized } = await checkSuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Super admin access required.',
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: UpdateProductOfferingDto & { bundle_ids?: string[]; feature_ids?: string[] } = await request.json();
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Extract bundle_ids and feature_ids before updating the offering
    const bundleIds = body.bundle_ids;
    const featureIds = body.feature_ids;
    const offeringData = { ...body };
    delete (offeringData as any).bundle_ids;
    delete (offeringData as any).feature_ids;

    // Update the offering
    const offering = await licensingService.updateProductOffering(id, offeringData);

    // Handle bundle updates if provided
    if (bundleIds !== undefined) {
      // Get current bundles
      const currentBundles = await licensingService.getOfferingBundles(id);
      const currentBundleIds = currentBundles.map((b: any) => b.id);

      // Determine changes
      const bundlesToAdd = bundleIds.filter(bundleId => !currentBundleIds.includes(bundleId));
      const bundlesToRemove = currentBundleIds.filter(bundleId => !bundleIds.includes(bundleId));

      // Remove bundles
      for (const bundleId of bundlesToRemove) {
        try {
          await licensingService.removeBundleFromOffering(id, bundleId);
        } catch (error) {
          console.error(`Failed to remove bundle ${bundleId}:`, error);
        }
      }

      // Add bundles
      for (let i = 0; i < bundlesToAdd.length; i++) {
        try {
          await licensingService.addBundleToOffering(id, bundlesToAdd[i], true, i);
        } catch (error) {
          console.error(`Failed to add bundle ${bundlesToAdd[i]}:`, error);
        }
      }
    }

    // Handle feature updates if provided
    if (featureIds !== undefined) {
      // Get current features
      const currentOffering = await licensingService.getProductOfferingWithFeatures(id);
      const currentFeatureIds = (currentOffering.features || []).map((f: any) => f.id);

      // Determine changes
      const featuresToAdd = featureIds.filter(featureId => !currentFeatureIds.includes(featureId));
      const featuresToRemove = currentFeatureIds.filter(featureId => !featureIds.includes(featureId));

      // Remove features
      for (const featureId of featuresToRemove) {
        try {
          await licensingService.removeFeatureFromOffering(id, featureId);
        } catch (error) {
          console.error(`Failed to remove feature ${featureId}:`, error);
        }
      }

      // Add features
      for (const featureId of featuresToAdd) {
        try {
          await licensingService.addFeatureToOffering(id, featureId, true);
        } catch (error) {
          console.error(`Failed to add feature ${featureId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: offering,
    });
  } catch (error) {
    console.error('Error updating product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product offering',
      },
      { status: 500 }
    );
  }
}
