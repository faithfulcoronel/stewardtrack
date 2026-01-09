import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { RequestContext } from '@/lib/server/context';
import { tenantUtils } from '@/utils/tenantUtils';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import type { MemberHousehold } from '@/models/memberHousehold.model';

export interface MemberRow {
  id: string;
  tenant_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  email?: string | null;
  contact_number?: string | null;
  address?: unknown;
  // New split address columns
  address_street?: string | null;
  address_street2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  household_id?: string | null;
  membership_date?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  profile_picture_url?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  envelope_number?: string | null;
  membership_stage?: { id?: string | null; name?: string | null; code?: string | null } | null;
  membership_type?: { id?: string | null; name?: string | null; code?: string | null } | null;
  membership_center?: { id?: string | null; name?: string | null; code?: string | null } | null;
  preferred_contact_method?: string | null;
  occupation?: string | null;
  serving_team?: string | null;
  serving_role?: string | null;
  serving_schedule?: string | null;
  serving_coach?: string | null;
  next_serve_at?: string | null;
  discipleship_next_step?: string | null;
  discipleship_mentor?: string | null;
  discipleship_group?: string | null;
  primary_small_group?: string | null;
  small_groups?: string[] | null;
  tags?: string[] | null;
  discipleship_pathways?: string[] | null;
  attendance_rate?: number | null;
  last_attendance_date?: string | null;
  spiritual_gifts?: string[] | null;
  ministry_interests?: string[] | null;
  volunteer_roles?: string[] | null;
  prayer_focus?: string | null;
  prayer_requests?: string[] | null;
  giving_recurring_amount?: number | null;
  giving_recurring_frequency?: string | null;
  giving_recurring_method?: string | null;
  giving_pledge_amount?: number | null;
  giving_pledge_campaign?: string | null;
  giving_last_gift_amount?: number | null;
  giving_last_gift_at?: string | null;
  giving_last_gift_fund?: string | null;
  giving_primary_fund?: string | null;
  giving_tier?: string | null;
  finance_notes?: string | null;
  pastoral_notes?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  physician_name?: string | null;
  leadership_roles?: string[] | null;
  team_focus?: string | null;
  reports_to?: string | null;
  last_huddle_at?: string | null;
  data_steward?: string | null;
  last_review_at?: string | null;
  household?: MemberHousehold | null;
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

/**
 * Member Profile Adapter with built-in encryption for PII fields
 *
 * Encrypted Fields (12 total):
 * - first_name, last_name, middle_name (if present)
 * - email, contact_number, address
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * - physician_name, pastoral_notes
 * - prayer_requests (array)
 */
@injectable()
export class MemberProfileAdapter implements IMemberProfileAdapter {
  private supabase: SupabaseClient | null = null;
  private context: RequestContext = {} as RequestContext;

