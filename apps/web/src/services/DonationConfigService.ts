import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { FinancialSourceService } from '@/services/FinancialSourceService';
import type { ChartOfAccountService } from '@/services/ChartOfAccountService';
import type { FinancialSource } from '@/models/financialSource.model';
import type { Category } from '@/models/category.model';

/**
 * DonationConfigService
 *
 * Manages donation-related financial configuration for tenants.
 * Ensures required financial sources and categories exist before
 * donations can be processed.
 *
 * Key responsibilities:
 * - Auto-create "Online Giving" financial source
 * - Auto-create default giving categories (Tithes, Offering, etc.)
 * - Provide configured IDs for donation processing
 */

export interface DonationConfig {
  onlineGivingSourceId: string;
  defaultCategoryId?: string;
}

export interface GivingCategoryInfo {
  code: string;
  name: string;
  description: string;
  coaCode: string;
  coaName: string;
}

// Default giving categories that should exist for donations
const DEFAULT_GIVING_CATEGORIES: GivingCategoryInfo[] = [
  {
    code: 'TITHES',
    name: 'Tithes',
    description: 'Regular tithes from members',
    coaCode: '4010',
    coaName: 'Tithes',
  },
  {
    code: 'OFFERING',
    name: 'Offering',
    description: 'General offerings',
    coaCode: '4020',
    coaName: 'General Offerings',
  },
  {
    code: 'MISSIONS',
    name: 'Missions',
    description: 'Missions and outreach offerings',
    coaCode: '4030',
    coaName: 'Missions Offerings',
  },
  {
    code: 'BUILDING_FUND',
    name: 'Building Fund',
    description: 'Building fund contributions',
    coaCode: '4040',
    coaName: 'Building Fund Offerings',
  },
  {
    code: 'LOVE_OFFERING',
    name: 'Love Offering',
    description: 'Love offerings for special purposes',
    coaCode: '4050',
    coaName: 'Love Offerings',
  },
  {
    code: 'SPECIAL_OFFERING',
    name: 'Special Offering',
    description: 'Special and designated offerings',
    coaCode: '4060',
    coaName: 'Special Offerings',
  },
];

@injectable()
export class DonationConfigService {
  constructor(
    @inject(TYPES.IFinancialSourceRepository)
    private financialSourceRepository: IFinancialSourceRepository,
    @inject(TYPES.ICategoryRepository)
    private categoryRepository: ICategoryRepository,
    @inject(TYPES.FinancialSourceService)
    private financialSourceService: FinancialSourceService,
    @inject(TYPES.ChartOfAccountService)
    private coaService: ChartOfAccountService
  ) {}

  /**
   * Ensure the tenant has the required financial setup for donations.
   * Creates "Online Giving" source and default categories if they don't exist.
   */
  async ensureFinancialSetup(tenantId: string): Promise<DonationConfig> {
    // 1. Ensure "Online Giving" financial source exists
    const source = await this.ensureOnlineGivingSource(tenantId);

    // 2. Ensure default giving categories exist
    const categories = await this.ensureDefaultCategories(tenantId);

    // 3. Return config with first category as default
    return {
      onlineGivingSourceId: source.id,
      defaultCategoryId: categories.length > 0 ? categories[0].id : undefined,
    };
  }

  /**
   * Get the Online Giving financial source ID for a tenant.
   * Creates the source if it doesn't exist.
   */
  async getOnlineGivingSourceId(tenantId: string): Promise<string> {
    const source = await this.ensureOnlineGivingSource(tenantId);
    return source.id;
  }

