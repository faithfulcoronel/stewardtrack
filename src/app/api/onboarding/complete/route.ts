import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';

/**
 * POST /api/onboarding/complete
 *
 * Marks the onboarding process as complete for a tenant.
 * Updates the onboarding_progress record and logs the completion.
 */
export async function POST(request: NextRequest) {
  try {
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

    // Get or create onboarding progress record
    const { data: existingProgress, error: fetchError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch onboarding progress: ${fetchError.message}`);
    }

    if (existingProgress) {
      // Update existing record to mark as complete
      const { error: updateError } = await supabase
        .from('onboarding_progress')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          current_step: 'complete',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id);

      if (updateError) {
        throw new Error(`Failed to complete onboarding: ${updateError.message}`);
      }
    } else {
      // Create new record marked as complete
      const { error: insertError } = await supabase
        .from('onboarding_progress')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          current_step: 'complete',
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_steps: ['welcome', 'church-details', 'rbac-setup', 'feature-tour', 'complete'],
        });

      if (insertError) {
        throw new Error(`Failed to create onboarding record: ${insertError.message}`);
      }
    }

    // Log completion in audit trail
    try {
      const auditService = container.get<AuditService>(TYPES.AuditService);
      await auditService.log({
        operation: 'COMPLETE',
        table_name: 'onboarding_progress',
        record_id: tenantId,
        user_id: user.id,
        changes: {
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        metadata: {
          event: 'onboarding_completed',
          tenant_id: tenantId,
        },
      });
    } catch (auditError) {
      console.error('Failed to log onboarding completion:', auditError);
      // Non-fatal error, continue
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Onboarding completed successfully',
        completed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
      },
      { status: 500 }
    );
  }
}