  constructor(
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {}

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

  /**
   * Fetch primary families for a list of member IDs
   * Returns a Map of member_id -> family data
   */
  private async fetchPrimaryFamiliesForMembers(
    memberIds: string[],
    tenantId: string
  ): Promise<Map<string, { id: string; name: string; address_street?: string | null; address_city?: string | null; address_state?: string | null; address_postal_code?: string | null; notes?: string | null }>> {
    if (memberIds.length === 0) {
      return new Map();
    }

    const supabase = await this.getSupabaseClient();

    // Query family_members with family join for all members
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        member_id,
        family:families!family_members_family_id_fkey(
          id,
          name,
          address_street,
          address_city,
          address_state,
          address_postal_code,
          notes
        )
      `)
      .in('member_id', memberIds)
      .eq('tenant_id', tenantId)
      .eq('is_primary', true)
      .eq('is_active', true);

    if (error) {
      console.warn('[MemberProfileAdapter] Failed to fetch primary families:', error);
      return new Map();
    }

    // Build map of member_id -> family
    const familyMap = new Map<string, { id: string; name: string; address_street?: string | null; address_city?: string | null; address_state?: string | null; address_postal_code?: string | null; notes?: string | null }>();

    for (const row of data ?? []) {
      const family = Array.isArray(row.family) ? row.family[0] : row.family;
      if (family && row.member_id) {
        familyMap.set(row.member_id, family);
      }
    }

    return familyMap;
  }

  /**
   * Get PII field configuration for members table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig('members');
  }

  /**
   * Decrypt a single member record
   */
  private async decryptMember(member: MemberRow, tenantId: string): Promise<MemberRow> {
    try {
      console.log('[MemberProfileAdapter] decryptMember called for member:', {
        memberId: member.id,
        tenantId,
        hasFirstName: !!member.first_name,
        firstNameSample: member.first_name?.substring(0, 20),
        hasEncryptedFields: !!(member as any).encrypted_fields,
        encryptedFields: (member as any).encrypted_fields
      });

      // Check if record has encrypted fields marker
      const encrypted_fields = (member as any).encrypted_fields;

      // Check if first_name looks encrypted (format: version.iv.tag.ciphertext)
      const firstName = member.first_name;
      const looksEncrypted = firstName && typeof firstName === 'string' &&
                            firstName.match(/^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

      console.log('[MemberProfileAdapter] Encryption detection:', {
        hasMarker: !!(encrypted_fields && encrypted_fields.length > 0),
        looksEncrypted,
        firstNameFormat: firstName?.substring(0, 30)
      });

      if (!looksEncrypted && (!encrypted_fields || encrypted_fields.length === 0)) {
        // Plaintext record
        console.log('[MemberProfileAdapter] Plaintext record - returning as-is');
        return member;
      }

      // Data is encrypted (either has marker OR looks encrypted)
      console.log('[MemberProfileAdapter] Attempting decryption for all PII fields');

      // Decrypt PII fields
      const decrypted = await this.encryptionService.decryptFields(
        member,
        tenantId,
        this.getPIIFields()
      );

      console.log('[MemberProfileAdapter] Decryption complete:', {
        memberId: member.id,
        decryptedFirstName: decrypted.first_name?.substring(0, 20),
        decryptedLastName: decrypted.last_name?.substring(0, 20)
      });

      return decrypted;
    } catch (error) {
      console.error('[MemberProfileAdapter] Decryption failed:', error);
      // Return original record rather than failing
      return member;
    }
  }

  async fetchMembers({ memberId = null, limit, tenantId }: MemberProfileQueryOptions): Promise<MemberRow[]> {
    console.log('[MemberProfileAdapter] fetchMembers called with params:', { memberId, limit, tenantId });

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
          address_street,
          address_street2,
          address_city,
          address_state,
          address_postal_code,
          address_country,
          envelope_number,
          household_id,
          membership_date,
          birthday,
          anniversary,
          gender,
          marital_status,
          occupation,
          profile_picture_url,
          membership_stage:membership_status_id(id, name, code),
          membership_type:membership_type_id(id, name, code),
          membership_center:membership_center_id(id, name, code),
          preferred_contact_method,
          primary_small_group,
          serving_team,
          serving_role,
          serving_schedule,
          serving_coach,
          next_serve_at,
          discipleship_next_step,
          discipleship_mentor,
          discipleship_group,
          small_groups,
          discipleship_pathways,
          attendance_rate,
          last_attendance_date,
          spiritual_gifts,
          ministry_interests,
          volunteer_roles,
          tags,
          prayer_focus,
          prayer_requests,
          giving_recurring_amount,
          giving_recurring_frequency,
          giving_recurring_method,
          giving_pledge_amount,
          giving_pledge_campaign,
          giving_last_gift_amount,
          giving_last_gift_at,
          giving_last_gift_fund,
          giving_primary_fund,
          giving_tier,
          finance_notes,
          pastoral_notes,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          physician_name,
          leadership_roles,
          team_focus,
          reports_to,
          last_huddle_at,
          data_steward,
          last_review_at,
          encrypted_fields,
          encryption_key_version
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

    // Transform to MemberRow array
    const members = (data ?? []).map((row: any) => ({
      ...row,
      household: null, // Will be populated from family_members below
    })) as MemberRow[];

    console.log('[MemberProfileAdapter] Fetched members from DB:', {
      count: members.length,
      firstMemberSample: members[0] ? {
        id: members[0].id,
        firstNameSample: members[0].first_name?.substring(0, 20),
        hasEncryptedFields: !!(members[0] as any).encrypted_fields
      } : null
    });

    // Get tenant context - try resolvedTenantId first, then fall back to record's tenant_id
    let effectiveTenantId = resolvedTenantId;
    if (!effectiveTenantId && members.length > 0) {
      effectiveTenantId = (members[0] as any).tenant_id;
      console.log('[MemberProfileAdapter] Using tenant_id from record:', effectiveTenantId);
    }

    if (!effectiveTenantId || members.length === 0) {
      console.log('[MemberProfileAdapter] No tenantId or no members - returning as-is');
      return members;
    }

    // Fetch primary family for each member from family_members + families tables
    const memberIds = members.map(m => m.id);
    const familyData = await this.fetchPrimaryFamiliesForMembers(memberIds, effectiveTenantId);

    // Attach family data to members
    for (const member of members) {
      const family = familyData.get(member.id);
      if (family) {
        member.household = {
          id: family.id,
          tenant_id: effectiveTenantId,
          name: family.name,
          address_street: family.address_street,
          address_city: family.address_city,
          address_state: family.address_state,
          address_postal_code: family.address_postal_code,
          notes: family.notes,
        } as MemberHousehold;
      }
    }

    console.log('[MemberProfileAdapter] Starting decryption for', members.length, 'members');

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: MemberRow) => this.decryptMember(member, effectiveTenantId!))
    );

    console.log('[MemberProfileAdapter] Successfully decrypted', decrypted.length, 'member records');

    return decrypted;
  }

  /**
   * Fetches household relationships for a member.
   * Now uses the new family_members table instead of family_relationships.
   * Returns family members in the same format as the old household relationships.
   * Decrypts PII fields (first_name, last_name, preferred_name) for related members.
   */
  async fetchHouseholdRelationships(
    memberId: string,
    tenantId: string | null
  ): Promise<HouseholdRelationshipRow[]> {
    const supabase = await this.getSupabaseClient();
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    // First, get the member's primary family
    let familyQuery = supabase
      .from('family_members')
      .select('family_id')
      .eq('member_id', memberId)
      .eq('is_primary', true)
      .eq('is_active', true)
      .limit(1);

    if (resolvedTenantId) {
      familyQuery = familyQuery.eq('tenant_id', resolvedTenantId);
    }

    const { data: familyData, error: familyError } = await familyQuery;

    if (familyError) {
      console.warn('[MemberProfileAdapter] Failed to fetch primary family:', familyError);
      return [];
    }

    const primaryFamilyId = familyData?.[0]?.family_id;
    if (!primaryFamilyId) {
      // No primary family, return empty array
      return [];
    }

    // Get all members of the primary family (include encrypted_fields for decryption)
    let membersQuery = supabase
      .from('family_members')
      .select(
        `
          member_id,
          member:members!family_members_member_id_fkey(first_name,last_name,preferred_name,encrypted_fields)
        `
      )
      .eq('family_id', primaryFamilyId)
      .eq('is_active', true)
      .neq('member_id', memberId); // Exclude the current member

    if (resolvedTenantId) {
      membersQuery = membersQuery.eq('tenant_id', resolvedTenantId);
    }

    const { data: membersData, error: membersError } = await membersQuery;

    if (membersError) {
      console.warn('[MemberProfileAdapter] Failed to fetch family members:', membersError);
      return [];
    }

    // Transform and decrypt family_members data
    const results: HouseholdRelationshipRow[] = [];

    for (const fm of membersData ?? []) {
      let relatedMember = fm.member as { first_name?: string | null; last_name?: string | null; preferred_name?: string | null; encrypted_fields?: string[] } | null;

      // Decrypt PII fields if needed
      if (relatedMember && resolvedTenantId) {
        const encryptedFields = relatedMember.encrypted_fields;
        const firstName = relatedMember.first_name;
        const looksEncrypted = firstName && typeof firstName === 'string' &&
                              firstName.match(/^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

        if (looksEncrypted || (encryptedFields && encryptedFields.length > 0)) {
          try {
            const decrypted = await this.encryptionService.decryptFields(
              relatedMember,
              resolvedTenantId,
              this.getPIIFields()
            );
            relatedMember = {
              first_name: decrypted.first_name as string | null,
              last_name: decrypted.last_name as string | null,
              preferred_name: decrypted.preferred_name as string | null,
            };
          } catch (error) {
            console.error('[MemberProfileAdapter] Failed to decrypt family member:', error);
            // Keep original values if decryption fails
          }
        }
      }

      results.push({
        member_id: memberId,
        related_member_id: fm.member_id,
        member: null, // The current member - not needed since we already know who they are
        related_member: relatedMember ? {
          first_name: relatedMember.first_name,
          last_name: relatedMember.last_name,
          preferred_name: relatedMember.preferred_name,
        } : null,
      });
    }

    return results;
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
