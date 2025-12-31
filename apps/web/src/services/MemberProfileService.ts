import 'server-only';
import { injectable, inject } from 'inversify';

import type {
  HouseholdRelationshipRow,
  MemberCarePlanRow,
  MemberGivingProfileRow,
  MemberMilestoneRow,
  MemberRow,
  MemberTimelineEventRow,
  MemberProfileQueryOptions,
} from '@/adapters/memberProfile.adapter';
import {
  type IMemberProfileRepository,
  type MemberTimelineQueryOptions,
} from '@/repositories/memberProfile.repository';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';

export type {
  HouseholdRelationshipRow,
  MemberCarePlanRow,
  MemberGivingProfileRow,
  MemberMilestoneRow,
  MemberRow,
  MemberTimelineEventRow,
} from '@/adapters/memberProfile.adapter';

@injectable()
export class MemberProfileService {
  private tenantId: string | null | undefined;

  constructor(
    @inject(TYPES.IMemberProfileRepository)
    private readonly repo: IMemberProfileRepository
  ) {}

  private async getTenantId(): Promise<string | null> {
    if (this.tenantId !== undefined) {
      return this.tenantId;
    }
    this.tenantId = (await tenantUtils.getTenantId()) ?? null;
    return this.tenantId;
  }

  async getMembers({ memberId = null, limit }: { memberId?: string | null; limit: number }): Promise<MemberRow[]> {
    const tenantId = await this.getTenantId();
    const options: MemberProfileQueryOptions = {
      tenantId,
      memberId,
      limit,
    };
    return this.repo.fetchMembers(options);
  }

  async getHouseholdRelationships(memberId: string): Promise<HouseholdRelationshipRow[]> {
    const tenantId = await this.getTenantId();
    try {
      return await this.repo.fetchHouseholdRelationships(memberId, tenantId);
    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : String(error),
        hint: (error as any)?.hint || '',
        code: (error as any)?.code || ''
      };
      console.error('Failed to load household relationships for member', errorDetails);
      // Return empty array to allow page to load gracefully
      return [];
    }
  }

  async getGivingProfile(memberId: string): Promise<MemberGivingProfileRow | null> {
    const tenantId = await this.getTenantId();
    try {
      return await this.repo.fetchGivingProfile(memberId, tenantId);
    } catch (error) {
      console.error('Failed to load giving profile for member', error);
      return null;
    }
  }

  async getCarePlan(memberId: string): Promise<MemberCarePlanRow | null> {
    const tenantId = await this.getTenantId();
    try {
      return await this.repo.fetchCarePlan(memberId, tenantId);
    } catch (error) {
      console.error('Failed to load care plan for member', error);
      return null;
    }
  }

  async getTimelineEvents(memberId: string, limit: number): Promise<MemberTimelineEventRow[]> {
    const tenantId = await this.getTenantId();
    const options: MemberTimelineQueryOptions = {
      tenantId,
      memberId,
      limit,
    };
    try {
      return await this.repo.fetchTimelineEvents(options);
    } catch (error) {
      console.error('Failed to load timeline events for member', error);
      return [];
    }
  }

  async getMilestones(memberId: string): Promise<MemberMilestoneRow[]> {
    const tenantId = await this.getTenantId();
    try {
      return await this.repo.fetchMilestones(memberId, tenantId);
    } catch (error) {
      console.error('Failed to load discipleship milestones for member', error);
      return [];
    }
  }
}
