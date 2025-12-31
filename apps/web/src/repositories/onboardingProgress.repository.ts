import { injectable, inject } from 'inversify';
import type { IOnboardingProgressAdapter } from '@/adapters/onboardingProgress.adapter';
import { BaseRepository } from '@/repositories/base.repository';
import type { OnboardingProgress } from '@/models/onboardingProgress.model';
import { TYPES } from '@/lib/types';

export interface IOnboardingProgressRepository extends BaseRepository<OnboardingProgress> {
  findByTenantId(tenantId: string): Promise<OnboardingProgress | null>;
  markComplete(tenantId: string, userId: string): Promise<OnboardingProgress>;
  saveProgress(tenantId: string, userId: string, step: string, data: Record<string, any>): Promise<OnboardingProgress>;
}

@injectable()
export class OnboardingProgressRepository
  extends BaseRepository<OnboardingProgress>
  implements IOnboardingProgressRepository
{
  constructor(
    @inject(TYPES.IOnboardingProgressAdapter)
    private readonly onboardingAdapter: IOnboardingProgressAdapter
  ) {
    super(onboardingAdapter);
  }

  /**
   * Find onboarding progress by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<OnboardingProgress | null> {
    return await this.onboardingAdapter.findByTenantId(tenantId);
  }

  /**
   * Mark onboarding as complete for a tenant
   */
  async markComplete(tenantId: string, userId: string): Promise<OnboardingProgress> {
    const existing = await this.findByTenantId(tenantId);

    if (existing) {
      // Update existing record to mark as complete
      return await this.update(existing.id, {
        is_completed: true,
        completed_at: new Date().toISOString(),
        current_step: 'complete',
      } as Partial<OnboardingProgress>);
    } else {
      // Create new record marked as complete
      return await this.create({
        tenant_id: tenantId,
        user_id: userId,
        current_step: 'complete',
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_steps: ['welcome', 'church-details', 'rbac-setup', 'feature-tour', 'complete'],
      } as Partial<OnboardingProgress>);
    }
  }

  /**
   * Save onboarding step progress
   */
  async saveProgress(
    tenantId: string,
    userId: string,
    step: string,
    data: Record<string, any>
  ): Promise<OnboardingProgress> {
    const existing = await this.findByTenantId(tenantId);

    // Map step to data field (e.g., "church-details" -> "church_details_data")
    const stepDataField = `${step.replace(/-/g, '_')}_data`;

    if (existing) {
      // Update existing record
      const completedSteps = existing.completed_steps || [];
      if (!completedSteps.includes(step)) {
        completedSteps.push(step);
      }

      return await this.update(existing.id, {
        current_step: step,
        completed_steps: completedSteps,
        [stepDataField]: data,
      } as Partial<OnboardingProgress>);
    } else {
      // Create new record
      return await this.create({
        tenant_id: tenantId,
        user_id: userId,
        current_step: step,
        completed_steps: [step],
        [stepDataField]: data,
      } as Partial<OnboardingProgress>);
    }
  }
}
