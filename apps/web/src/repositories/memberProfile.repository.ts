import { injectable, inject } from 'inversify';

import {
  type HouseholdRelationshipRow,
  type IMemberProfileAdapter,
  type MemberCarePlanRow,
  type MemberGivingProfileRow,
  type MemberMilestoneRow,
  type MemberProfileQueryOptions,
  type MemberRow,
  type MemberTimelineEventRow,
} from '@/adapters/memberProfile.adapter';
import { TYPES } from '@/lib/types';

export interface MemberTimelineQueryOptions {
  tenantId: string | null;
  memberId: string;
  limit: number;
}

export interface IMemberProfileRepository {
  fetchMembers(options: MemberProfileQueryOptions): Promise<MemberRow[]>;
  fetchHouseholdRelationships(
    memberId: string,
    tenantId: string | null
  ): Promise<HouseholdRelationshipRow[]>;
  fetchGivingProfile(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberGivingProfileRow | null>;
  fetchCarePlan(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberCarePlanRow | null>;
  fetchTimelineEvents(options: MemberTimelineQueryOptions): Promise<MemberTimelineEventRow[]>;
  fetchMilestones(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberMilestoneRow[]>;
}

@injectable()
export class MemberProfileRepository implements IMemberProfileRepository {
  constructor(
    @inject(TYPES.IMemberProfileAdapter)
    private readonly adapter: IMemberProfileAdapter
  ) {}

  fetchMembers(options: MemberProfileQueryOptions): Promise<MemberRow[]> {
    return this.adapter.fetchMembers(options);
  }

  fetchHouseholdRelationships(
    memberId: string,
    tenantId: string | null
  ): Promise<HouseholdRelationshipRow[]> {
    return this.adapter.fetchHouseholdRelationships(memberId, tenantId);
  }

  fetchGivingProfile(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberGivingProfileRow | null> {
    return this.adapter.fetchGivingProfile(memberId, tenantId);
  }

  fetchCarePlan(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberCarePlanRow | null> {
    return this.adapter.fetchCarePlan(memberId, tenantId);
  }

  fetchTimelineEvents(options: MemberTimelineQueryOptions): Promise<MemberTimelineEventRow[]> {
    return this.adapter.fetchTimelineEvents(options.memberId, options.tenantId, options.limit);
  }

  fetchMilestones(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberMilestoneRow[]> {
    return this.adapter.fetchMilestones(memberId, tenantId);
  }
}
