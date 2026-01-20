import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IDonationFeeConfigAdapter } from '@/adapters/donationFeeConfig.adapter';
import type {
  DonationFeeConfig,
  UpdateDonationFeeConfigDto,
} from '@/models/donationFeeConfig.model';
import { TYPES } from '@/lib/types';

/**
 * Interface for DonationFeeConfig repository operations
 */
export interface IDonationFeeConfigRepository extends BaseRepository<DonationFeeConfig> {
  getConfigByTenantId(tenantId: string): Promise<DonationFeeConfig>;
  updateConfig(tenantId: string, data: UpdateDonationFeeConfigDto): Promise<DonationFeeConfig>;
  createDefaultConfig(tenantId: string): Promise<DonationFeeConfig>;
}

@injectable()
export class DonationFeeConfigRepository
  extends BaseRepository<DonationFeeConfig>
  implements IDonationFeeConfigRepository
{
  constructor(
    @inject(TYPES.IDonationFeeConfigAdapter) private feeConfigAdapter: IDonationFeeConfigAdapter
  ) {
    super(feeConfigAdapter);
  }

  /**
   * Get fee config by tenant ID
   */
  async getConfigByTenantId(tenantId: string): Promise<DonationFeeConfig> {
    return await this.feeConfigAdapter.getConfigByTenantId(tenantId);
  }

  /**
   * Update fee config
   */
  async updateConfig(
    tenantId: string,
    data: UpdateDonationFeeConfigDto
  ): Promise<DonationFeeConfig> {
    return await this.feeConfigAdapter.updateConfig(tenantId, data);
  }

  /**
   * Create default fee config for a tenant
   */
  async createDefaultConfig(tenantId: string): Promise<DonationFeeConfig> {
    return await this.feeConfigAdapter.createDefaultConfig(tenantId);
  }
}
