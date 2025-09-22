import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { IFinanceDashboardRepository } from '../repositories/financeDashboard.repository';

@injectable()
export class FinanceDashboardService {
  constructor(
    @inject(TYPES.IFinanceDashboardRepository)
    private repo: IFinanceDashboardRepository,
  ) {}

  getMonthlyTrends(startDate?: Date, endDate?: Date) {
    return this.repo.getMonthlyTrends(startDate, endDate);
  }

  getMonthlyStats(startDate: Date, endDate: Date) {
    return this.repo.getMonthlyStats(startDate, endDate);
  }

  getFundBalances() {
    return this.repo.getFundBalances();
  }

  getSourceBalances() {
    return this.repo.getSourceBalances();
  }
}
