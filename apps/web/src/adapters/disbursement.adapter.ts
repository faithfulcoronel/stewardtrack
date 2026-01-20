import { injectable } from 'inversify';
import 'reflect-metadata';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  Disbursement,
  DisbursementDonation,
  CreateDisbursementDto,
  DisbursementStatus,
  DisbursementReadyDonation,
  PayoutEnabledSource,
} from '@/models/disbursement.model';

/**
 * Interface for Disbursement adapter operations
 */
export interface IDisbursementAdapter {
  // CRUD operations
  createDisbursement(data: CreateDisbursementDto): Promise<Disbursement>;
  updateDisbursementStatus(
    id: string,
    status: DisbursementStatus,
    xenditDisbursementId?: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void>;
  findById(id: string, tenantId: string): Promise<Disbursement | null>;
  findByTenant(tenantId: string, status?: DisbursementStatus): Promise<Disbursement[]>;
  findPendingDisbursements(): Promise<Disbursement[]>;

  // Junction table operations
  addDonationsToDisbursement(
    disbursementId: string,
    donations: Array<{
      donation_id: string;
      donation_amount: number;
      xendit_fee: number;
      platform_fee: number;
      net_amount: number;
    }>
  ): Promise<void>;
  getDisbursementDonations(disbursementId: string): Promise<DisbursementDonation[]>;
  markDonationsAsDisbursed(disbursementId: string, donationIds: string[]): Promise<void>;

  // RPC functions
  getDonationsForDisbursement(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<DisbursementReadyDonation[]>;
  getPayoutEnabledSources(tenantId: string): Promise<PayoutEnabledSource[]>;

  // For cron
  getTenantsWithScheduledDisbursements(schedule: string): Promise<Array<{ tenant_id: string; source_id: string }>>;
}

@injectable()
export class DisbursementAdapter implements IDisbursementAdapter {
  /**
   * Create a new disbursement record
   */
  async createDisbursement(data: CreateDisbursementDto): Promise<Disbursement> {
    const supabase = await createSupabaseServerClient();

    const { data: result, error } = await supabase
      .from('disbursements')
      .insert({
        tenant_id: data.tenant_id,
        financial_source_id: data.financial_source_id,
        xendit_payout_channel_id: data.xendit_payout_channel_id,
        xendit_payout_channel_type: data.xendit_payout_channel_type || null,
        currency: data.currency || 'PHP',
        period_start: data.period_start,
        period_end: data.period_end,
        scheduled_at: data.scheduled_at || null,
        triggered_by: data.triggered_by || 'system',
        created_by: data.created_by || null,
        // These will be updated after donations are linked
        amount: 0,
        gross_amount: 0,
        xendit_fees_total: 0,
        platform_fees_total: 0,
        adjustments: 0,
        net_amount: 0,
        donations_count: 0,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[DisbursementAdapter] Error creating disbursement:', error);
      throw new Error(`Failed to create disbursement: ${error.message}`);
    }

    return result;
  }

  /**
   * Update disbursement status using the database function
   */
  async updateDisbursementStatus(
    id: string,
    status: DisbursementStatus,
    xenditDisbursementId?: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc('update_disbursement_status', {
      p_disbursement_id: id,
      p_status: status,
      p_xendit_disbursement_id: xenditDisbursementId || null,
      p_error_code: errorCode || null,
      p_error_message: errorMessage || null,
    });

    if (error) {
      console.error('[DisbursementAdapter] Error updating disbursement status:', error);
      throw new Error(`Failed to update disbursement status: ${error.message}`);
    }
  }

  /**
   * Find disbursement by ID
   */
  async findById(id: string, tenantId: string): Promise<Disbursement | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('disbursements')
      .select(`
        *,
        financial_source:financial_sources(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('[DisbursementAdapter] Error fetching disbursement:', error);
      throw new Error(`Failed to fetch disbursement: ${error.message}`);
    }

    return data;
  }

  /**
   * Find disbursements by tenant
   */
  async findByTenant(tenantId: string, status?: DisbursementStatus): Promise<Disbursement[]> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('disbursements')
      .select(`
        *,
        financial_source:financial_sources(id, name, source_type)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DisbursementAdapter] Error fetching disbursements:', error);
      throw new Error(`Failed to fetch disbursements: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find all pending disbursements (for cron processing)
   */
  async findPendingDisbursements(): Promise<Disbursement[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('disbursements')
      .select(`
        *,
        financial_source:financial_sources(id, name, xendit_payout_channel_id, xendit_payout_channel_type)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('[DisbursementAdapter] Error fetching pending disbursements:', error);
      throw new Error(`Failed to fetch pending disbursements: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Add donations to a disbursement and update totals
   */
  async addDonationsToDisbursement(
    disbursementId: string,
    donations: Array<{
      donation_id: string;
      donation_amount: number;
      xendit_fee: number;
      platform_fee: number;
      net_amount: number;
    }>
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();

    if (donations.length === 0) {
      return;
    }

    // Insert junction records
    const { error: junctionError } = await supabase
      .from('disbursement_donations')
      .insert(
        donations.map(d => ({
          disbursement_id: disbursementId,
          donation_id: d.donation_id,
          donation_amount: d.donation_amount,
          xendit_fee: d.xendit_fee,
          platform_fee: d.platform_fee,
          net_amount: d.net_amount,
        }))
      );

    if (junctionError) {
      console.error('[DisbursementAdapter] Error adding donations to disbursement:', junctionError);
      throw new Error(`Failed to add donations to disbursement: ${junctionError.message}`);
    }

    // Calculate totals
    const grossAmount = donations.reduce((sum, d) => sum + d.donation_amount, 0);
    const xenditFeesTotal = donations.reduce((sum, d) => sum + d.xendit_fee, 0);
    const platformFeesTotal = donations.reduce((sum, d) => sum + d.platform_fee, 0);
    const netAmount = donations.reduce((sum, d) => sum + d.net_amount, 0);

    // Update disbursement totals
    const { error: updateError } = await supabase
      .from('disbursements')
      .update({
        amount: netAmount,
        gross_amount: grossAmount,
        xendit_fees_total: xenditFeesTotal,
        platform_fees_total: platformFeesTotal,
        net_amount: netAmount,
        donations_count: donations.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disbursementId);

    if (updateError) {
      console.error('[DisbursementAdapter] Error updating disbursement totals:', updateError);
      throw new Error(`Failed to update disbursement totals: ${updateError.message}`);
    }
  }

  /**
   * Get donations linked to a disbursement
   */
  async getDisbursementDonations(disbursementId: string): Promise<DisbursementDonation[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('disbursement_donations')
      .select('*')
      .eq('disbursement_id', disbursementId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DisbursementAdapter] Error fetching disbursement donations:', error);
      throw new Error(`Failed to fetch disbursement donations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark donations as disbursed
   */
  async markDonationsAsDisbursed(disbursementId: string, donationIds: string[]): Promise<void> {
    const supabase = await createSupabaseServerClient();

    if (donationIds.length === 0) {
      return;
    }

    const { error } = await supabase
      .from('donations')
      .update({
        disbursement_id: disbursementId,
        updated_at: new Date().toISOString(),
      })
      .in('id', donationIds);

    if (error) {
      console.error('[DisbursementAdapter] Error marking donations as disbursed:', error);
      throw new Error(`Failed to mark donations as disbursed: ${error.message}`);
    }
  }

  /**
   * Get donations ready for disbursement using RPC function
   */
  async getDonationsForDisbursement(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<DisbursementReadyDonation[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_donations_for_disbursement', {
      p_tenant_id: tenantId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });

    if (error) {
      console.error('[DisbursementAdapter] Error getting donations for disbursement:', error);
      throw new Error(`Failed to get donations for disbursement: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get financial sources with payout enabled using RPC function
   */
  async getPayoutEnabledSources(tenantId: string): Promise<PayoutEnabledSource[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_payout_enabled_sources', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('[DisbursementAdapter] Error getting payout-enabled sources:', error);
      throw new Error(`Failed to get payout-enabled sources: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get tenants with scheduled disbursements for cron processing
   *
   * Uses XenPlatform fields:
   * - is_donation_destination: true (marks this source as payout destination)
   * - xendit_channel_code: required for Xendit Payout API
   * - disbursement_schedule: the schedule to match
   *
   * Note: The tenant also needs xendit_sub_account_id configured (checked at processing time)
   */
  async getTenantsWithScheduledDisbursements(
    schedule: string
  ): Promise<Array<{ tenant_id: string; source_id: string }>> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('financial_sources')
      .select('tenant_id, id')
      .eq('disbursement_schedule', schedule)
      .eq('is_donation_destination', true)  // XenPlatform: marked as donation payout destination
      .not('xendit_channel_code', 'is', null)  // XenPlatform: bank channel code required
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) {
      console.error('[DisbursementAdapter] Error getting scheduled disbursements:', error);
      throw new Error(`Failed to get scheduled disbursements: ${error.message}`);
    }

    return (data || []).map(d => ({
      tenant_id: d.tenant_id,
      source_id: d.id,
    }));
  }
}
