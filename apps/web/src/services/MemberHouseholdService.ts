import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMemberHouseholdRepository } from '@/repositories/memberHousehold.repository';
import type { MemberHousehold } from '@/models/memberHousehold.model';

@injectable()
export class MemberHouseholdService {
  constructor(
    @inject(TYPES.IMemberHouseholdRepository)
    private repo: IMemberHouseholdRepository,
  ) {}

  /**
   * Get a household by ID
   */
  async getHouseholdById(id: string): Promise<MemberHousehold | null> {
    return this.repo.findById(id);
  }

  /**
   * Get a household by ID and tenant (tenant-scoped query)
   */
  async getHouseholdByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null> {
    return this.repo.findByIdAndTenant(householdId, tenantId);
  }

  /**
   * Get all households for a tenant
   */
  async getHouseholdsByTenant(tenantId: string): Promise<MemberHousehold[]> {
    return this.repo.findByTenant(tenantId);
  }

  /**
   * Create a new household
   */
  async createHousehold(data: Partial<MemberHousehold>): Promise<MemberHousehold> {
    return this.repo.create(data);
  }

  /**
   * Update an existing household
   */
  async updateHousehold(id: string, data: Partial<MemberHousehold>): Promise<MemberHousehold> {
    return this.repo.update(id, data);
  }

  /**
   * Soft delete a household
   */
  async deleteHousehold(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * List households with pagination
   */
  async listHouseholds(page: number = 1, pageSize: number = 50): Promise<MemberHousehold[]> {
    const result = await this.repo.find({ pagination: { page, pageSize } });
    return result.data;
  }

  /**
   * Search households by name
   */
  async searchHouseholds(searchTerm: string, tenantId: string): Promise<MemberHousehold[]> {
    const allHouseholds = await this.repo.findByTenant(tenantId);

    if (!searchTerm) {
      return allHouseholds;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return allHouseholds.filter(household =>
      household.name?.toLowerCase().includes(lowerSearch) ||
      household.address_street?.toLowerCase().includes(lowerSearch)
    );
  }
}

export type { MemberHousehold };
