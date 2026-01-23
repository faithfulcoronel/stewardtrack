import 'server-only';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '@/lib/types';
import type { IBillingEventRepository } from '@/repositories/billingEvent.repository';
import type {
  BillingEvent,
  CreateBillingEventDto,
} from '@/models/billingEvent.model';

/**
 * BillingEventService
 *
 * Manages billing/payment webhook event logging for audit and retry purposes.
 * All methods use service role client to bypass RLS as webhooks have no authenticated user.
 */
@injectable()
export class BillingEventService {
  constructor(
    @inject(TYPES.IBillingEventRepository)
    private billingEventRepository: IBillingEventRepository
  ) {}

  /**
   * Log a billing event when payment is not found
   */
  async logEventNotFound(
    eventId: string,
    eventType: string,
    xenditEventId: string,
    payload: Record<string, any>
  ): Promise<BillingEvent> {
    return this.billingEventRepository.createWithServiceRole({
      event_id: eventId,
      event_type: eventType,
      xendit_event_id: xenditEventId,
      payload,
      processed: false,
      processing_error: 'Payment record not found',
    });
  }

  /**
   * Log a billing event for a payment
   */
  async logEvent(
    eventId: string,
    eventType: string,
    tenantId: string,
    paymentId: string,
    xenditEventId: string,
    payload: Record<string, any>
  ): Promise<BillingEvent> {
    return this.billingEventRepository.createWithServiceRole({
      event_id: eventId,
      event_type: eventType,
      tenant_id: tenantId,
      payment_id: paymentId,
      xendit_event_id: xenditEventId,
      payload,
      processed: false,
    });
  }

  /**
   * Mark a billing event as successfully processed
   */
  async markAsProcessed(eventId: string): Promise<void> {
    return this.billingEventRepository.markAsProcessedWithServiceRole(eventId);
  }

  /**
   * Log a processing error and increment retry count
   */
  async logProcessingError(eventId: string, errorMessage: string): Promise<void> {
    return this.billingEventRepository.incrementRetryCountWithServiceRole(eventId, errorMessage);
  }
}
