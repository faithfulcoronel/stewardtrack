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
    metadata,
    created_at,
    updated_at
  `;

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
