import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FamilyService } from '@/services/FamilyService';
import type { TenantService } from '@/services/TenantService';

/**
 * GET /api/families
 *
 * Fetches all families for the current tenant.
 * Supports optional search query parameter.
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    // Fetch families using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    let families;
    if (search) {
      families = await familyService.searchFamilies(tenant.id, search);
    } else {
      families = await familyService.getFamiliesByTenant(tenant.id);
    }

    // Return formatted response
    return NextResponse.json({
      data: families.map((family) => ({
        id: family.id,
        name: family.name,
        formal_name: family.formal_name,
        address_street: family.address_street,
        address_street2: family.address_street2,
        address_city: family.address_city,
        address_state: family.address_state,
        address_postal_code: family.address_postal_code,
        address_country: family.address_country,
        family_photo_url: family.family_photo_url,
        notes: family.notes,
        tags: family.tags,
      })),
    });
  } catch (error: unknown) {
    console.error('[GET /api/families] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch families';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/families
 *
 * Creates a new family for the current tenant.
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Family name is required' }, { status: 400 });
    }

    // Create family using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    const family = await familyService.createFamily({
      tenant_id: tenant.id,
      name: body.name,
      formal_name: body.formal_name,
      address_street: body.address_street,
      address_street2: body.address_street2,
      address_city: body.address_city,
      address_state: body.address_state,
      address_postal_code: body.address_postal_code,
      address_country: body.address_country,
      family_photo_url: body.family_photo_url,
      notes: body.notes,
      tags: body.tags,
    });

    return NextResponse.json({ data: family }, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/families] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
