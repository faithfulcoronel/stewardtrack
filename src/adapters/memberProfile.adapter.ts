import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { RequestContext } from '@/lib/server/context';
import { tenantUtils } from '@/utils/tenantUtils';

export interface MemberRow {
  id: string;
  tenant_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  email?: string | null;
  contact_number?: string | null;
  address?: unknown;
  membership_date?: string | null;
  membership_stage?: { name?: string | null; code?: string | null } | null;
  membership_center?: { name?: string | null; code?: string | null } | null;
  preferred_contact_method?: string | null;
  serving_team?: string | null;
  serving_role?: string | null;
  serving_schedule?: string | null;
  serving_coach?: string | null;
  discipleship_next_step?: string | null;
  discipleship_mentor?: string | null;
  discipleship_group?: string | null;
  small_groups?: string[] | null;
  tags?: string[] | null;
  giving_recurring_amount?: number | null;
  giving_recurring_frequency?: string | null;
  giving_recurring_method?: string | null;
  giving_pledge_amount?: number | null;
  giving_pledge_campaign?: string | null;
  giving_last_gift_amount?: number | null;
  giving_last_gift_at?: string | null;
  giving_last_gift_fund?: string | null;
  care_status_code?: string | null;
  care_pastor?: string | null;
  care_follow_up_at?: string | null;
  pastoral_notes?: string | null;
}

export interface MemberGivingProfileRow {
  recurring_amount?: number | null;
  recurring_frequency?: string | null;
  recurring_method?: string | null;
  recurring_status?: string | null;
  pledge_amount?: number | null;
  pledge_campaign?: string | null;
  pledge_start_date?: string | null;
  pledge_end_date?: string | null;
  ytd_amount?: number | null;
  ytd_year?: number | null;
  last_gift_amount?: number | null;
  last_gift_at?: string | null;
  last_gift_fund?: string | null;
  last_gift_source?: string | null;
}

export interface MemberCarePlanRow {
  status_code?: string | null;
  status_label?: string | null;
  assigned_to?: string | null;
  follow_up_at?: string | null;
  details?: string | null;
  priority?: string | null;
}

export interface MemberTimelineEventRow {
  id: string;
  title: string;
  description?: string | null;
  event_category?: string | null;
  status?: string | null;
  icon?: string | null;
  occurred_at?: string | null;
}

export interface MemberMilestoneRow {
  name?: string | null;
  milestone_date?: string | null;
}

export interface HouseholdRelationshipRow {
  member_id: string;
  related_member_id: string;
  member?: { first_name?: string | null; last_name?: string | null; preferred_name?: string | null } | null;
  related_member?: { first_name?: string | null; last_name?: string | null; preferred_name?: string | null } | null;
}

export interface MemberProfileQueryOptions {
  tenantId: string | null;
  memberId?: string | null;
  limit: number;
}

export interface IMemberProfileAdapter {
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
  fetchTimelineEvents(
    memberId: string,
    tenantId: string | null,
    limit: number
  ): Promise<MemberTimelineEventRow[]>;
  fetchMilestones(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberMilestoneRow[]>;
}

@injectable()
export class MemberProfileAdapter implements IMemberProfileAdapter {
  private supabase: SupabaseClient | null = null;
  private context: RequestContext = {} as RequestContext;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  private async resolveTenantId(explicitTenantId: string | null | undefined) {
    if (explicitTenantId !== undefined) {
      return explicitTenantId;
    }
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }

