import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { ChartOfAccount } from '../models/chartOfAccount.model';
import type { IChartOfAccountAdapter } from '../adapters/chartOfAccount.adapter';
import { NotificationService } from '../services/NotificationService';
import { ChartOfAccountValidator } from '../validators/chartOfAccount.validator';
import type { QueryOptions } from '../adapters/base.adapter';

export interface IChartOfAccountRepository extends BaseRepository<ChartOfAccount> {
  findByCode(code: string, options?: Omit<QueryOptions, 'pagination'>): Promise<ChartOfAccount | null>;
  getHierarchy(): Promise<ChartOfAccount[]>;
}

@injectable()
export class ChartOfAccountRepository
  extends BaseRepository<ChartOfAccount>
  implements IChartOfAccountRepository
{
  constructor(
    @inject('IChartOfAccountAdapter') adapter: BaseAdapter<ChartOfAccount>
  ) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<ChartOfAccount>): Promise<Partial<ChartOfAccount>> {
    // Validate account data
    ChartOfAccountValidator.validate(data);
    
    // Format data before creation
    return this.formatAccountData(data);
  }

  protected override async afterCreate(data: ChartOfAccount): Promise<void> {
    // Additional repository-level operations after creation
    NotificationService.showSuccess(`Account "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(id: string, data: Partial<ChartOfAccount>): Promise<Partial<ChartOfAccount>> {
    // Validate account data
    ChartOfAccountValidator.validate(data);
    
    // Format data before update
    return this.formatAccountData(data);
  }

  protected override async afterUpdate(data: ChartOfAccount): Promise<void> {
    // Additional repository-level operations after update
    NotificationService.showSuccess(`Account "${data.name}" updated successfully`);
  }

  protected override async beforeDelete(id: string): Promise<void> {
    // Additional repository-level validation before delete
    const account = await this.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }
  }

  protected override async afterDelete(id: string): Promise<void> {
    // Additional repository-level cleanup after delete
    NotificationService.showSuccess('Account deleted successfully');
  }

  // Private helper methods

  private formatAccountData(data: Partial<ChartOfAccount>): Partial<ChartOfAccount> {
    const formattedData = { ...data };
    
    if (formattedData.code) {
      formattedData.code = formattedData.code.trim();
    }
    
    if (formattedData.name) {
      formattedData.name = formattedData.name.trim();
    }
    
    return formattedData;
  }

  public async findByCode(
    code: string,
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<ChartOfAccount | null> {
    const { data } = await this.find({
      ...options,
      filters: { ...(options.filters || {}), code: { operator: 'eq', value: code } },
      pagination: { page: 1, pageSize: 1 },
    });
    return data[0] || null;
  }

  public async getHierarchy(): Promise<ChartOfAccount[]> {
    return (this.adapter as unknown as IChartOfAccountAdapter).getHierarchy();
  }
}