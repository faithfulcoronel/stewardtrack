import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import type {
  DonationFeeConfig,
  UpdateDonationFeeConfigDto,
} from '@/models/donationFeeConfig.model';
import { DEFAULT_FEE_CONFIG } from '@/models/donationFeeConfig.model';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Interface for DonationFeeConfig data access operations
 */
export interface IDonationFeeConfigAdapter extends IBaseAdapter<DonationFeeConfig> {
  getConfigByTenantId(tenantId: string): Promise<DonationFeeConfig>;
  updateConfig(tenantId: string, data: UpdateDonationFeeConfigDto): Promise<DonationFeeConfig>;
  createDefaultConfig(tenantId: string): Promise<DonationFeeConfig>;
}

@injectable()
export class DonationFeeConfigAdapter
  extends BaseAdapter<DonationFeeConfig>
  implements IDonationFeeConfigAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'donation_fee_configs';

  protected defaultSelect = `
    id,
    tenant_id,
    platform_fee_type,
    platform_fee_percentage,
    platform_fee_fixed,
    platform_fee_min,
    platform_fee_max,
    xendit_card_fee_percentage,
    xendit_card_fee_fixed,
    xendit_ewallet_fee_percentage,
    xendit_ewallet_fee_fixed,
    xendit_bank_fee_fixed,
    xendit_direct_debit_fee_percentage,
    xendit_direct_debit_fee_fixed,
    show_fee_breakdown,
    allow_donor_fee_coverage,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /**
   * Get fee config by tenant ID, create default if not exists
   * Uses service role client to work with public (unauthenticated) API calls
   */
  async getConfigByTenantId(tenantId: string): Promise<DonationFeeConfig> {
    // Use service role client to bypass RLS for public API access
    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get fee config: ${error.message}`);
    }

    // If no config exists, create default
    if (!data) {
      return await this.createDefaultConfig(tenantId);
    }

    return data as unknown as DonationFeeConfig;
  }

  /**
   * Update fee config
   */
  async updateConfig(
    tenantId: string,
    data: UpdateDonationFeeConfigDto
  ): Promise<DonationFeeConfig> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    // First ensure config exists
    const existing = await this.getConfigByTenantId(tenantId);

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update fee config: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update fee config: record not found');
    }

    await this.auditService.logAuditEvent('update', 'donation_fee_config', existing.id, {
      changes: data,
    });

    return result as unknown as DonationFeeConfig;
  }

  /**
   * Create default fee config for a tenant
   * Uses service role client to work with public (unauthenticated) API calls
   */
  async createDefaultConfig(tenantId: string): Promise<DonationFeeConfig> {
    // Use service role client to bypass RLS for public API access
    const supabase = await getSupabaseServiceClient();

    // For public API calls, userId might be null - that's OK for auto-created configs
    let userId: string | null = null;
    try {
      const uid = await this.getUserId();
      userId = uid ?? null;
    } catch {
      // User ID not available in public context - that's expected
    }

    const record = {
      tenant_id: tenantId,
      ...DEFAULT_FEE_CONFIG,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([record])
      .select(this.defaultSelect)
      .single();

    if (error) {
      // If conflict (race condition), fetch existing
      if (error.code === '23505') {
        return await this.getConfigByTenantId(tenantId);
      }
      throw new Error(`Failed to create default fee config: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create default fee config: missing response payload');
    }

    return result as unknown as DonationFeeConfig;
  }
}
