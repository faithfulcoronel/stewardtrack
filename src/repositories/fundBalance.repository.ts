import { injectable, inject } from 'inversify';
import type { IFundBalanceAdapter } from '../adapters/fundBalance.adapter';
import { TYPES } from '../lib/types';

export interface IFundBalanceRepository {
  getBalance(fundId: string): Promise<number>;
}

@injectable()
export class FundBalanceRepository implements IFundBalanceRepository {
  constructor(
    @inject(TYPES.IFundBalanceAdapter)
    private adapter: IFundBalanceAdapter
  ) {}

  async getBalance(fundId: string): Promise<number> {
    const row = await this.adapter.fetchBalance(fundId);
    return row ? Number(row.balance) : 0;
  }
}
