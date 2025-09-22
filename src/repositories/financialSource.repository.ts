import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { FinancialSource } from '../models/financialSource.model';
import type { IFinancialSourceAdapter } from '../adapters/financialSource.adapter';
import type { IChartOfAccountRepository } from './chartOfAccount.repository';
import { NotificationService } from '../services/NotificationService';
import { FinancialSourceValidator } from '../validators/financialSource.validator';

export type IFinancialSourceRepository = BaseRepository<FinancialSource>;

@injectable()
export class FinancialSourceRepository
  extends BaseRepository<FinancialSource>
  implements IFinancialSourceRepository
{
  constructor(
    @inject('IFinancialSourceAdapter') adapter: BaseAdapter<FinancialSource>,
    @inject('IChartOfAccountRepository')
    private chartOfAccountRepository: IChartOfAccountRepository
  ) {
    super(adapter);
  }

  private coaIdToDelete: string | null = null;

  protected override async beforeCreate(data: Partial<FinancialSource>): Promise<Partial<FinancialSource>> {
    // Validate source data
    FinancialSourceValidator.validate(data);
    
    // Format data before creation
    return this.formatSourceData(data);
  }

  protected override async afterCreate(data: FinancialSource): Promise<void> {
    // Additional repository-level operations after creation
    NotificationService.showSuccess(`Financial source "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(id: string, data: Partial<FinancialSource>): Promise<Partial<FinancialSource>> {
    // Validate source data
    FinancialSourceValidator.validate(data);
    
    // Format data before update
    return this.formatSourceData(data);
  }

  protected override async afterUpdate(data: FinancialSource): Promise<void> {
    // Additional repository-level operations after update
    NotificationService.showSuccess(`Financial source "${data.name}" updated successfully`);
  }

  protected override async beforeDelete(id: string): Promise<void> {
    const source = await this.findById(id);
    if (!source) {
      throw new Error('Financial source not found');
    }
    this.coaIdToDelete = source.coa_id || null;
  }

  protected override async afterDelete(id: string): Promise<void> {
    try {
      if (this.coaIdToDelete) {
        await this.chartOfAccountRepository.delete(this.coaIdToDelete);
      }
      NotificationService.showSuccess('Financial source deleted successfully');
    } catch (error) {
      console.error('Failed to delete linked account:', error);
      NotificationService.showError(
        error instanceof Error ? error.message : 'Failed to delete linked account',
        5000
      );
    } finally {
      this.coaIdToDelete = null;
    }
  }

  // Private helper methods

  private formatSourceData(data: Partial<FinancialSource>): Partial<FinancialSource> {
    const formattedData = { ...data };
    
    if (formattedData.name) {
      formattedData.name = formattedData.name.trim();
    }
    
    if (formattedData.account_number) {
      formattedData.account_number = formattedData.account_number.trim();
    }
    
    return formattedData;
  }
}