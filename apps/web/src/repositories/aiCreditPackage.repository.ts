import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { TYPES } from '@/lib/types';
import {
  AICreditPackage,
  CreateAICreditPackageInput,
  UpdateAICreditPackageInput,
  CreditPackageDTO,
} from '@/models/aiCreditPackage.model';
import type { IAICreditPackageAdapter } from '@/adapters/aiCreditPackage.adapter';

export interface IAICreditPackageRepository extends BaseRepository<AICreditPackage> {
  /**
   * Get active packages filtered by currency
   */
  getActivePackages(currency: string): Promise<AICreditPackage[]>;

  /**
   * Get featured packages
   */
  getFeaturedPackages(currency: string): Promise<AICreditPackage[]>;

  /**
   * Convert package to DTO for API responses
   */
  toDTO(pkg: AICreditPackage): CreditPackageDTO;

  /**
   * Soft delete a package
   */
  softDelete(id: string): Promise<void>;

  /**
   * Restore a soft-deleted package
   */
  restore(id: string): Promise<void>;
}

@injectable()
export class AICreditPackageRepository
  extends BaseRepository<AICreditPackage>
  implements IAICreditPackageRepository
{
  constructor(
    @inject(TYPES.IAICreditPackageAdapter)
    private readonly packageAdapter: IAICreditPackageAdapter
  ) {
    super(packageAdapter);
  }

  /**
   * Override findById to use adapter's findById (which doesn't filter by tenant_id)
   */
  async findById(id: string): Promise<AICreditPackage | null> {
    return await this.packageAdapter.findById(id);
  }

  async getActivePackages(currency: string = 'PHP'): Promise<AICreditPackage[]> {
    return await this.packageAdapter.getActivePackages(currency);
  }

  async getFeaturedPackages(currency: string = 'PHP'): Promise<AICreditPackage[]> {
    return await this.packageAdapter.getFeaturedPackages(currency);
  }

  toDTO(pkg: AICreditPackage): CreditPackageDTO {
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      credits: pkg.credits_amount,
      price: pkg.price,
      currency: pkg.currency,
      badge: pkg.badge_text,
      savings: pkg.savings_percent,
      featured: pkg.is_featured,
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.packageAdapter.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.packageAdapter.restore(id);
  }

  protected override async beforeCreate(
    data: Partial<AICreditPackage>
  ): Promise<Partial<AICreditPackage>> {
    // Validate package data
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Package name is required');
    }

    if (!data.credits_amount || data.credits_amount <= 0) {
      throw new Error('Credits amount must be greater than 0');
    }

    if (!data.price || data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    // Set defaults
    return {
      ...data,
      currency: data.currency || 'PHP',
      sort_order: data.sort_order ?? 0,
      is_featured: data.is_featured ?? false,
      is_active: data.is_active ?? true,
    };
  }
}
