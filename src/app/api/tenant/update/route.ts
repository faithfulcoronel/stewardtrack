import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';

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

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    // Fetch current tenant data for audit trail
    const { data: currentTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch tenant: ${fetchError.message}`);
    }

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
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update tenant: ${updateError.message}`);
    }

    // Log update in audit trail
    try {
      const auditService = container.get<AuditService>(TYPES.AuditService);

      // Calculate what changed
      const changes: Record<string, any> = {};
      Object.keys(updates).forEach((key) => {
        if (key !== 'updated_at' && currentTenant[key] !== updates[key]) {
          changes[key] = {
            old: currentTenant[key],
            new: updates[key],
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
