import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { TenantService } from '@/services/TenantService';
import { AuthorizationService } from '@/services/AuthorizationService';

interface UpdateTenantRequest {
  name?: string;
  address?: string;
  contact_number?: string;
  phone?: string; // Alias for contact_number
  email?: string;
  website?: string;
  logo_url?: string;
}

/**
 * PUT/PATCH /api/tenant/update
 *
 * Updates the current tenant's information.
 */
async function handleUpdate(request: NextRequest) {
  try {
    const body: UpdateTenantRequest = await request.json();
    const { name, address, contact_number, phone, email, website, logo_url } = body;

    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.statusCode }
      );
    }

    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const currentTenant = await tenantService.getCurrentTenant();

    if (!currentTenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    const tenantId = currentTenant.id;

    // Build update object (only include provided fields)
    const updates: Record<string, any> = {};

    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (contact_number !== undefined) updates.contact_number = contact_number;
    if (phone !== undefined) updates.contact_number = phone; // Alias support
    if (email !== undefined) updates.email = email;
    if (website !== undefined) updates.website = website;
    if (logo_url !== undefined) updates.logo_url = logo_url;

    // Update tenant via service (repository + adapter)
    const updatedTenant = await tenantService.updateTenant(tenantId, updates);

    if (!updatedTenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found after update',
        },
        { status: 404 }
      );
    }

    // Log update in audit trail
    try {
      const auditService = container.get<AuditService>(TYPES.AuditService);

      // Calculate what changed
      const original = currentTenant as unknown as Record<string, unknown>;
      const updatedRecord = updatedTenant as unknown as Record<string, unknown>;
      const changes: Record<string, any> = {};

      Object.keys(updates).forEach((key) => {
        if (original[key] !== updatedRecord[key]) {
          changes[key] = {
            old: original[key],
            new: updatedRecord[key],
          };
        }
      });

      await auditService.logAuditEvent('update', 'tenant', tenantId, changes);
    } catch (auditError) {
      console.error('Failed to log tenant update:', auditError);
      // Non-fatal error, continue
    }

    return NextResponse.json({
      success: true,
      data: updatedTenant,
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    console.error('Error updating tenant:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenant',
      },
      { status: 500 }
    );
  }
}

// Export both PUT and PATCH methods
export { handleUpdate as PUT, handleUpdate as PATCH };
