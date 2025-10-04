import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/utils/tenantUtils';

interface SaveProgressRequest {
  step: string;
  data: Record<string, any>;
}

/**
 * POST /api/onboarding/save-progress
 *
 * Saves the current onboarding step progress for a tenant.
 * Creates or updates the onboarding_progress record.
 */
export async function POST(request: NextRequest) {
  try {
    const body: SaveProgressRequest = await request.json();
    const { step, data } = body;

    if (!step) {
      return NextResponse.json(
        {
          success: false,
          error: 'Step is required',
        },
        { status: 400 }
      );
    }

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

    // Check if onboarding progress record exists
    const { data: existingProgress, error: fetchError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is fine
      throw new Error(`Failed to fetch onboarding progress: ${fetchError.message}`);
    }

    // Map step to data field
    const stepDataField = `${step.replace(/-/g, '_')}_data`;

    if (existingProgress) {
      // Update existing record
      const completedSteps = existingProgress.completed_steps || [];
      if (!completedSteps.includes(step)) {
        completedSteps.push(step);
      }

      const { error: updateError } = await supabase
        .from('onboarding_progress')
        .update({
          current_step: step,
          completed_steps: completedSteps,
          [stepDataField]: data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id);

      if (updateError) {
        throw new Error(`Failed to update onboarding progress: ${updateError.message}`);
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('onboarding_progress')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          current_step: step,
          completed_steps: [step],
          [stepDataField]: data,
        });

      if (insertError) {
        throw new Error(`Failed to create onboarding progress: ${insertError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        step,
        message: 'Progress saved successfully',
      },
    });
  } catch (error) {
    console.error('Error saving onboarding progress:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save progress',
      },
      { status: 500 }
    );
  }
}
