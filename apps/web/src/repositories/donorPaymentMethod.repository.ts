import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IDonorPaymentMethodAdapter } from '@/adapters/donorPaymentMethod.adapter';
import type {
  DonorPaymentMethod,
  CreatePaymentMethodDto,
  PaymentMethodDisplay,
  PaymentMethodStatus,
} from '@/models/donorPaymentMethod.model';
import { TYPES } from '@/lib/types';

/**
 * Interface for DonorPaymentMethod repository operations
 */
export interface IDonorPaymentMethodRepository extends BaseRepository<DonorPaymentMethod> {
  createPaymentMethod(data: CreatePaymentMethodDto, tenantId: string): Promise<DonorPaymentMethod>;
  updatePaymentMethod(
    id: string,
    data: Partial<DonorPaymentMethod>,
    tenantId: string
  ): Promise<DonorPaymentMethod>;
  setDefaultPaymentMethod(id: string, memberId: string, tenantId: string): Promise<void>;
  updatePaymentMethodStatus(
    id: string,
    status: PaymentMethodStatus,
    tenantId: string
  ): Promise<DonorPaymentMethod>;
  findByMemberId(memberId: string, tenantId: string): Promise<DonorPaymentMethod[]>;
  findByXenditCustomerId(xenditCustomerId: string): Promise<DonorPaymentMethod[]>;
  findByXenditPaymentMethodId(xenditPaymentMethodId: string): Promise<DonorPaymentMethod | null>;
  getDefaultPaymentMethod(memberId: string, tenantId: string): Promise<DonorPaymentMethod | null>;
  getPaymentMethodsForDisplay(memberId: string, tenantId: string): Promise<PaymentMethodDisplay[]>;
  revokePaymentMethod(id: string, tenantId: string): Promise<void>;
  expirePaymentMethods(tenantId: string, beforeDate: string): Promise<number>;
}

@injectable()
export class DonorPaymentMethodRepository
  extends BaseRepository<DonorPaymentMethod>
  implements IDonorPaymentMethodRepository
{
  constructor(
    @inject(TYPES.IDonorPaymentMethodAdapter) private paymentMethodAdapter: IDonorPaymentMethodAdapter
  ) {
    super(paymentMethodAdapter);
  }

  /**
   * Create a new payment method
   */
  async createPaymentMethod(
    data: CreatePaymentMethodDto,
    tenantId: string
  ): Promise<DonorPaymentMethod> {
    return await this.paymentMethodAdapter.createPaymentMethod(data, tenantId);
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(
    id: string,
    data: Partial<DonorPaymentMethod>,
    tenantId: string
  ): Promise<DonorPaymentMethod> {
    return await this.paymentMethodAdapter.updatePaymentMethod(id, data, tenantId);
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(id: string, memberId: string, tenantId: string): Promise<void> {
    return await this.paymentMethodAdapter.setDefaultPaymentMethod(id, memberId, tenantId);
  }

  /**
   * Update payment method status
   */
  async updatePaymentMethodStatus(
    id: string,
    status: PaymentMethodStatus,
    tenantId: string
  ): Promise<DonorPaymentMethod> {
    return await this.paymentMethodAdapter.updatePaymentMethodStatus(id, status, tenantId);
  }

  /**
   * Find payment methods by member ID
   */
  async findByMemberId(memberId: string, tenantId: string): Promise<DonorPaymentMethod[]> {
    return await this.paymentMethodAdapter.findByMemberId(memberId, tenantId);
  }

  /**
   * Find payment methods by Xendit customer ID
   */
  async findByXenditCustomerId(xenditCustomerId: string): Promise<DonorPaymentMethod[]> {
    return await this.paymentMethodAdapter.findByXenditCustomerId(xenditCustomerId);
  }

  /**
   * Find payment method by Xendit payment method ID
   */
  async findByXenditPaymentMethodId(
    xenditPaymentMethodId: string
  ): Promise<DonorPaymentMethod | null> {
    return await this.paymentMethodAdapter.findByXenditPaymentMethodId(xenditPaymentMethodId);
  }

  /**
   * Get default payment method for a member
   */
  async getDefaultPaymentMethod(
    memberId: string,
    tenantId: string
  ): Promise<DonorPaymentMethod | null> {
    return await this.paymentMethodAdapter.getDefaultPaymentMethod(memberId, tenantId);
  }

  /**
   * Get payment methods formatted for display
   */
  async getPaymentMethodsForDisplay(
    memberId: string,
    tenantId: string
  ): Promise<PaymentMethodDisplay[]> {
    return await this.paymentMethodAdapter.getPaymentMethodsForDisplay(memberId, tenantId);
  }

  /**
   * Revoke a payment method
   */
  async revokePaymentMethod(id: string, tenantId: string): Promise<void> {
    return await this.paymentMethodAdapter.revokePaymentMethod(id, tenantId);
  }

  /**
   * Expire payment methods that have passed their expiration date
   */
  async expirePaymentMethods(tenantId: string, beforeDate: string): Promise<number> {
    return await this.paymentMethodAdapter.expirePaymentMethods(tenantId, beforeDate);
  }
}
