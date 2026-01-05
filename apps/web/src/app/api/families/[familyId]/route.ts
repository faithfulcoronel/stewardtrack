import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FamilyService } from '@/services/FamilyService';
import type { TenantService } from '@/services/TenantService';

interface RouteParams {
  params: Promise<{ familyId: string }>;
}

/**
 * GET /api/families/[familyId]
 *
 * Fetches a single family by ID with its members.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { familyId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Fetch family with members using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);
    const family = await familyService.getFamilyWithMembers(familyId, tenant.id);

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    return NextResponse.json({ data: family });
  } catch (error: unknown) {
    console.error('[GET /api/families/[familyId]] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/families/[familyId]
 *
 * Updates a family by ID.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { familyId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Verify family exists and belongs to tenant
    const familyService = container.get<FamilyService>(TYPES.FamilyService);
    const existingFamily = await familyService.getFamilyByIdAndTenant(familyId, tenant.id);

    if (!existingFamily) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    // Update family
    const family = await familyService.updateFamily(familyId, {
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

    return NextResponse.json({ data: family });
  } catch (error: unknown) {
    console.error('[PUT /api/families/[familyId]] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/families/[familyId]
 *
 * Soft deletes a family by ID.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { familyId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Verify family exists and belongs to tenant
    const familyService = container.get<FamilyService>(TYPES.FamilyService);
    const existingFamily = await familyService.getFamilyByIdAndTenant(familyId, tenant.id);

    if (!existingFamily) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Delete family
    await familyService.deleteFamily(familyId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[DELETE /api/families/[familyId]] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
