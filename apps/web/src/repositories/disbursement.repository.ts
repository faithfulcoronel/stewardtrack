import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '@/lib/types';
import type { IDisbursementAdapter } from '@/adapters/disbursement.adapter';
import type {
  Disbursement,
  DisbursementDonation,
  CreateDisbursementDto,
  DisbursementStatus,
  DisbursementReadyDonation,
  PayoutEnabledSource,
} from '@/models/disbursement.model';

/**
 * Interface for Disbursement repository operations
 */
export interface IDisbursementRepository {
  // CRUD operations
  createDisbursement(data: CreateDisbursementDto): Promise<Disbursement>;
  updateDisbursementStatus(
    id: string,
    status: DisbursementStatus,
    xenditDisbursementId?: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void>;
  findById(id: string, tenantId: string): Promise<Disbursement | null>;
  findByTenant(tenantId: string, status?: DisbursementStatus): Promise<Disbursement[]>;
  findPendingDisbursements(): Promise<Disbursement[]>;

  // Junction table operations
  addDonationsToDisbursement(
    disbursementId: string,
    donations: Array<{
      donation_id: string;
      donation_amount: number;
      xendit_fee: number;
      platform_fee: number;
      net_amount: number;
    }>
  ): Promise<void>;
  getDisbursementDonations(disbursementId: string): Promise<DisbursementDonation[]>;
  markDonationsAsDisbursed(disbursementId: string, donationIds: string[]): Promise<void>;

  // RPC functions
  getDonationsForDisbursement(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<DisbursementReadyDonation[]>;
  getPayoutEnabledSources(tenantId: string): Promise<PayoutEnabledSource[]>;

  // For cron
  getTenantsWithScheduledDisbursements(schedule: string): Promise<Array<{ tenant_id: string; source_id: string }>>;
}

@injectable()
export class DisbursementRepository implements IDisbursementRepository {
  constructor(
    @inject(TYPES.IDisbursementAdapter)
    private adapter: IDisbursementAdapter
  ) {}

  async createDisbursement(data: CreateDisbursementDto): Promise<Disbursement> {
    return await this.adapter.createDisbursement(data);
  }

  async updateDisbursementStatus(
    id: string,
    status: DisbursementStatus,
    xenditDisbursementId?: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    return await this.adapter.updateDisbursementStatus(
      id,
      status,
      xenditDisbursementId,
      errorCode,
      errorMessage
    );
  }

  async findById(id: string, tenantId: string): Promise<Disbursement | null> {
    return await this.adapter.findById(id, tenantId);
  }

  async findByTenant(tenantId: string, status?: DisbursementStatus): Promise<Disbursement[]> {
    return await this.adapter.findByTenant(tenantId, status);
  }

  async findPendingDisbursements(): Promise<Disbursement[]> {
    return await this.adapter.findPendingDisbursements();
  }

  async addDonationsToDisbursement(
    disbursementId: string,
    donations: Array<{
      donation_id: string;
      donation_amount: number;
      xendit_fee: number;
      platform_fee: number;
      net_amount: number;
    }>
  ): Promise<void> {
    return await this.adapter.addDonationsToDisbursement(disbursementId, donations);
  }

  async getDisbursementDonations(disbursementId: string): Promise<DisbursementDonation[]> {
    return await this.adapter.getDisbursementDonations(disbursementId);
  }

  async markDonationsAsDisbursed(disbursementId: string, donationIds: string[]): Promise<void> {
    return await this.adapter.markDonationsAsDisbursed(disbursementId, donationIds);
  }

  async getDonationsForDisbursement(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<DisbursementReadyDonation[]> {
    return await this.adapter.getDonationsForDisbursement(tenantId, periodStart, periodEnd);
  }

  async getPayoutEnabledSources(tenantId: string): Promise<PayoutEnabledSource[]> {
    return await this.adapter.getPayoutEnabledSources(tenantId);
  }

  async getTenantsWithScheduledDisbursements(
    schedule: string
  ): Promise<Array<{ tenant_id: string; source_id: string }>> {
    return await this.adapter.getTenantsWithScheduledDisbursements(schedule);
  }
}
