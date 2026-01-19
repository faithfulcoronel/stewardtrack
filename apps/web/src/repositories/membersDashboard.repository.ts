import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IMembersDashboardAdapter,
  MemberMetrics,
} from '@/adapters/membersDashboard.adapter';

export interface RecentMember {
  first_name: string;
  last_name: string;
  email: string | null;
  profile_picture_url: string | null;
  membership_stage?: { name: string; code: string } | null;
  membership_center?: { name: string; code: string } | null;
  created_at?: string | null;
}

export interface DirectoryMember extends RecentMember {
  contact_number: string | null;
}

export interface BirthdayMember {
  first_name: string;
  last_name: string;
  birthday: string | null;
  profile_picture_url: string | null;
}

export interface IMembersDashboardRepository {
  getMetrics(): Promise<MemberMetrics>;
  getRecentMembers(limit?: number): Promise<RecentMember[]>;
  getMemberDirectory(
    search?: string,
    limit?: number,
  ): Promise<DirectoryMember[]>;
  getBirthdaysToday(): Promise<BirthdayMember[]>;
  getBirthdaysThisMonth(): Promise<BirthdayMember[]>;
  getBirthdaysByMonth(month: number): Promise<BirthdayMember[]>;
}

@injectable()
export class MembersDashboardRepository implements IMembersDashboardRepository {
  constructor(
    @inject(TYPES.IMembersDashboardAdapter)
    private adapter: IMembersDashboardAdapter,
  ) {}

  getMetrics(): Promise<MemberMetrics> {
    return this.adapter.fetchMetrics();
  }

  getRecentMembers(limit = 5): Promise<RecentMember[]> {
    return this.adapter.fetchRecentMembers(limit);
  }

  getMemberDirectory(
    search?: string,
    limit?: number,
  ): Promise<DirectoryMember[]> {
    return this.adapter.fetchMemberDirectory(search, limit);
  }

  getBirthdaysToday(): Promise<BirthdayMember[]> {
    return this.adapter.fetchBirthdaysToday();
  }

  getBirthdaysThisMonth(): Promise<BirthdayMember[]> {
    return this.adapter.fetchBirthdaysThisMonth();
  }

  getBirthdaysByMonth(month: number): Promise<BirthdayMember[]> {
    return this.adapter.fetchBirthdaysByMonth(month);
  }
}
