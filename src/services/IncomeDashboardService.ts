import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { IIncomeDashboardRepository } from '../repositories/incomeDashboard.repository';

@injectable()
export class IncomeDashboardService {
  constructor(
    @inject(TYPES.IIncomeDashboardRepository)
    private repo: IIncomeDashboardRepository,
  ) {}

  getMetrics() {
    return this.repo.getMetrics();
  }

  getRecentDonations(limit?: number) {
    return this.repo.getRecentDonations(limit);
  }

  getDonationHistory(limit?: number) {
    return this.repo.getDonationHistory(limit);
  }
}
