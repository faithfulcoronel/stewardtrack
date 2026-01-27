import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMemberHouseholdRepository } from '@/repositories/memberHousehold.repository';
import type { MemberHousehold } from '@/models/memberHousehold.model';

/**
 * MemberHouseholdService
 *
 * Service for managing household records within the membership module.
 *
 * ## Permission Requirements (Feature: members.household)
 *
 * | Operation | Required Permission |
 * |-----------|---------------------|
 * | Read household(s) | `households:view` |
 * | Create household | `households:manage` |
 * | Update household | `households:manage` |
 * | Delete household | `households:delete` |
 *
 * Callers (API routes, metadata service handlers) are responsible for
 * verifying permissions before invoking these methods.
 */
@injectable()
export class MemberHouseholdService {
  constructor(
    @inject(TYPES.IMemberHouseholdRepository)
    private repo: IMemberHouseholdRepository,
  ) {}

  /**
   * Get a household by ID
   * @permission households:view
   */
  async getHouseholdById(id: string): Promise<MemberHousehold | null> {
    return this.repo.findById(id);
  }

  /**
   * Get a household by ID and tenant (tenant-scoped query)
   * @permission households:view
   */
  async getHouseholdByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null> {
    return this.repo.findByIdAndTenant(householdId, tenantId);
  }

  /**
   * Get all households for a tenant
   * @permission households:view
   */
  async getHouseholdsByTenant(tenantId: string): Promise<MemberHousehold[]> {
    return this.repo.findByTenant(tenantId);
  }

  /**
   * Create a new household
   * @permission households:manage
   */
  async createHousehold(data: Partial<MemberHousehold>): Promise<MemberHousehold> {
    return this.repo.create(data);
  }

  /**
   * Update an existing household
   * @permission households:manage
   */
  async updateHousehold(id: string, data: Partial<MemberHousehold>): Promise<MemberHousehold> {
    return this.repo.update(id, data);
  }

  /**
   * Soft delete a household
   * @permission households:delete
   */
  async deleteHousehold(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * List households with pagination
   * @permission households:view
   */
  async listHouseholds(page: number = 1, pageSize: number = 50): Promise<MemberHousehold[]> {
    const result = await this.repo.find({ pagination: { page, pageSize } });
    return result.data;
  }

  /**
   * Search households by name
   * @permission households:view
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
