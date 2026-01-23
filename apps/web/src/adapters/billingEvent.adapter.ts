import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import type {
  BillingEvent,
  CreateBillingEventDto,
  UpdateBillingEventDto,
} from '@/models/billingEvent.model';

export interface IBillingEventAdapter {
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
export class BillingEventAdapter implements IBillingEventAdapter {
  protected tableName = 'billing_events';

  protected defaultSelect = `
    id,
    event_id,
    event_type,
    tenant_id,
    payment_id,
    xendit_event_id,
    payload,
    processed,
    processed_at,
    processing_error,
    retry_count,
    created_at,
    updated_at
  `;

  async createWithServiceRole(data: CreateBillingEventDto): Promise<BillingEvent> {
    const supabase = await getSupabaseServiceClient();

    // Use upsert to handle webhook retries with the same event_id
    const { data: result, error } = await supabase
      .from(this.tableName)
      .upsert(
        {
          event_id: data.event_id,
          event_type: data.event_type,
          tenant_id: data.tenant_id || null,
          payment_id: data.payment_id || null,
          xendit_event_id: data.xendit_event_id || null,
          payload: data.payload,
          processed: data.processed ?? false,
          processing_error: data.processing_error || null,
        },
        {
          onConflict: 'event_id',
          ignoreDuplicates: false,
        }
      )
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create billing event: ${error.message}`);
    }

    return result as BillingEvent;
  }

  async updateByEventIdWithServiceRole(eventId: string, data: UpdateBillingEventDto): Promise<BillingEvent | null> {
    const supabase = await getSupabaseServiceClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to update billing event: ${error.message}`);
    }

    return result as BillingEvent;
  }

  async incrementRetryCountWithServiceRole(eventId: string, errorMessage: string): Promise<void> {
    const supabase = await getSupabaseServiceClient();

    // First get current retry count
    const { data: current, error: fetchError } = await supabase
      .from(this.tableName)
      .select('retry_count')
      .eq('event_id', eventId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch billing event for retry: ${fetchError.message}`);
    }

    const newRetryCount = (current?.retry_count || 0) + 1;

    const { error: updateError } = await supabase
      .from(this.tableName)
      .update({
        retry_count: newRetryCount,
        processing_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    if (updateError) {
      throw new Error(`Failed to increment retry count: ${updateError.message}`);
    }
  }

  async markAsProcessedWithServiceRole(eventId: string): Promise<void> {
    const supabase = await getSupabaseServiceClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Failed to mark billing event as processed: ${error.message}`);
    }
  }
}