  async fetchMembers({ memberId = null, limit, tenantId }: MemberProfileQueryOptions): Promise<MemberRow[]> {
    const supabase = await this.getSupabaseClient();
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    let query = supabase
      .from('members')
      .select(
        `
          id,
          tenant_id,
          first_name,
          last_name,
          preferred_name,
          email,
          contact_number,
          address,
          membership_date,
          membership_stage:membership_status_id(name, code),
          membership_center:membership_center_id(name, code),
          preferred_contact_method,
          serving_team,
          serving_role,
          serving_schedule,
          serving_coach,
          discipleship_next_step,
          discipleship_mentor,
          discipleship_group,
          small_groups,
          tags,
          giving_recurring_amount,
          giving_recurring_frequency,
          giving_recurring_method,
          giving_pledge_amount,
          giving_pledge_campaign,
          giving_last_gift_amount,
          giving_last_gift_at,
          giving_last_gift_fund,
          care_status_code,
          care_pastor,
          care_follow_up_at,
          pastoral_notes
        `
      )
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(memberId ? 1 : limit);

    if (resolvedTenantId) {
      query = query.eq('tenant_id', resolvedTenantId);
    }
    if (memberId) {
      query = query.eq('id', memberId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data ?? []) as MemberRow[];
  }

  async fetchHouseholdRelationships(
    memberId: string,
    tenantId: string | null
  ): Promise<HouseholdRelationshipRow[]> {
    const supabase = await this.getSupabaseClient();
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    let query = supabase
      .from('family_relationships')
      .select(
        `
          member_id,
          related_member_id,
          member:member_id(first_name,last_name,preferred_name),
          related_member:related_member_id(first_name,last_name,preferred_name)
        `
      )
      .or(`member_id.eq.${memberId},related_member_id.eq.${memberId}`);

    if (resolvedTenantId) {
      query = query.eq('tenant_id', resolvedTenantId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data ?? []) as HouseholdRelationshipRow[];
  }

  async fetchGivingProfile(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberGivingProfileRow | null> {
    const supabase = await this.getSupabaseClient();
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const currentYear = new Date().getFullYear();

    let query = supabase
      .from('member_giving_profiles')
      .select(
        `
          recurring_amount,
          recurring_frequency,
          recurring_method,
          recurring_status,
          pledge_amount,
          pledge_campaign,
          pledge_start_date,
          pledge_end_date,
          ytd_amount,
          ytd_year,
          last_gift_amount,
          last_gift_at,
          last_gift_fund,
          last_gift_source
        `
      )
      .eq('member_id', memberId)
      .eq('ytd_year', currentYear)
      .limit(1);

    if (resolvedTenantId) {
      query = query.eq('tenant_id', resolvedTenantId);
    }

    const { data, error } = await query.maybeSingle();
    if (error && (error as { code?: string }).code !== 'PGRST116') {
      throw error;
    }
    if (data) {
      return data as MemberGivingProfileRow;
    }

    let fallback = supabase
      .from('member_giving_profiles')
      .select(
        `
          recurring_amount,
          recurring_frequency,
          recurring_method,
          recurring_status,
          pledge_amount,
          pledge_campaign,
          pledge_start_date,
          pledge_end_date,
          ytd_amount,
          ytd_year,
          last_gift_amount,
          last_gift_at,
          last_gift_fund,
          last_gift_source
        `
      )
      .eq('member_id', memberId)
      .order('ytd_year', { ascending: false })
      .limit(1);

    if (resolvedTenantId) {
      fallback = fallback.eq('tenant_id', resolvedTenantId);
    }

    const { data: fallbackData, error: fallbackError } = await fallback.maybeSingle();
    if (fallbackError && (fallbackError as { code?: string }).code !== 'PGRST116') {
      throw fallbackError;
    }

    return (fallbackData as MemberGivingProfileRow | null) ?? null;
  }

  async fetchCarePlan(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberCarePlanRow | null> {
    const supabase = await this.getSupabaseClient();
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    let query = supabase
      .from('member_care_plans')
      .select('status_code, status_label, assigned_to, follow_up_at, details, priority')
      .eq('member_id', memberId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('follow_up_at', { ascending: true })
      .limit(1);

    if (resolvedTenantId) {
      query = query.eq('tenant_id', resolvedTenantId);
    }

    const { data, error } = await query.maybeSingle();
    if (error && (error as { code?: string }).code !== 'PGRST116') {
      throw error;
    }

    return (data as MemberCarePlanRow | null) ?? null;
  }

  async fetchTimelineEvents(
    memberId: string,
    tenantId: string | null,
    limit: number
  ): Promise<MemberTimelineEventRow[]> {
    const supabase = await this.getSupabaseClient();
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    let query = supabase
      .from('member_timeline_events')
      .select('id, title, description, event_category, status, icon, occurred_at')
      .eq('member_id', memberId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (resolvedTenantId) {
      query = query.eq('tenant_id', resolvedTenantId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data ?? []) as MemberTimelineEventRow[];
  }

  async fetchMilestones(
    memberId: string,
    tenantId: string | null
  ): Promise<MemberMilestoneRow[]> {
    const supabase = await this.getSupabaseClient();
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    let query = supabase
      .from('member_discipleship_milestones')
      .select('name, milestone_date')
      .eq('member_id', memberId)
      .is('deleted_at', null)
      .order('milestone_date', { ascending: true })
      .limit(20);

    if (resolvedTenantId) {
      query = query.eq('tenant_id', resolvedTenantId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data ?? []) as MemberMilestoneRow[];
  }
}
