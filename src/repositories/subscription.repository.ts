import { injectable, inject } from 'inversify';
import type { ISubscriptionAdapter, SubscriptionUsage } from '@/adapters/subscription.adapter';
import { TYPES } from '@/lib/types';

export interface ISubscriptionRepository {
  getCurrentUsage(): Promise<SubscriptionUsage>;
}

@injectable()
export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(
    @inject(TYPES.ISubscriptionAdapter) private adapter: ISubscriptionAdapter,
  ) {}

  getCurrentUsage(): Promise<SubscriptionUsage> {
    return this.adapter.getCurrentUsage();
  }
}
