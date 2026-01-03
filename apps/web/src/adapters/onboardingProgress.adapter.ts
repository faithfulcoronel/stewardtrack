import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type { OnboardingProgress } from '@/models/onboardingProgress.model';

export interface IOnboardingProgressAdapter extends IBaseAdapter<OnboardingProgress> {
  findByTenantId(tenantId: string): Promise<OnboardingProgress | null>;
}

@injectable()
export class OnboardingProgressAdapter
  extends BaseAdapter<OnboardingProgress>
  implements IOnboardingProgressAdapter
{
  protected tableName = 'onboarding_progress';

  protected defaultSelect = `
    id,
    tenant_id,
    user_id,
    current_step,
    completed_steps,
    is_completed,
    completed_at,
    welcome_data,
    church_details_data,
    rbac_setup_data,
    feature_tour_data,
    payment_data,
    complete_data,
    metadata,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  /**
   * Override update to allow updates during onboarding when tenant context isn't established
   * The record already has tenant_id, so we don't need session tenant context
   */
  public async update(
    id: string,
    data: Partial<OnboardingProgress>,
    relations?: Record<string, string[]>
  ): Promise<OnboardingProgress> {
    // Run pre-update hook
    const processedData = await this.onBeforeUpdate(id, data);

    // Update record
    const userId = await this.getUserId();
    const supabase = await this.getSupabaseClient();
    const record: Record<string, unknown> = {
      ...processedData,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from(this.tableName)
      .update(record)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update onboarding progress: ${updateError.message}`);
    }

    // Handle relations if provided
    if (relations) {
      await this.updateRelations(id, relations);
    }

    // Run post-update hook
    await this.onAfterUpdate(updated);

    return updated;
  }

  /**
   * Find onboarding progress by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<OnboardingProgress | null> {
    const client = await this.getSupabaseClient();

    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch onboarding progress: ${error.message}`);
    }

    return data as OnboardingProgress | null;
  }
}
