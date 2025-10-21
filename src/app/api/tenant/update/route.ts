import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { Tenant } from '@/models/tenant.model';

interface UpdateTenantRequest {
  address?: string;
  contact_number?: string;
  email?: string;
  website?: string;
  logo_url?: string;
}

/**
 * PUT /api/tenant/update
 *
 * Updates the current tenant's information.
 */
export async function PUT(request: NextRequest) {
  try {
    const body: UpdateTenantRequest = await request.json();
    const { address, contact_number, email, website, logo_url } = body;

    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Fetch current tenant via RPC to avoid ambiguous column issues
    const { data: tenantData, error: fetchError } = await supabase.rpc('get_current_tenant');

    if (fetchError) {
      throw new Error(`Failed to fetch tenant: ${fetchError.message}`);
    }

    const currentTenantResult = Array.isArray(tenantData) ? tenantData[0] : tenantData;
    const currentTenant = currentTenantResult as Tenant | undefined;

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
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (address !== undefined) updates.address = address;
    if (contact_number !== undefined) updates.contact_number = contact_number;
    if (email !== undefined) updates.email = email;
    if (website !== undefined) updates.website = website;
    if (logo_url !== undefined) updates.logo_url = logo_url;

    // Update tenant
    const { error: updateError } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId);

    if (updateError) {
      throw new Error(`Failed to update tenant: ${updateError.message}`);
    }

    const { data: updatedTenantData, error: refreshError } = await supabase.rpc('get_current_tenant');

    if (refreshError) {
      throw new Error(`Failed to fetch updated tenant: ${refreshError.message}`);
    }

    const updatedTenantResult = Array.isArray(updatedTenantData) ? updatedTenantData[0] : updatedTenantData;
    const updatedTenant = updatedTenantResult as Tenant | undefined;

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
      const original = currentTenant as Record<string, unknown>;
      const updatedRecord = updatedTenant as Record<string, unknown>;
      const changes: Record<string, any> = {};

      Object.keys(updates).forEach((key) => {
        if (key === 'updated_at') return;

        if (original[key] !== updatedRecord[key]) {
          changes[key] = {
            old: original[key],
            new: updatedRecord[key],
          };
        }
      });

      await auditService.log({
        operation: 'UPDATE',
        table_name: 'tenants',
        record_id: tenantId,
        user_id: user.id,
        changes,
        metadata: {
          event: 'tenant_profile_updated',
        },
      });
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