  /**
   * Get all giving categories for a tenant (for donor selection).
   */
  async getGivingCategories(tenantId: string): Promise<Category[]> {
    const { data: categories } = await this.categoryRepository.find({
      filters: {
        is_active: { operator: 'eq', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    });

    // Filter to income/giving categories (those with revenue account)
    if (!categories) return [];

    return categories.filter((cat: Category) => {
      // Include categories that have the giving category codes
      return DEFAULT_GIVING_CATEGORIES.some((gc) => gc.code === cat.code);
    });
  }

  /**
   * Ensure "Online Giving" financial source exists for the tenant.
   */
  private async ensureOnlineGivingSource(tenantId: string): Promise<FinancialSource> {
    // Try to find existing source
    const { data: existingSources } = await this.financialSourceRepository.find({
      filters: {
        name: { operator: 'eq', value: 'Online Giving' },
        source_type: { operator: 'eq', value: 'online' },
      },
    });

    if (existingSources && existingSources.length > 0) {
      return existingSources[0] as FinancialSource;
    }

    // Create new source with auto-created asset account
    console.log(`[DonationConfigService] Creating "Online Giving" source for tenant ${tenantId}`);

    const source = await this.financialSourceService.createWithAccount(
      {
        name: 'Online Giving',
        description: 'Xendit payment gateway for online donations',
        source_type: 'online',
        is_active: true,
        auto_create: true, // Auto-create linked asset account
      },
      undefined,
      []
    );

    console.log(`[DonationConfigService] Created "Online Giving" source: ${source.id}`);
    return source;
  }

  /**
   * Ensure default giving categories exist for the tenant.
   */
  private async ensureDefaultCategories(tenantId: string): Promise<Category[]> {
    const createdCategories: Category[] = [];

    for (const categoryInfo of DEFAULT_GIVING_CATEGORIES) {
      const category = await this.ensureCategory(tenantId, categoryInfo);
      if (category) {
        createdCategories.push(category);
      }
    }

    return createdCategories;
  }

  /**
   * Ensure a single category exists, creating it if necessary.
   */
  private async ensureCategory(
    tenantId: string,
    info: GivingCategoryInfo
  ): Promise<Category | null> {
    // Check if category already exists
    const { data: existingCategories } = await this.categoryRepository.find({
      filters: {
        code: { operator: 'eq', value: info.code },
      },
    });

    if (existingCategories && existingCategories.length > 0) {
      return existingCategories[0] as Category;
    }

    try {
      // Find or create the revenue account for this category
      const revenueCoa = await this.findOrCreateRevenueAccount(tenantId, info.coaCode, info.coaName);

      // Create the category
      console.log(`[DonationConfigService] Creating category "${info.name}" for tenant ${tenantId}`);

      const category = await this.categoryRepository.create({
        code: info.code,
        name: info.name,
        description: info.description,
        chart_of_account_id: revenueCoa?.id || null,
        is_active: true,
        is_system: false,
        sort_order: DEFAULT_GIVING_CATEGORIES.findIndex((c) => c.code === info.code) * 10,
      });

      console.log(`[DonationConfigService] Created category "${info.name}": ${category.id}`);
      return category;
    } catch (error) {
      console.error(`[DonationConfigService] Failed to create category "${info.name}":`, error);
      return null;
    }
  }

  /**
   * Find or create a revenue account for a giving category.
   */
  private async findOrCreateRevenueAccount(
    _tenantId: string,
    code: string,
    name: string
  ): Promise<{ id: string } | null> {
    try {
      // Try to find existing account by code
      const existingAccount = await this.coaService.findByCode(code);
      if (existingAccount) {
        return { id: existingAccount.id };
      }

      // Find the revenue parent account (4000 or 4100)
      const revenueParent = await this.coaService.findByCode('4000');
      const parentId = revenueParent?.id || null;

      // Create new revenue account
      const newAccount = await this.coaService.create(
        {
          code,
          name,
          account_type: 'revenue',
          parent_id: parentId,
          is_active: true,
        },
        undefined,
        ['chart_of_accounts']
      );

      return { id: newAccount.id };
    } catch (error) {
      console.error(`[DonationConfigService] Failed to create revenue account ${code}:`, error);
      return null;
    }
  }

  /**
   * Check if the tenant has the required donation configuration.
   */
  async hasRequiredSetup(tenantId: string): Promise<boolean> {
    try {
      // Check for Online Giving source
      const { data: sources } = await this.financialSourceRepository.find({
        filters: {
          name: { operator: 'eq', value: 'Online Giving' },
          source_type: { operator: 'eq', value: 'online' },
        },
      });

      if (!sources || sources.length === 0) {
        return false;
      }

      // Check for at least one giving category
      const categories = await this.getGivingCategories(tenantId);
      return categories.length > 0;
    } catch (error) {
      console.error('[DonationConfigService] Failed to check setup:', error);
      return false;
    }
  }
}
