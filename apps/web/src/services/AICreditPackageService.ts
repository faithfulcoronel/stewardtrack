import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import {
  AICreditPackage,
  CreditPackageDTO,
  CreateAICreditPackageInput,
  UpdateAICreditPackageInput,
} from '@/models/aiCreditPackage.model';
import type { IAICreditPackageRepository } from '@/repositories/aiCreditPackage.repository';

/**
 * AI Credit Package Service
 * Manages credit package catalog (SKUs) for purchasing credits
 */
@injectable()
export class AICreditPackageService {
  constructor(
    @inject(TYPES.IAICreditPackageRepository)
    private readonly packageRepository: IAICreditPackageRepository
  ) {}

  /**
   * Get all active packages for a specific currency
   */
  async getActivePackages(currency: string = 'PHP'): Promise<CreditPackageDTO[]> {
    const packages = await this.packageRepository.getActivePackages(currency);
    return packages.map((pkg) => this.packageRepository.toDTO(pkg));
  }

  /**
   * Get featured packages
   */
  async getFeaturedPackages(currency: string = 'PHP'): Promise<CreditPackageDTO[]> {
    const packages = await this.packageRepository.getFeaturedPackages(currency);
    return packages.map((pkg) => this.packageRepository.toDTO(pkg));
  }

  /**
   * Get a specific package by ID
   */
  async getPackageById(id: string): Promise<AICreditPackage | null> {
    return await this.packageRepository.findById(id);
  }

  /**
   * Create a new credit package (admin only)
   */
  async createPackage(input: CreateAICreditPackageInput): Promise<AICreditPackage> {
    return await this.packageRepository.create(input);
  }

  /**
   * Update an existing package (admin only)
   */
  async updatePackage(
    id: string,
    input: UpdateAICreditPackageInput
  ): Promise<AICreditPackage> {
    return await this.packageRepository.update(id, input);
  }

  /**
   * Soft delete a package (admin only)
   */
  async deletePackage(id: string): Promise<void> {
    await this.packageRepository.softDelete(id);
  }

  /**
   * Restore a soft-deleted package (admin only)
   */
  async restorePackage(id: string): Promise<void> {
    await this.packageRepository.restore(id);
  }

  /**
   * Deactivate a package (makes it unavailable for purchase)
   */
  async deactivatePackage(id: string): Promise<void> {
    await this.packageRepository.update(id, { is_active: false });
  }

  /**
   * Activate a package
   */
  async activatePackage(id: string): Promise<void> {
    await this.packageRepository.update(id, { is_active: true });
  }

  /**
   * Calculate price per credit for a package
   */
  calculatePricePerCredit(pkg: AICreditPackage): number {
    return pkg.price / pkg.credits_amount;
  }

  /**
   * Get best value package (lowest price per credit)
   */
  async getBestValuePackage(currency: string = 'PHP'): Promise<CreditPackageDTO | null> {
    const packages = await this.getActivePackages(currency);

    if (packages.length === 0) {
      return null;
    }

    return packages.reduce((best, current) => {
      const bestPricePerCredit = best.price / best.credits;
      const currentPricePerCredit = current.price / current.credits;
      return currentPricePerCredit < bestPricePerCredit ? current : best;
    });
  }

  /**
   * Get recommended package based on usage history
   * (Can be enhanced with ML in the future)
   */
  async getRecommendedPackage(
    currency: string = 'PHP',
    averageMonthlyUsage?: number
  ): Promise<CreditPackageDTO | null> {
    const packages = await this.getActivePackages(currency);

    if (packages.length === 0) {
      return null;
    }

    // If no usage history, return featured package or middle tier
    if (!averageMonthlyUsage) {
      const featured = packages.find((pkg) => pkg.featured);
      return featured || packages[Math.floor(packages.length / 2)];
    }

    // Find package that covers ~1.5x average monthly usage
    const targetCredits = averageMonthlyUsage * 1.5;
    const closest = packages.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.credits - targetCredits);
      const currDiff = Math.abs(curr.credits - targetCredits);
      return currDiff < prevDiff ? curr : prev;
    });

    return closest;
  }

  /**
   * Validate package pricing (ensure profit margin is maintained)
   */
  validatePackagePricing(
    creditsAmount: number,
    price: number,
    creditValue: number
  ): { valid: boolean; message?: string } {
    const minimumPrice = creditsAmount * creditValue;

    if (price < minimumPrice) {
      return {
        valid: false,
        message: `Price too low. Minimum price for ${creditsAmount} credits is ${minimumPrice.toFixed(2)}`,
      };
    }

    return { valid: true };
  }
}
