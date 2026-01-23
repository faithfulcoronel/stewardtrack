import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IBillingEventAdapter } from '@/adapters/billingEvent.adapter';
import type {
  BillingEvent,
  CreateBillingEventDto,
  UpdateBillingEventDto,
} from '@/models/billingEvent.model';

export interface IBillingEventRepository {
  /**
   * Create a billing event using service role client (bypasses RLS).
   * Use this for webhook contexts where there is no authenticated user.
   */
  createWithServiceRole(data: CreateBillingEventDto): Promise<BillingEvent>;

  /**
   * Update a billing event by event_id using service role client (bypasses RLS).
   */
  updateByEventIdWithServiceRole(eventId: string, data: UpdateBillingEventDto): Promise<BillingEvent | null>;

  /**
   * Increment retry count for a billing event using service role client.
   */
  incrementRetryCountWithServiceRole(eventId: string, error: string): Promise<void>;

  /**
   * Mark a billing event as processed using service role client.
   */
  markAsProcessedWithServiceRole(eventId: string): Promise<void>;
}

@injectable()
export class BillingEventRepository implements IBillingEventRepository {
  constructor(
    @inject(TYPES.IBillingEventAdapter)
    private adapter: IBillingEventAdapter
  ) {}

  async createWithServiceRole(data: CreateBillingEventDto): Promise<BillingEvent> {
    return this.adapter.createWithServiceRole(data);
  }

  async updateByEventIdWithServiceRole(eventId: string, data: UpdateBillingEventDto): Promise<BillingEvent | null> {
    return this.adapter.updateByEventIdWithServiceRole(eventId, data);
  }

  async incrementRetryCountWithServiceRole(eventId: string, error: string): Promise<void> {
    return this.adapter.incrementRetryCountWithServiceRole(eventId, error);
  }

  async markAsProcessedWithServiceRole(eventId: string): Promise<void> {
    return this.adapter.markAsProcessedWithServiceRole(eventId);
  }
}
