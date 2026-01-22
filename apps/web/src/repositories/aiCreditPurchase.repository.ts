import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { TYPES } from '@/lib/types';
import {
  AICreditPurchase,
  AICreditPurchaseWithPackage,
  CreateAICreditPurchaseInput,
  UpdateAICreditPurchaseInput,
  PurchaseHistoryOptions,
} from '@/models/aiCreditPurchase.model';
import type { IAICreditPurchaseAdapter } from '@/adapters/aiCreditPurchase.adapter';

export interface IAICreditPurchaseRepository
  extends BaseRepository<AICreditPurchase> {
  /**
   * Find purchase by Xendit invoice ID
   */
  findByXenditInvoiceId(invoiceId: string): Promise<AICreditPurchase | null>;

  /**
   * Get purchase history for a tenant
   */
  getPurchaseHistory(
    tenantId: string,
    options?: PurchaseHistoryOptions
  ): Promise<AICreditPurchaseWithPackage[]>;

  /**
   * Get purchases by status
   */
  findByStatus(
    status: 'pending' | 'paid' | 'completed' | 'failed' | 'expired'
  ): Promise<AICreditPurchase[]>;

  /**
   * Mark purchase as completed
   */
  markCompleted(purchaseId: string): Promise<void>;

  /**
   * Mark purchase as failed
   */
  markFailed(purchaseId: string, reason?: string): Promise<void>;

  /**
   * Get pending purchases for tenant
   */
  getPendingPurchases(tenantId: string): Promise<AICreditPurchase[]>;
}

@injectable()
export class AICreditPurchaseRepository
  extends BaseRepository<AICreditPurchase>
  implements IAICreditPurchaseRepository
{
  constructor(
    @inject(TYPES.IAICreditPurchaseAdapter)
    private readonly purchaseAdapter: IAICreditPurchaseAdapter
  ) {
    super(purchaseAdapter);
  }

  /**
   * Override findById to use adapter's findById (which doesn't filter by deleted_at)
   */
  async findById(id: string): Promise<AICreditPurchase | null> {
    return await this.purchaseAdapter.findById(id);
  }

  async findByXenditInvoiceId(invoiceId: string): Promise<AICreditPurchase | null> {
    return await this.purchaseAdapter.findByXenditInvoiceId(invoiceId);
  }

  async getPurchaseHistory(
    tenantId: string,
    options?: PurchaseHistoryOptions
  ): Promise<AICreditPurchaseWithPackage[]> {
    return await this.purchaseAdapter.getPurchaseHistory(tenantId, options);
  }

  async findByStatus(
    status: 'pending' | 'paid' | 'completed' | 'failed' | 'expired'
  ): Promise<AICreditPurchase[]> {
    return await this.purchaseAdapter.findByStatus(status);
  }

  async markCompleted(purchaseId: string): Promise<void> {
    await this.update(purchaseId, {
      payment_status: 'completed',
      purchased_at: new Date().toISOString(),
    });
  }

  async markFailed(purchaseId: string, reason?: string): Promise<void> {
    const updateData: UpdateAICreditPurchaseInput = {
      payment_status: 'failed',
    };

    if (reason) {
      updateData.metadata = { failure_reason: reason };
    }

    await this.update(purchaseId, updateData);
  }

  async getPendingPurchases(tenantId: string): Promise<AICreditPurchase[]> {
    return await this.purchaseAdapter.getPendingPurchases(tenantId);
  }

  protected override async beforeCreate(
    data: Partial<AICreditPurchase>
  ): Promise<Partial<AICreditPurchase>> {
    // Validate purchase data
    if (!data.tenant_id) {
      throw new Error('Tenant ID is required');
    }

    if (!data.package_id) {
      throw new Error('Package ID is required');
    }

    if (!data.credits_purchased || data.credits_purchased <= 0) {
      throw new Error('Credits purchased must be greater than 0');
    }

    if (data.amount_paid === undefined || data.amount_paid < 0) {
      throw new Error('Amount paid must be provided and non-negative');
    }

    // Set defaults
    return {
      ...data,
      payment_status: data.payment_status || 'pending',
      purchase_type: data.purchase_type || 'manual',
      currency: data.currency || 'PHP',
    };
  }
}
