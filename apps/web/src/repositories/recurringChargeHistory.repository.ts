import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '@/lib/types';
import type { IRecurringChargeHistoryAdapter, ActiveTenant } from '@/adapters/recurringChargeHistory.adapter';
import type {
  RecurringChargeHistory,
  CreateRecurringChargeHistoryDto,
} from '@/models/donation.model';

/**
 * Interface for RecurringChargeHistory repository operations
 */
export interface IRecurringChargeHistoryRepository {
  create(data: CreateRecurringChargeHistoryDto): Promise<RecurringChargeHistory>;
  update(id: string, data: Partial<RecurringChargeHistory>): Promise<RecurringChargeHistory>;
  findByRecurringDonationId(recurringDonationId: string, tenantId: string): Promise<RecurringChargeHistory[]>;
  getAttemptCount(recurringDonationId: string, scheduledDate: string): Promise<number>;
  sumSuccessfulAmount(recurringDonationId: string): Promise<number>;
  countSuccessful(recurringDonationId: string): Promise<number>;
  calculateNextRecurringDate(currentDate: string, frequency: string): Promise<string>;
  updateRecurringDonationAfterCharge(
    donationId: string,
    success: boolean,
    childDonationId?: string
  ): Promise<void>;
  getAllActiveTenants(): Promise<ActiveTenant[]>;
}

@injectable()
export class RecurringChargeHistoryRepository implements IRecurringChargeHistoryRepository {
  constructor(
    @inject(TYPES.IRecurringChargeHistoryAdapter)
    private adapter: IRecurringChargeHistoryAdapter
  ) {}

  async create(data: CreateRecurringChargeHistoryDto): Promise<RecurringChargeHistory> {
    return await this.adapter.create(data);
  }

  async update(id: string, data: Partial<RecurringChargeHistory>): Promise<RecurringChargeHistory> {
    return await this.adapter.update(id, data);
  }

  async findByRecurringDonationId(
    recurringDonationId: string,
    tenantId: string
  ): Promise<RecurringChargeHistory[]> {
    return await this.adapter.findByRecurringDonationId(recurringDonationId, tenantId);
  }

  async getAttemptCount(recurringDonationId: string, scheduledDate: string): Promise<number> {
    return await this.adapter.getAttemptCount(recurringDonationId, scheduledDate);
  }

  async sumSuccessfulAmount(recurringDonationId: string): Promise<number> {
    return await this.adapter.sumSuccessfulAmount(recurringDonationId);
  }

  async countSuccessful(recurringDonationId: string): Promise<number> {
    return await this.adapter.countSuccessful(recurringDonationId);
  }

  async calculateNextRecurringDate(currentDate: string, frequency: string): Promise<string> {
    return await this.adapter.calculateNextRecurringDate(currentDate, frequency);
  }

  async updateRecurringDonationAfterCharge(
    donationId: string,
    success: boolean,
    childDonationId?: string
  ): Promise<void> {
    return await this.adapter.updateRecurringDonationAfterCharge(donationId, success, childDonationId);
  }

  async getAllActiveTenants(): Promise<ActiveTenant[]> {
    return await this.adapter.getAllActiveTenants();
  }
}
