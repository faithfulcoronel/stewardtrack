import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ISubscriptionRepository } from '@/repositories/subscription.repository';

const TIER_LIMITS = {
  free: { members: 25, transactions: 1000 },
  basic: { members: 100, transactions: 5000 },
  advanced: { members: 250, transactions: 10000 },
  premium: { members: 1000, transactions: 50000 },
  enterprise: { members: -1, transactions: -1 },
} as const;

export type SubscriptionLimits = {
  members: { used: number; limit: number; remaining: number };
  transactions: { used: number; limit: number; remaining: number };
};

@injectable()
export class SubscriptionService {
  constructor(
    @inject(TYPES.ISubscriptionRepository)
    private repo: ISubscriptionRepository,
  ) {}

  async getLimits(): Promise<SubscriptionLimits> {
    const usage = await this.repo.getCurrentUsage();
    const tier = (usage.tenant.subscription_tier || 'free').toLowerCase() as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier];
    return {
      members: {
        used: usage.memberCount,
        limit: limits.members,
        remaining:
          limits.members === -1
            ? -1
            : Math.max(0, limits.members - usage.memberCount),
      },
      transactions: {
        used: usage.transactionCount,
        limit: limits.transactions,
        remaining:
          limits.transactions === -1
            ? -1
            : Math.max(0, limits.transactions - usage.transactionCount),
      },
    };
  }
}
