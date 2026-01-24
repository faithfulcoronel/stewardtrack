import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  ScheduleRegistration,
  ScheduleRegistrationWithMember,
  ScheduleRegistrationCreateInput,
  ScheduleRegistrationUpdateInput,
  ScheduleRegistrationFilters,
} from '@/models/scheduler/scheduleRegistration.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IScheduleRegistrationAdapter extends IBaseAdapter<ScheduleRegistration> {
  getById(id: string, tenantId: string): Promise<ScheduleRegistrationWithMember | null>;
  getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<ScheduleRegistration[]>;
  getByFilters(filters: ScheduleRegistrationFilters, tenantId: string): Promise<ScheduleRegistrationWithMember[]>;
  getByGuestEmail(email: string, occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null>;
  getByPaymentRequestId(paymentRequestId: string, tenantId: string): Promise<ScheduleRegistration | null>;
  getWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]>;
  createRegistration(data: ScheduleRegistrationCreateInput, tenantId: string): Promise<ScheduleRegistration>;
  updateRegistration(id: string, data: ScheduleRegistrationUpdateInput, tenantId: string): Promise<ScheduleRegistration>;
  cancelRegistration(id: string, tenantId: string): Promise<void>;
  promoteFromWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null>;
  getRegistrationCount(occurrenceId: string, tenantId: string): Promise<{ registered: number; waitlisted: number }>;
}

@injectable()
export class ScheduleRegistrationAdapter
  extends BaseAdapter<ScheduleRegistration>
  implements IScheduleRegistrationAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'schedule_registrations';

  protected defaultSelect = `
    id,
    tenant_id,
    occurrence_id,
    member_id,
    guest_name,
    guest_email,
    guest_phone,
    registration_date,
    party_size,
    confirmation_code,
    status,
    waitlist_position,
    form_responses,
    special_requests,
    admin_notes,
    payment_status,
    payment_amount,
    xendit_fee,
    platform_fee,
    total_charged,
    payment_currency,
    xendit_payment_request_id,
    xendit_payment_id,
    external_id,
    payment_method_type,
    paid_at,
    payment_url,
    payment_expires_at,
    created_at,
    updated_at
  `;

  protected selectWithMember = `
    ${this.defaultSelect},
    member:members!member_id(
      id,
      first_name,
      last_name,
      email,
      contact_number,
      profile_picture_url
    )
  `;

  async getById(id: string, tenantId: string): Promise<ScheduleRegistrationWithMember | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch registration: ${error.message}`);
    }

    return data as ScheduleRegistrationWithMember | null;
  }

  async getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId)
      .order('registration_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch occurrence registrations: ${error.message}`);
    }

    return (data as unknown as ScheduleRegistrationWithMember[]) || [];
  }

  async getByMember(memberId: string, tenantId: string): Promise<ScheduleRegistration[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .order('registration_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch member registrations: ${error.message}`);
    }

    return (data as unknown as ScheduleRegistration[]) || [];
  }

  async getByFilters(filters: ScheduleRegistrationFilters, tenantId: string): Promise<ScheduleRegistrationWithMember[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('tenant_id', tenantId);

    if (filters.occurrenceId) {
      query = query.eq('occurrence_id', filters.occurrenceId);
    }

    if (filters.memberId) {
      query = query.eq('member_id', filters.memberId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    if (filters.guestEmail) {
      query = query.eq('guest_email', filters.guestEmail);
    }

    const { data, error } = await query.order('registration_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch registrations by filters: ${error.message}`);
    }

    return (data as unknown as ScheduleRegistrationWithMember[]) || [];
  }

  async getByGuestEmail(email: string, occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('occurrence_id', occurrenceId)
      .eq('guest_email', email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch registration by guest email: ${error.message}`);
    }

    return data as ScheduleRegistration | null;
  }

  async getByPaymentRequestId(paymentRequestId: string, tenantId: string): Promise<ScheduleRegistration | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_payment_request_id', paymentRequestId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch registration by payment request ID: ${error.message}`);
    }

    return data as ScheduleRegistration | null;
  }

  async getWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId)
      .eq('status', 'waitlisted')
      .order('waitlist_position', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch waitlist: ${error.message}`);
    }

    return (data as unknown as ScheduleRegistrationWithMember[]) || [];
  }

  async createRegistration(data: ScheduleRegistrationCreateInput, tenantId: string): Promise<ScheduleRegistration> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        occurrence_id: data.occurrence_id,
        member_id: data.member_id ?? null,
        guest_name: data.guest_name ?? null,
        guest_email: data.guest_email ?? null,
        guest_phone: data.guest_phone ?? null,
        party_size: data.party_size ?? 1,
        status: 'registered',
        form_responses: data.form_responses ?? {},
        special_requests: data.special_requests ?? null,
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create registration: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create registration: missing response payload');
    }

    return result as unknown as ScheduleRegistration;
  }

  async updateRegistration(id: string, data: ScheduleRegistrationUpdateInput, tenantId: string): Promise<ScheduleRegistration> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const fields = [
      'party_size', 'status', 'waitlist_position', 'form_responses',
      'special_requests', 'admin_notes',
      // Payment fields
      'payment_status', 'payment_amount', 'xendit_fee', 'platform_fee',
      'total_charged', 'payment_currency', 'xendit_payment_request_id',
      'xendit_payment_id', 'external_id', 'payment_method_type', 'paid_at',
      'payment_url', 'payment_expires_at'
    ];

    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updateData[field] = (data as Record<string, unknown>)[field];
      }
    }

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update registration: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update registration: not found');
    }

    return result as unknown as ScheduleRegistration;
  }

  async cancelRegistration(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to cancel registration: ${error.message}`);
    }
  }

  async promoteFromWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null> {
    const supabase = await this.getSupabaseClient();

    // Get the first person on the waitlist
    const { data: waitlistItem, error: fetchError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId)
      .eq('status', 'waitlisted')
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch waitlist: ${fetchError.message}`);
    }

    if (!waitlistItem) {
      return null;
    }

    const typedWaitlistItem = waitlistItem as unknown as ScheduleRegistration;

    // Promote to registered
    const { data: promoted, error: updateError } = await supabase
      .from(this.tableName)
      .update({
        status: 'registered',
        waitlist_position: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', typedWaitlistItem.id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (updateError) {
      throw new Error(`Failed to promote from waitlist: ${updateError.message}`);
    }

    return promoted as unknown as ScheduleRegistration;
  }

  async getRegistrationCount(occurrenceId: string, tenantId: string): Promise<{ registered: number; waitlisted: number }> {
    const supabase = await this.getSupabaseClient();

    const { count: registeredCount, error: regError } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId)
      .eq('status', 'registered');

    if (regError) {
      throw new Error(`Failed to count registrations: ${regError.message}`);
    }

    const { count: waitlistCount, error: waitError } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId)
      .eq('status', 'waitlisted');

    if (waitError) {
      throw new Error(`Failed to count waitlist: ${waitError.message}`);
    }

    return {
      registered: registeredCount ?? 0,
      waitlisted: waitlistCount ?? 0,
    };
  }
}
