import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Member } from '@/models/member.model';
import { MemberHousehold } from '@/models/memberHousehold.model';
import type { AuditService } from '@/services/AuditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import { FieldValidationError } from '@/utils/errorHandler';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

export interface IMemberAdapter extends IBaseAdapter<Member> {
  getCurrentMonthBirthdays(): Promise<Member[]>;
  getBirthdaysByMonth(month: number): Promise<Member[]>;
  getCurrentUserMember(): Promise<Member | null>;
  fetchByAccount(accountId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }>;
  fetchByScheduleRegistration(scheduleId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }>;
  fetchByMinistry(ministryId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }>;
  searchMembers(searchTerm: string, limit?: number): Promise<{ data: Member[]; count: number | null }>;
}

/**
 * Member Adapter with built-in encryption for PII fields
 *
 * Encrypted Fields (12 total):
 * - first_name, last_name, middle_name
 * - email, contact_number, address
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * - physician_name, pastoral_notes
 * - prayer_requests (array)
 *
 * NOT Encrypted (remain as plain database values):
 * - birthday, anniversary (DATE fields - cannot be encrypted)
 */
@injectable()
export class MemberAdapter
  extends BaseAdapter<Member>
  implements IMemberAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super();
  }

  /**
   * Get PII field configuration for members table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig('members');
  }

  /**
   * Get tenant ID with proper fallback resolution.
   * Uses ensureTenantContext for consistent behavior across all adapter methods.
   * Returns null only if no tenant context can be resolved (for non-throwing cases).
   */
  private async getTenantId(): Promise<string | null> {
    try {
      return await this.ensureTenantContext();
    } catch {
      // For non-critical paths (like decryption), return null if no tenant
      // This allows gradual migration and legacy unencrypted data handling
      console.warn('[MemberAdapter] Could not resolve tenant context, will skip decryption');
      return null;
    }
  }
  protected tableName = 'members';

  protected defaultSelect = `
    id,
    first_name,
    last_name,
    middle_name,
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
    membership_date,
    household_id,
    anniversary,
    birthday,
    profile_picture_url,
    gender,
    marital_status,
    occupation,
    baptism_date,
    date_trusted_christ,
    baptized_by_immersion,
    baptism_place,
    baptism_church,
    baptized_by,
    testimony,
    denomination_id,
    previous_denomination,
    is_visitor,
    visitor_invited_by_member_id,
    visitor_invited_by_name,
    visitor_first_visit_date,
    visitor_how_heard,
    visitor_interests,
    visitor_follow_up_status,
    visitor_follow_up_notes,
    visitor_converted_to_member_date,
    spiritual_gifts,
    ministry_interests,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    physician_name,
    leadership_position,
    small_groups,
    ministries,
    volunteer_roles,
    primary_small_group,
    discipleship_pathways,
    attendance_rate,
    last_attendance_date,
    pastoral_notes,
    prayer_requests,
    prayer_focus,
    preferred_contact_method,
    serving_team,
    serving_role,
    serving_schedule,
    serving_coach,
    next_serve_at,
    discipleship_next_step,
    discipleship_mentor,
    discipleship_group,
    team_focus,
    reports_to,
    leadership_roles,
    last_huddle_at,
    giving_recurring_amount,
    giving_recurring_frequency,
    giving_recurring_method,
    giving_pledge_amount,
    giving_pledge_campaign,
    giving_primary_fund,
    giving_last_gift_amount,
    giving_last_gift_at,
    giving_last_gift_fund,
    giving_tier,
    finance_notes,
    tags,
    data_steward,
    last_review_at,
    created_at,
    updated_at,
    membership_type_id,
    membership_status_id,
    membership_center_id,
    encrypted_fields,
    encryption_key_version,
    user_id,
    linked_at,
    linked_by
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'membership_type',
      foreignKey: 'membership_type_id',
      select: ['id', 'name', 'code']
    },
    {
      table: 'membership_stage',
      foreignKey: 'membership_status_id',
      select: ['id', 'name', 'code']
    },
    {
      table: 'membership_center',
      foreignKey: 'membership_center_id',
      select: ['id', 'name', 'code', 'is_primary']
    },
    {
      table: 'member_households',
      foreignKey: 'household_id',
      alias: 'household',
      select: [
        'id',
        'name',
        'address_street',
        'address_city',
        'address_state',
        'address_postal_code',
        'member_names',
        'notes'
      ]
    },
    {
      table: 'religious_denominations',
      foreignKey: 'denomination_id',
      alias: 'denomination',
      select: ['id', 'code', 'name', 'description']
    },
    {
      table: 'members',
      foreignKey: 'visitor_invited_by_member_id',
      alias: 'visitor_invited_by',
      select: ['id', 'first_name', 'last_name']
    }
  ];

  async getCurrentMonthBirthdays(): Promise<Member[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_current_month_birthdays');
    if (error) throw error;
    return (data || []) as Member[];
  }

  async getBirthdaysByMonth(month: number): Promise<Member[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_birthdays_for_month', {
      p_month: month,
    });
    if (error) throw error;
    return (data || []) as Member[];
  }

  async getCurrentUserMember(): Promise<Member | null> {
    const supabase = await this.getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const tenantId = await this.getTenantId();
    if (!tenantId) return null;

    // Query members table directly by user_id (user-member linking)
    // Use raw query to avoid RLS context issues in layout
    const { data: member, error } = await supabase
      .from('members')
      .select(this.defaultSelect)
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !member) return null;

    // Cast to any to work with Supabase types
    const memberData = member as any;

    // Manually decrypt the member data
    if (memberData.encrypted_fields && (memberData.encrypted_fields as any[]).length > 0) {
      const decrypted = await this.encryptionService.decryptFields(
        memberData as Member,
        tenantId,
        this.getPIIFields()
      );
      return decrypted;
    }

    return memberData as Member;
  }

  /**
   * Fetch members belonging to a specific account (family) through the account_members join table
   */
  async fetchByAccount(accountId: string, options: Omit<QueryOptions, 'filters'> = {}): Promise<{ data: Member[]; count: number | null }> {
    const supabase = await this.getSupabaseClient();
    const tenantId = await this.getTenantId();

    // First get member IDs from account_members join table
    const { data: accountMembers, error: joinError } = await supabase
      .from('account_members')
      .select('member_id')
      .eq('account_id', accountId)
      .eq('tenant_id', tenantId);

    if (joinError) {
      throw new Error(`Failed to fetch account members: ${joinError.message}`);
    }

    if (!accountMembers || accountMembers.length === 0) {
      return { data: [], count: 0 };
    }

    const memberIds = accountMembers.map((am: { member_id: string }) => am.member_id);

    // Fetch members with those IDs using the parent fetch (which handles decryption)
    return this.fetch({
      ...options,
      filters: {
        id: { operator: 'in', value: memberIds }
      }
    });
  }

  /**
   * Fetch members registered for a specific schedule (event) through the registrations join table
   */
  async fetchByScheduleRegistration(scheduleId: string, options: Omit<QueryOptions, 'filters'> = {}): Promise<{ data: Member[]; count: number | null }> {
    const supabase = await this.getSupabaseClient();
    const tenantId = await this.getTenantId();

    // First get member IDs from registrations join table
    const { data: registrations, error: joinError } = await supabase
      .from('registrations')
      .select('member_id')
      .eq('schedule_id', scheduleId)
      .eq('tenant_id', tenantId);

    if (joinError) {
      throw new Error(`Failed to fetch event registrations: ${joinError.message}`);
    }

    if (!registrations || registrations.length === 0) {
      return { data: [], count: 0 };
    }

    const memberIds = registrations
      .filter((r: { member_id: string | null }) => r.member_id)
      .map((r: { member_id: string }) => r.member_id);

    if (memberIds.length === 0) {
      return { data: [], count: 0 };
    }

    // Fetch members with those IDs using the parent fetch (which handles decryption)
    return this.fetch({
      ...options,
      filters: {
        id: { operator: 'in', value: memberIds }
      }
    });
  }

  /**
   * Fetch members belonging to a specific ministry through the ministry_members join table
   */
  async fetchByMinistry(ministryId: string, options: Omit<QueryOptions, 'filters'> = {}): Promise<{ data: Member[]; count: number | null }> {
    const supabase = await this.getSupabaseClient();

    // First get member IDs from ministry_members join table
    const { data: ministryMembers, error: joinError } = await supabase
      .from('ministry_members')
      .select('member_id')
      .eq('ministry_id', ministryId)
      .is('deleted_at', null);

    if (joinError) {
      throw new Error(`Failed to fetch ministry members: ${joinError.message}`);
    }

    if (!ministryMembers || ministryMembers.length === 0) {
      return { data: [], count: 0 };
    }

    const memberIds = ministryMembers.map((mm: { member_id: string }) => mm.member_id);

    // Fetch members with those IDs using the parent fetch (which handles decryption)
    return this.fetch({
      ...options,
      filters: {
        id: { operator: 'in', value: memberIds }
      }
    });
  }

  /**
   * Search members by name or email
   * Note: For encrypted fields, this performs in-memory search after decryption
   */
  async searchMembers(searchTerm: string, limit: number = 20): Promise<{ data: Member[]; count: number | null }> {
    if (!searchTerm.trim()) {
      return { data: [], count: 0 };
    }

    // Fetch all members (with decryption handled by the fetch method)
    // Then filter in-memory since encrypted fields can't be searched via SQL
    const result = await this.fetch({
      select: 'id, first_name, last_name, email, contact_number',
      order: { column: 'last_name', ascending: true },
    });

    const normalizedSearch = searchTerm.toLowerCase().trim();

    // Filter members in-memory after decryption
    const filteredMembers = result.data.filter((member) => {
      const firstName = (member.first_name ?? '').toLowerCase();
      const lastName = (member.last_name ?? '').toLowerCase();
      const email = (member.email ?? '').toLowerCase();

      return (
        firstName.includes(normalizedSearch) ||
        lastName.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        `${firstName} ${lastName}`.includes(normalizedSearch)
      );
    });

    // Apply limit
    const limitedMembers = filteredMembers.slice(0, limit);

    return { data: limitedMembers, count: filteredMembers.length };
  }

  private cleanOptionalString(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
  }

  private coerceNumber(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const normalized = String(value)
      .replace(/[^0-9.+-]/g, '')
      .trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private coerceStringArray(value: unknown): string[] | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const source = Array.isArray(value)
      ? value
      : String(value)
          .split(/[\n,]/)
          .map(entry => entry.trim());

    const cleaned = source
      .map(entry => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
      .filter(entry => entry.length > 0);

    return cleaned.length ? cleaned : [];
  }

  private coerceDate(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return null;
    }
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : normalized;
  }

  private normalizePreferredContact(value: unknown): Member['preferred_contact_method'] | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const normalized = String(value).trim().toLowerCase();
    switch (normalized) {
      case 'phone':
      case 'text':
      case 'mail':
        return normalized;
      case 'email':
      default:
        return 'email';
    }
  }

  private pruneUndefined<T extends Record<string, unknown>>(input: T): T {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined)
    ) as T;
  }

  private formatAddress(source: Partial<MemberHousehold> | null | undefined): string | null {
    if (!source) {
      return null;
    }
    const parts = [
      this.cleanOptionalString(source.address_street),
      this.cleanOptionalString(source.address_city),
      this.cleanOptionalString(source.address_state),
      this.cleanOptionalString(source.address_postal_code)
    ].filter((part): part is string => Boolean(part));

    if (!parts.length) {
      return null;
    }

    return parts
      .map((part, index) => {
        if (index === parts.length - 1 && /^(?:[A-Z0-9\-]{3,}|\d{3,})$/i.test(part)) {
          return part.toUpperCase();
        }
        return part;
      })
      .join(', ');
  }

  private async upsertHousehold(
    input: Partial<MemberHousehold>,
    tenantId: string | null,
    userId: string | undefined
  ): Promise<MemberHousehold | null> {
    if (!tenantId) {
      return null;
    }

    const name = this.cleanOptionalString(input.name);
    const street = this.cleanOptionalString(input.address_street);
    const city = this.cleanOptionalString(input.address_city);
    const state = this.cleanOptionalString(input.address_state);
    const postal = this.cleanOptionalString(input.address_postal_code);
    const memberNames = this.coerceStringArray(input.member_names);
    const notes = this.cleanOptionalString(input.notes);

    const hasMeaningfulInput = Boolean(
      input.id !== undefined ||
        name !== undefined ||
        street !== undefined ||
        city !== undefined ||
        state !== undefined ||
        postal !== undefined ||
        (memberNames !== undefined && memberNames !== null) ||
        notes !== undefined
    );

    if (!hasMeaningfulInput) {
      return null;
    }

    const supabase = await this.getSupabaseClient();
    const timestamp = new Date().toISOString();
    const basePayload: Record<string, unknown> = {
      tenant_id: tenantId,
      name,
      address_street: street,
      address_city: city,
      address_state: state,
      address_postal_code: postal,
      member_names: memberNames,
      notes,
      updated_at: timestamp,
      updated_by: userId ?? null
    };

    const payload = this.pruneUndefined(basePayload);

    const selectColumns = `
      id,
      name,
      address_street,
      address_city,
      address_state,
      address_postal_code,
      member_names,
      notes
    `;

    if (input.id) {
      const { data, error } = await supabase
        .from('member_households')
        .update(payload)
        .eq('id', input.id)
        .select(selectColumns)
        .single();

      if (error) {
        throw error;
      }
      return (data as MemberHousehold) ?? null;
    }

    const insertPayload = this.pruneUndefined({
      ...payload,
      created_at: timestamp,
      created_by: userId ?? null
    });

    const { data, error } = await supabase
      .from('member_households')
      .insert([insertPayload])
      .select(selectColumns)
      .single();

    if (error) {
      throw error;
    }
    return (data as MemberHousehold) ?? null;
  }

  private async prepareMemberPayload(data: Partial<Member>, existingMemberId?: string): Promise<Partial<Member>> {
    const payload: Record<string, unknown> = { ...data };
    const tenantId = await this.getTenantId();
    const userId = await this.getUserId();

    // Family handling is done in MemberService layer - just remove from payload
    delete payload.family;

    // Legacy household handling - still supported for backwards compatibility
    const householdInput = payload.household as Partial<MemberHousehold> | undefined;
    delete payload.household;

    let householdRecord: MemberHousehold | null = null;
    if (householdInput !== undefined) {
      if (householdInput && householdInput.id === null) {
        payload.household_id = null;
        if (!Object.prototype.hasOwnProperty.call(data, 'envelope_number')) {
          payload.envelope_number = null;
        }
      } else {
        // If editing a member and no household ID is provided, check if member already has a household
        // to avoid creating duplicate households
        let householdInputWithId = householdInput ?? {};
        if (existingMemberId && !householdInputWithId.id) {
          const supabase = await this.getSupabaseClient();
          const { data: existingMember } = await supabase
            .from('members')
            .select('household_id')
            .eq('id', existingMemberId)
            .single();

          if (existingMember?.household_id) {
            // Use the existing household ID to update instead of creating new
            householdInputWithId = { ...householdInputWithId, id: existingMember.household_id };
          }
        }

        householdRecord = await this.upsertHousehold(householdInputWithId, tenantId ?? null, userId);
        if (householdRecord) {
          payload.household_id = householdRecord.id;
        }
      }
    }

    if (payload.first_name !== undefined) {
      payload.first_name = this.cleanOptionalString(payload.first_name) ?? '';
    }
    if (payload.last_name !== undefined) {
      payload.last_name = this.cleanOptionalString(payload.last_name) ?? '';
    }
    if (payload.middle_name !== undefined) {
      payload.middle_name = this.cleanOptionalString(payload.middle_name);
    }
    if (payload.preferred_name !== undefined) {
      payload.preferred_name = this.cleanOptionalString(payload.preferred_name);
    }

    if (payload.email !== undefined) {
      const email = this.cleanOptionalString(payload.email);
      payload.email = email ? email.toLowerCase() : email;
    }

    if (payload.contact_number !== undefined) {
      payload.contact_number = this.cleanOptionalString(payload.contact_number) ?? null;
    }

    const stringFields: Array<keyof Member> = [
      'envelope_number',
      'occupation',
      'emergency_contact_name',
      'emergency_contact_phone',
      'emergency_contact_relationship',
      'physician_name',
      'leadership_position',
      'primary_small_group',
      'pastoral_notes',
      'prayer_focus',
      'serving_team',
      'serving_role',
      'serving_schedule',
      'serving_coach',
      'discipleship_next_step',
      'discipleship_mentor',
      'discipleship_group',
      'team_focus',
      'reports_to',
      'giving_recurring_frequency',
      'giving_recurring_method',
      'giving_pledge_campaign',
      'giving_primary_fund',
      'giving_last_gift_fund',
      'giving_tier',
      'finance_notes',
      'data_steward',
      // Spiritual journey fields
      'baptism_place',
      'baptism_church',
      'baptized_by',
      'testimony',
      'previous_denomination',
      // Visitor information fields
      'visitor_invited_by_name',
      'visitor_how_heard',
      'visitor_follow_up_status',
      'visitor_follow_up_notes'
    ];

    for (const field of stringFields) {
      if (payload[field] !== undefined) {
        payload[field] = this.cleanOptionalString(payload[field]) ?? null;
      }
    }

    const arrayFields: Array<keyof Member> = [
      'spiritual_gifts',
      'ministry_interests',
      'small_groups',
      'ministries',
      'volunteer_roles',
      'discipleship_pathways',
      'leadership_roles',
      'prayer_requests',
      'tags',
      'visitor_interests'
    ];

    for (const field of arrayFields) {
      if (payload[field] !== undefined) {
        payload[field] = this.coerceStringArray(payload[field]);
      }
    }

    if (payload.attendance_rate !== undefined) {
      const value = this.coerceNumber(payload.attendance_rate);
      payload.attendance_rate = value === undefined || value === null ? value : Math.min(Math.max(value, 0), 100);
    }

    const numericFields: Array<keyof Member> = [
      'giving_recurring_amount',
      'giving_pledge_amount',
      'giving_last_gift_amount'
    ];

    for (const field of numericFields) {
      if (payload[field] !== undefined) {
        payload[field] = this.coerceNumber(payload[field]);
      }
    }

    const dateFields: Array<keyof Member> = [
      'membership_date',
      'birthday',
      'baptism_date',
      'last_attendance_date',
      'giving_last_gift_at',
      'anniversary',
      'next_serve_at',
      'last_huddle_at',
      'last_review_at',
      // Spiritual journey date fields
      'date_trusted_christ',
      // Visitor date fields
      'visitor_first_visit_date',
      'visitor_converted_to_member_date'
    ];

    for (const field of dateFields) {
      if (payload[field] !== undefined) {
        payload[field] = this.coerceDate(payload[field]);
      }
    }

    if (payload.preferred_contact_method !== undefined) {
      payload.preferred_contact_method = this.normalizePreferredContact(
        payload.preferred_contact_method
      );
    }

    if (payload.gender !== undefined) {
      const gender = this.cleanOptionalString(payload.gender);
      payload.gender = gender ? (gender.toLowerCase() as Member['gender']) : null;
    }

    if (payload.marital_status !== undefined) {
      const status = this.cleanOptionalString(payload.marital_status);
      payload.marital_status = status ? (status.toLowerCase() as Member['marital_status']) : null;
    }

    // Handle boolean fields
    if (payload.baptized_by_immersion !== undefined) {
      if (payload.baptized_by_immersion === null) {
        payload.baptized_by_immersion = null;
      } else if (typeof payload.baptized_by_immersion === 'string') {
        const val = (payload.baptized_by_immersion as string).toLowerCase().trim();
        payload.baptized_by_immersion = val === 'true' || val === 'yes' || val === '1' ? true : val === 'false' || val === 'no' || val === '0' ? false : null;
      } else {
        payload.baptized_by_immersion = Boolean(payload.baptized_by_immersion);
      }
    }

    if (payload.is_visitor !== undefined) {
      if (payload.is_visitor === null) {
        payload.is_visitor = null;
      } else if (typeof payload.is_visitor === 'string') {
        const val = (payload.is_visitor as string).toLowerCase().trim();
        payload.is_visitor = val === 'true' || val === 'yes' || val === '1' ? true : val === 'false' || val === 'no' || val === '0' ? false : null;
      } else {
        payload.is_visitor = Boolean(payload.is_visitor);
      }
    }

    const addressSource = householdRecord ?? householdInput ?? null;
    if (addressSource) {
      const addressText = this.formatAddress(addressSource);
      if (addressText) {
        payload.address = addressText;
      }
    }

    if (payload.address !== undefined) {
      payload.address = this.cleanOptionalString(payload.address) ?? '';
    }

    return payload as Partial<Member>;
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    // Check for family relationships
    const { data: familyRelationships, error: relationshipsError } = await supabase
      .from('family_relationships')
      .select('id')
      .or(`member_id.eq.${id},related_member_id.eq.${id}`)
      .limit(1);

    if (relationshipsError) throw relationshipsError;
    if (familyRelationships?.length) {
      throw new Error('Cannot delete member with existing family relationships');
    }

    // Check for financial transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('member_id', id)
      .limit(1);

    if (transactionsError) throw transactionsError;
    if (transactions?.length) {
      throw new Error('Cannot delete member with existing financial transactions');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('delete', 'member', id, { id });
  }

  protected override async onBeforeCreate(data: Partial<Member>): Promise<Partial<Member>> {
    const prepared = await this.prepareMemberPayload(data);

    if (prepared.address === undefined) {
      prepared.address = '';
    }

    if (prepared.email) {
      const { data: existingMember } = await this.fetch({
        filters: {
          email: {
            operator: 'eq',
            value: prepared.email
          }
        }
      });

      if (existingMember?.length) {
        throw new FieldValidationError('email', 'A member with this email already exists');
      }
    }

    // Encrypt PII fields before creating record
    // Resolve tenant context: explicit context > data.tenant_id > tenantUtils fallback
    let tenantId = this.context?.tenantId || prepared.tenant_id;
    if (!tenantId) {
      // Last resort: try resolving from authenticated user's tenant
      tenantId = await tenantUtils.getTenantId();
    }
    if (!tenantId) {
      throw new Error('[MemberAdapter] Tenant context required for encryption');
    }

    try {
      const encrypted = await this.encryptionService.encryptFields(
        prepared,
        tenantId,
        this.getPIIFields()
      );

      // Track which fields are encrypted
      encrypted.encrypted_fields = this.getPIIFields().map(f => f.fieldName);
      encrypted.encryption_key_version = 1; // Will be updated by key manager

      console.log(
        `[MemberAdapter] Encrypted ${encrypted.encrypted_fields.length} PII fields for new member`
      );

      return encrypted;
    } catch (error) {
      console.error('[MemberAdapter] Encryption failed during create:', error);
      throw new Error(
        `Failed to encrypt member data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  protected override async onAfterCreate(data: Member): Promise<void> {
    // Decrypt member data before logging to audit (so audit logs show readable values)
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      // If no tenant context, log encrypted data as fallback
      await this.auditService.logAuditEvent('create', 'member', data.id, data);
      return;
    }

    try {
      // Check if data has encrypted fields
      if (!data.encrypted_fields || (data.encrypted_fields as any[]).length === 0) {
        // No encryption, log as-is
        await this.auditService.logAuditEvent('create', 'member', data.id, data);
        return;
      }

      // Decrypt for audit logging
      const decrypted = await this.encryptionService.decryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      // Log audit event with decrypted data
      await this.auditService.logAuditEvent('create', 'member', data.id, decrypted);
    } catch (error) {
      console.error('[MemberAdapter] Failed to decrypt for audit logging:', error);
      // Log encrypted data as fallback
      await this.auditService.logAuditEvent('create', 'member', data.id, data);
    }
  }

  protected override async onBeforeUpdate(id: string, data: Partial<Member>): Promise<Partial<Member>> {
    const prepared = await this.prepareMemberPayload(data, id);

    if (prepared.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prepared.email)) {
        throw new FieldValidationError('email', 'Invalid email format');
      }

      const { data: existingMember } = await this.fetch({
        filters: {
          email: {
            operator: 'eq',
            value: prepared.email
          },
          id: {
            operator: 'neq',
            value: id
          }
        }
      });

      if (existingMember?.length) {
        throw new FieldValidationError('email', 'A member with this email already exists');
      }
    }

    // Encrypt PII fields before updating record
    // Resolve tenant context: explicit context > data.tenant_id > tenantUtils fallback
    let tenantId = this.context?.tenantId || prepared.tenant_id;
    if (!tenantId) {
      // Last resort: try resolving from authenticated user's tenant
      tenantId = await tenantUtils.getTenantId();
    }
    if (!tenantId) {
      throw new Error('[MemberAdapter] Tenant context required for encryption');
    }

    try {
      // Only encrypt fields that are actually being updated
      const fieldsToEncrypt = this.getPIIFields().filter(
        field => prepared[field.fieldName as keyof Member] !== undefined
      );

      if (fieldsToEncrypt.length === 0) {
        // No PII fields being updated
        return prepared;
      }

      // Encrypt the PII fields
      const encrypted = await this.encryptionService.encryptFields(
        prepared,
        tenantId,
        fieldsToEncrypt
      );

      // Update encrypted_fields marker to include ALL encrypted field names
      const allPIIFieldNames = this.getPIIFields().map(f => f.fieldName);
      encrypted.encrypted_fields = allPIIFieldNames;
      encrypted.encryption_key_version = 1; // Will be updated by key manager

      console.log(
        `[MemberAdapter] Encrypted ${fieldsToEncrypt.length} PII fields for member ${id}`
      );

      return encrypted;
    } catch (error) {
      console.error('[MemberAdapter] Encryption failed during update:', error);
      throw new Error(
        `Failed to encrypt member data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  protected override async onAfterUpdate(data: Member): Promise<void> {
    // Decrypt member data before logging to audit (so audit logs show readable values)
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      // If no tenant context, log encrypted data as fallback
      await this.auditService.logAuditEvent('update', 'member', data.id, data);
      return;
    }

    try {
      // Check if data has encrypted fields
      if (!data.encrypted_fields || (data.encrypted_fields as any[]).length === 0) {
        // No encryption, log as-is
        await this.auditService.logAuditEvent('update', 'member', data.id, data);
        return;
      }

      // Decrypt for audit logging
      const decrypted = await this.encryptionService.decryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      // Log audit event with decrypted data
      await this.auditService.logAuditEvent('update', 'member', data.id, decrypted);
    } catch (error) {
      console.error('[MemberAdapter] Failed to decrypt for audit logging:', error);
      // Log encrypted data as fallback
      await this.auditService.logAuditEvent('update', 'member', data.id, data);
    }
  }

  /**
   * Decrypt PII fields after fetching members
   *
   * CRITICAL: Tenant context is resolved ONCE at the start to ensure consistency
   * between query filtering and decryption. This prevents timing issues where
   * async context resolution might return different values between calls.
   */
  public override async fetch(
    options: QueryOptions = {}
  ): Promise<{ data: Member[]; count: number | null }> {
    // CRITICAL: Resolve tenant context ONCE at the very start, BEFORE any async operations
    // This ensures the same tenant ID is used for both the query and decryption
    let tenantId: string | null = null;
    try {
      // Try to get tenant from explicit context first, then fallback to session resolution
      tenantId = this.context?.tenantId || await this.ensureTenantContext();
      console.log(`[MemberAdapter.fetch] Pre-resolved tenantId: ${tenantId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[MemberAdapter.fetch] Could not resolve tenant context: ${errorMsg}`);
      // Continue without tenant - super.fetch() may still work via RLS
    }

    // Fetch encrypted records from parent
    const result = await super.fetch(options);
    console.log(`[MemberAdapter.fetch] Records fetched: ${result.data.length}`);

    // Check if we can proceed with decryption
    if (!tenantId) {
      console.warn('[MemberAdapter.fetch] No tenant context - returning encrypted data');
      return result;
    }

    if (!result.data.length) {
      console.log('[MemberAdapter.fetch] No records to decrypt');
      return result;
    }

    try {
      // Log sample of raw data from database before decryption
      const firstRecord = result.data[0];
      console.log(`[MemberAdapter.fetch] Sample record BEFORE decryption:`, {
        id: firstRecord.id,
        first_name: firstRecord.first_name?.substring(0, 20),
        first_name_looks_encrypted: this.looksEncrypted(firstRecord.first_name),
        encrypted_fields: firstRecord.encrypted_fields,
        encryption_key_version: firstRecord.encryption_key_version
      });

      // Decrypt all records in parallel using the pre-resolved tenant ID
      const decrypted = await Promise.all(
        result.data.map(async (record, index) => {
          // Check if record has encrypted fields marker
          const hasEncryptedFieldsMarker = record.encrypted_fields && (record.encrypted_fields as any[]).length > 0;

          // Also check if data actually looks encrypted (starts with version.iv pattern)
          const dataLooksEncrypted = this.looksEncrypted(record.first_name) ||
                                     this.looksEncrypted(record.last_name) ||
                                     this.looksEncrypted(record.email);

          if (!hasEncryptedFieldsMarker && !dataLooksEncrypted) {
            // Legacy plaintext record - no decryption needed
            if (index === 0) {
              console.log(`[MemberAdapter.fetch] Record ${index} is plaintext (no encrypted_fields marker, data not encrypted)`);
            }
            return record;
          }

          // Decrypt the record
          if (index === 0) {
            console.log(`[MemberAdapter.fetch] Decrypting record ${index} (marker: ${hasEncryptedFieldsMarker}, looks_encrypted: ${dataLooksEncrypted})`);
          }

          const decryptedRecord = await this.encryptionService.decryptFields(
            record,
            tenantId!, // We know tenantId is not null at this point
            this.getPIIFields()
          );

          if (index === 0) {
            console.log(`[MemberAdapter.fetch] Record ${index} AFTER decryption:`, {
              id: decryptedRecord.id,
              first_name: decryptedRecord.first_name?.substring(0, 30),
              first_name_looks_encrypted: this.looksEncrypted(decryptedRecord.first_name)
            });
          }

          return decryptedRecord;
        })
      );

      console.log(`[MemberAdapter.fetch] Successfully decrypted ${decrypted.length} member records`);

      return { data: decrypted, count: result.count };
    } catch (error) {
      // Log detailed error information for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MemberAdapter.fetch] Decryption failed:', {
        error: errorMessage,
        tenantId,
        recordCount: result.data.length,
        possibleCause: errorMessage.includes('key not found')
          ? 'Tenant encryption key may not exist - run: pnpm --filter @stewardtrack/web generate-tenant-keys'
          : errorMessage.includes('ENCRYPTION_MASTER_KEY')
          ? 'ENCRYPTION_MASTER_KEY environment variable not configured'
          : 'Check encryption service logs for details'
      });

      // Return encrypted data as fallback - frontend should detect and handle
      console.warn('[MemberAdapter.fetch] Returning encrypted data as fallback');
      return result;
    }
  }

  /**
   * Check if a value looks like encrypted data (version.iv.ciphertext.tag format)
   */
  private looksEncrypted(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    // Encrypted format: "1.base64iv.base64ciphertext.base64tag" or similar
    // Check for pattern: number.base64.base64... (at least 3 dots and base64-like chars)
    return /^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/.test(value);
  }

  /**
   * Decrypt PII fields after fetching single member
   *
   * CRITICAL: Tenant context is resolved ONCE at the start to ensure consistency.
   */
  public override async fetchById(
    id: string,
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<Member | null> {
    // CRITICAL: Resolve tenant context FIRST, before fetching
    let tenantId: string | null = null;
    try {
      tenantId = this.context?.tenantId || await this.ensureTenantContext();
    } catch (error) {
      console.warn(`[MemberAdapter.fetchById] Could not resolve tenant context: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Fetch encrypted record from parent
    const record = await super.fetchById(id, options);

    if (!record) {
      return null;
    }

    // Check if we can proceed with decryption
    if (!tenantId) {
      console.warn(`[MemberAdapter.fetchById] No tenant context for member ${id} - returning encrypted data`);
      return record;
    }

    try {
      // Check if record needs decryption
      const hasEncryptedFieldsMarker = record.encrypted_fields && (record.encrypted_fields as any[]).length > 0;
      const dataLooksEncrypted = this.looksEncrypted(record.first_name) ||
                                 this.looksEncrypted(record.last_name) ||
                                 this.looksEncrypted(record.email);

      if (!hasEncryptedFieldsMarker && !dataLooksEncrypted) {
        // Legacy plaintext record
        return record;
      }

      const decrypted = await this.encryptionService.decryptFields(
        record,
        tenantId,
        this.getPIIFields()
      );

      console.log(`[MemberAdapter.fetchById] Decrypted member ${id}`);
      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MemberAdapter.fetchById] Decryption failed for member ${id}:`, {
        error: errorMessage,
        tenantId,
        possibleCause: errorMessage.includes('key not found')
          ? 'Tenant encryption key may not exist - run: pnpm --filter @stewardtrack/web generate-tenant-keys'
          : errorMessage.includes('ENCRYPTION_MASTER_KEY')
          ? 'ENCRYPTION_MASTER_KEY environment variable not configured'
          : 'Check encryption service logs for details'
      });
      // Return encrypted data rather than failing
      return record;
    }
  }

  /**
   * Fetch all members (decrypted)
   */
  public override async fetchAll(
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<{ data: Member[]; count: number | null }> {
    return this.fetch(options);
  }
}
