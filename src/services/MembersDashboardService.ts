import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { IMembersDashboardRepository } from '../repositories/membersDashboard.repository';

@injectable()
export class MembersDashboardService {
  constructor(
    @inject(TYPES.IMembersDashboardRepository)
    private repo: IMembersDashboardRepository,
  ) {}

  getMetrics() {
    return this.repo.getMetrics();
  }

  getRecentMembers(limit?: number) {
    return this.repo.getRecentMembers(limit);
  }

  getDirectory(search?: string, limit?: number) {
    return this.repo.getMemberDirectory(search, limit);
  }

  getBirthdaysToday() {
    return this.repo.getBirthdaysToday();
  }

  getBirthdaysThisMonth() {
    return this.repo.getBirthdaysThisMonth();
  }

  getBirthdaysByMonth(month: number) {
    return this.repo.getBirthdaysByMonth(month);
  }
}
