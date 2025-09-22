import 'reflect-metadata';
import { injectable } from 'inversify';
import { apiClient } from '../../lib/apiClient';
import {
  MemberMetrics,
  IMembersDashboardAdapter,
} from '../membersDashboard.adapter';

@injectable()
export class MembersDashboardApiAdapter implements IMembersDashboardAdapter {
  async fetchMetrics(): Promise<MemberMetrics> {
    const data = await apiClient.get<MemberMetrics>(
      '/api/dashboard/members/metrics'
    );
    return (
      data || {
        totalMembers: 0,
        newMembers: 0,
        visitorCount: 0,
        familyCount: 0,
      }
    );
  }

  async fetchRecentMembers(limit: number): Promise<any[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const data = await apiClient.get<any[]>(
      `/api/dashboard/members/recent?${params.toString()}`
    );
    return data || [];
  }

  async fetchMemberDirectory(
    search: string | undefined,
    limit: number
  ): Promise<any[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (search) params.set('search', search);
    const data = await apiClient.get<any[]>(
      `/api/dashboard/members/directory?${params.toString()}`
    );
    return data || [];
  }

  async fetchBirthdaysToday(): Promise<any[]> {
    const data = await apiClient.get<any[]>(
      '/api/dashboard/members/birthdays/today'
    );
    return data || [];
  }

  async fetchBirthdaysThisMonth(): Promise<any[]> {
    const data = await apiClient.get<any[]>(
      '/api/dashboard/members/birthdays/month'
    );
    return data || [];
  }

  async fetchBirthdaysByMonth(month: number): Promise<any[]> {
    const params = new URLSearchParams({ month: String(month) });
    const data = await apiClient.get<any[]>(
      `/api/dashboard/members/birthdays/by-month?${params.toString()}`
    );
    return data || [];
  }
}
