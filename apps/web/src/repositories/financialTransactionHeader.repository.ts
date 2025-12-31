import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { FinancialTransactionHeader } from '@/models/financialTransactionHeader.model';
import type { IFinancialTransactionHeaderAdapter } from '@/adapters/financialTransactionHeader.adapter';
import { NotificationService } from '@/services/NotificationService';
import { FinancialTransactionHeaderValidator } from '@/validators/financialTransactionHeader.validator';
import { TYPES } from '@/lib/types';

export interface IFinancialTransactionHeaderRepository
  extends BaseRepository<FinancialTransactionHeader> {
  postTransaction(id: string): Promise<void>;
  submitTransaction(id: string): Promise<void>;
  approveTransaction(id: string): Promise<void>;
  voidTransaction(id: string, reason: string): Promise<void>;
  getTransactionEntries(headerId: string): Promise<any[]>;
  isTransactionBalanced(headerId: string): Promise<boolean>;
  createWithTransactions(
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }>;
  updateWithTransactions(
    id: string,
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }>;
  getUnmappedHeaders(): Promise<FinancialTransactionHeader[]>;
}

@injectable()
export class FinancialTransactionHeaderRepository
  extends BaseRepository<FinancialTransactionHeader>
  implements IFinancialTransactionHeaderRepository
{
  constructor(
    @inject(TYPES.IFinancialTransactionHeaderAdapter)
    private readonly financialTransactionHeaderAdapter: IFinancialTransactionHeaderAdapter
  ) {
    super(financialTransactionHeaderAdapter);
  }

  protected override async beforeCreate(data: Partial<FinancialTransactionHeader>): Promise<Partial<FinancialTransactionHeader>> {
    // Validate header data
    FinancialTransactionHeaderValidator.validate(data);
    
    // Format data before creation
    return this.formatHeaderData(data);
  }

  protected override async afterCreate(_data: FinancialTransactionHeader): Promise<void> {
    // Notification handled at service level
  }

  protected override async beforeUpdate(_id: string, data: Partial<FinancialTransactionHeader>): Promise<Partial<FinancialTransactionHeader>> {
    // Validate header data
    FinancialTransactionHeaderValidator.validate(data);
    
    // Format data before update
    return this.formatHeaderData(data);
  }

  protected override async afterUpdate(_data: FinancialTransactionHeader): Promise<void> {
    // Notification handled at service level
  }

  protected override async beforeDelete(id: string): Promise<void> {
    // Additional repository-level validation before delete
    const header = await this.findById(id);
    if (!header) {
      throw new Error('Transaction not found');
    }
    
    if (header.status === 'posted' || header.status === 'voided') {
      throw new Error(`Cannot delete a ${header.status} transaction`);
    }
  }

  protected override async afterDelete(_id: string): Promise<void> {
    // Notification handled at service level
  }

  public async createWithTransactions(
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const processed = await this.beforeCreate(data);
    const result = await this.financialTransactionHeaderAdapter.createWithTransactions(
      processed,
      transactions
    );
    await this.afterCreate(result.header);
    return result;
  }

  public async updateWithTransactions(
    id: string,
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const processed = await this.beforeUpdate(id, data);
    const result = await this.financialTransactionHeaderAdapter.updateWithTransactions(
      id,
      processed,
      transactions
    );
    await this.afterUpdate(result.header);
    return result;
  }

  // Private helper methods

  private formatHeaderData(data: Partial<FinancialTransactionHeader>): Partial<FinancialTransactionHeader> {
    const formattedData = { ...data };
    
    if (formattedData.description) {
      formattedData.description = formattedData.description.trim();
    }
    
    if (formattedData.reference) {
      formattedData.reference = formattedData.reference.trim();
    }
    
    return formattedData;
  }

  public async postTransaction(id: string): Promise<void> {
    try {
      await this.financialTransactionHeaderAdapter.postTransaction(id);

      NotificationService.showSuccess('Transaction posted successfully');
    } catch (error) {
      NotificationService.showError(
        error instanceof Error ? error.message : 'Failed to post transaction',
        5000
      );
      throw error;
    }
  }

  public async submitTransaction(id: string): Promise<void> {
    try {
      await this.financialTransactionHeaderAdapter.submitTransaction(id);

      NotificationService.showSuccess('Transaction submitted successfully');
    } catch (error) {
      NotificationService.showError(
        error instanceof Error ? error.message : 'Failed to submit transaction',
        5000
      );
      throw error;
    }
  }

  public async approveTransaction(id: string): Promise<void> {
    try {
      await this.financialTransactionHeaderAdapter.approveTransaction(id);

      NotificationService.showSuccess('Transaction approved successfully');
    } catch (error) {
      NotificationService.showError(
        error instanceof Error ? error.message : 'Failed to approve transaction',
        5000
      );
      throw error;
    }
  }

  public async voidTransaction(id: string, reason: string): Promise<void> {
    try {
      await this.financialTransactionHeaderAdapter.voidTransaction(id, reason);
      
      NotificationService.showSuccess('Transaction voided successfully');
    } catch (error) {
      NotificationService.showError(
        error instanceof Error ? error.message : 'Failed to void transaction',
        5000
      );
      throw error;
    }
  }

  public async getTransactionEntries(headerId: string): Promise<any[]> {
    return this.financialTransactionHeaderAdapter.getTransactionEntries(headerId);
  }

  public async isTransactionBalanced(headerId: string): Promise<boolean> {
    return this.financialTransactionHeaderAdapter.isTransactionBalanced(headerId);
  }

  public async getUnmappedHeaders(): Promise<FinancialTransactionHeader[]> {
    return this.financialTransactionHeaderAdapter.getUnmappedHeaders();
  }
}