import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IDiscountAdapter,
} from '@/adapters/discount.adapter';
import type {
  Discount,
  DiscountRedemption,
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountValidationResult,
  ActiveDiscount,
  RedeemDiscountParams,
} from '@/models/discount.model';

export interface IDiscountRepository {
  // CRUD operations
  createDiscount(data: CreateDiscountDto): Promise<Discount>;
  updateDiscount(id: string, data: UpdateDiscountDto): Promise<Discount>;
  deleteDiscount(id: string): Promise<void>;
  getDiscountById(id: string): Promise<Discount | null>;
  getDiscountByCode(code: string): Promise<Discount | null>;

  // Query operations
  getActiveDiscounts(): Promise<Discount[]>;
  getAutomaticDiscounts(): Promise<Discount[]>;
  getCouponDiscounts(): Promise<Discount[]>;
  getAllDiscounts(includeInactive?: boolean): Promise<Discount[]>;

  // Validation and redemption
  validateDiscountCode(
    code: string,
    offeringId: string,
    tenantId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult>;

  validateDiscountCodePublic(
    code: string,
    offeringId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult>;

  getActiveDiscountsForOffering(
    offeringId: string,
    currency?: string
  ): Promise<ActiveDiscount[]>;

  redeemDiscount(params: RedeemDiscountParams): Promise<string>;

  // Redemption history
  getDiscountRedemptions(discountId: string): Promise<DiscountRedemption[]>;
  getTenantRedemptions(tenantId: string): Promise<DiscountRedemption[]>;
}

@injectable()
export class DiscountRepository implements IDiscountRepository {
  constructor(
    @inject(TYPES.IDiscountAdapter) private adapter: IDiscountAdapter
  ) {}

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  async createDiscount(data: CreateDiscountDto): Promise<Discount> {
    return this.adapter.createDiscount(data);
  }

  async updateDiscount(id: string, data: UpdateDiscountDto): Promise<Discount> {
    return this.adapter.updateDiscount(id, data);
  }

  async deleteDiscount(id: string): Promise<void> {
    return this.adapter.deleteDiscount(id);
  }

  async getDiscountById(id: string): Promise<Discount | null> {
    return this.adapter.getDiscountById(id);
  }

  async getDiscountByCode(code: string): Promise<Discount | null> {
    return this.adapter.getDiscountByCode(code);
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async getActiveDiscounts(): Promise<Discount[]> {
    return this.adapter.getActiveDiscounts();
  }

  async getAutomaticDiscounts(): Promise<Discount[]> {
    return this.adapter.getAutomaticDiscounts();
  }

  async getCouponDiscounts(): Promise<Discount[]> {
    return this.adapter.getCouponDiscounts();
  }

  async getAllDiscounts(includeInactive: boolean = false): Promise<Discount[]> {
    return this.adapter.getAllDiscounts(includeInactive);
  }

  // ==========================================================================
  // Validation and Redemption
  // ==========================================================================

  async validateDiscountCode(
    code: string,
    offeringId: string,
    tenantId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult> {
    return this.adapter.validateDiscountCode(code, offeringId, tenantId, amount, currency);
  }

  async validateDiscountCodePublic(
    code: string,
    offeringId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult> {
    return this.adapter.validateDiscountCodePublic(code, offeringId, amount, currency);
  }

  async getActiveDiscountsForOffering(
    offeringId: string,
    currency: string = 'PHP'
  ): Promise<ActiveDiscount[]> {
    return this.adapter.getActiveDiscountsForOffering(offeringId, currency);
  }

  async redeemDiscount(params: RedeemDiscountParams): Promise<string> {
    return this.adapter.redeemDiscount(params);
  }

  // ==========================================================================
  // Redemption History
  // ==========================================================================

  async getDiscountRedemptions(discountId: string): Promise<DiscountRedemption[]> {
    return this.adapter.getDiscountRedemptions(discountId);
  }

  async getTenantRedemptions(tenantId: string): Promise<DiscountRedemption[]> {
    return this.adapter.getTenantRedemptions(tenantId);
  }
}
