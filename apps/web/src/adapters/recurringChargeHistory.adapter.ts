import { injectable } from 'inversify';
import 'reflect-metadata';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  RecurringChargeHistory,
  CreateRecurringChargeHistoryDto,
  RecurringChargeStatus,
} from '@/models/donation.model';

/**
 * Active tenant info for cron processing
 */
export interface ActiveTenant {
  id: string;
  name: string;
}

/**
 * Interface for RecurringChargeHistory adapter operations
 */
export interface IRecurringChargeHistoryAdapter {
  create(data: CreateRecurringChargeHistoryDto): Promise<RecurringChargeHistory>;
  update(id: string, data: Partial<RecurringChargeHistory>): Promise<RecurringChargeHistory>;
  findByRecurringDonationId(recurringDonationId: string, tenantId: string): Promise<RecurringChargeHistory[]>;
  findByScheduledDate(recurringDonationId: string, scheduledDate: string): Promise<RecurringChargeHistory[]>;
  getAttemptCount(recurringDonationId: string, scheduledDate: string): Promise<number>;
  sumSuccessfulAmount(recurringDonationId: string): Promise<number>;
  countSuccessful(recurringDonationId: string): Promise<number>;

  // Tenant operations (for cron processing)
  getAllActiveTenants(): Promise<ActiveTenant[]>;

  // RPC function wrappers
  calculateNextRecurringDate(currentDate: string, frequency: string): Promise<string>;
  updateRecurringDonationAfterCharge(
    donationId: string,
    success: boolean,
    childDonationId?: string
  ): Promise<void>;
}

@injectable()
export class RecurringChargeHistoryAdapter implements IRecurringChargeHistoryAdapter {
  /**
   * Create a new charge history record
   */
  async create(data: CreateRecurringChargeHistoryDto): Promise<RecurringChargeHistory> {
    const supabase = await createSupabaseServerClient();

    const { data: result, error } = await supabase
      .from('recurring_charge_history')
      .insert({
        tenant_id: data.tenant_id,
        recurring_donation_id: data.recurring_donation_id,
        child_donation_id: data.child_donation_id || null,
        attempt_number: data.attempt_number,
        scheduled_date: data.scheduled_date,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        xendit_payment_request_id: data.xendit_payment_request_id || null,
        xendit_payment_id: data.xendit_payment_id || null,
        error_code: data.error_code || null,
        error_message: data.error_message || null,
        retry_scheduled_at: data.retry_scheduled_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error creating charge history:', error);
      throw new Error(`Failed to create charge history: ${error.message}`);
    }

    return result;
  }

  /**
   * Update a charge history record
   */
  async update(id: string, data: Partial<RecurringChargeHistory>): Promise<RecurringChargeHistory> {
    const supabase = await createSupabaseServerClient();

    const { data: result, error } = await supabase
      .from('recurring_charge_history')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error updating charge history:', error);
      throw new Error(`Failed to update charge history: ${error.message}`);
    }

    return result;
  }

  /**
   * Find all charge history for a recurring donation
   */
  async findByRecurringDonationId(
    recurringDonationId: string,
    tenantId: string
  ): Promise<RecurringChargeHistory[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('recurring_charge_history')
      .select('*')
      .eq('recurring_donation_id', recurringDonationId)
      .eq('tenant_id', tenantId)
      .order('attempted_at', { ascending: false });

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error fetching charge history:', error);
      throw new Error(`Failed to fetch charge history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find charge history for a specific scheduled date
   */
  async findByScheduledDate(
    recurringDonationId: string,
    scheduledDate: string
  ): Promise<RecurringChargeHistory[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('recurring_charge_history')
      .select('*')
      .eq('recurring_donation_id', recurringDonationId)
      .eq('scheduled_date', scheduledDate);

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error fetching by scheduled date:', error);
      throw new Error(`Failed to fetch charge history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get count of attempts for a recurring donation on a specific date
   */
  async getAttemptCount(recurringDonationId: string, scheduledDate: string): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('recurring_charge_history')
      .select('*', { count: 'exact', head: true })
      .eq('recurring_donation_id', recurringDonationId)
      .eq('scheduled_date', scheduledDate);

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error counting attempts:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Sum total successful amount for a recurring donation
   */
  async sumSuccessfulAmount(recurringDonationId: string): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('recurring_charge_history')
      .select('amount')
      .eq('recurring_donation_id', recurringDonationId)
      .eq('status', 'succeeded');

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error summing amounts:', error);
      return 0;
    }

    return (data || []).reduce((sum, row) => sum + (row.amount || 0), 0);
  }

  /**
   * Count successful charges for a recurring donation
   */
  async countSuccessful(recurringDonationId: string): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('recurring_charge_history')
      .select('*', { count: 'exact', head: true })
      .eq('recurring_donation_id', recurringDonationId)
      .eq('status', 'succeeded');

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error counting successful:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Calculate next recurring date using database function
   */
  async calculateNextRecurringDate(currentDate: string, frequency: string): Promise<string> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('calculate_next_recurring_date', {
      p_current_date: currentDate,
      p_frequency: frequency,
    });

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error calculating next date:', error);
      // Fallback calculation
      const date = new Date(currentDate);
      switch (frequency) {
        case 'weekly':
          date.setDate(date.getDate() + 7);
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + 1);
          break;
        case 'quarterly':
          date.setMonth(date.getMonth() + 3);
          break;
        case 'annually':
          date.setFullYear(date.getFullYear() + 1);
          break;
        default:
          date.setMonth(date.getMonth() + 1);
      }
      return date.toISOString().split('T')[0];
    }

    return data;
  }

  /**
   * Update recurring donation after charge using database function
   */
  async updateRecurringDonationAfterCharge(
    donationId: string,
    success: boolean,
    childDonationId?: string
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc('update_recurring_donation_after_charge', {
      p_donation_id: donationId,
      p_success: success,
      p_child_donation_id: childDonationId || null,
    });

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error updating donation after charge:', error);
      throw new Error(`Failed to update recurring donation: ${error.message}`);
    }
  }

  /**
   * Get all active tenants for cron processing
   */
  async getAllActiveTenants(): Promise<ActiveTenant[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active');

    if (error) {
      console.error('[RecurringChargeHistoryAdapter] Error fetching active tenants:', error);
      throw new Error(`Failed to fetch active tenants: ${error.message}`);
    }

    return data || [];
  }
}
