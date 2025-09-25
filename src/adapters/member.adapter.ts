import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Member } from '@/models/member.model';
import { MemberHousehold } from '@/models/memberHousehold.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import { FieldValidationError } from '@/utils/errorHandler';

export interface IMemberAdapter extends IBaseAdapter<Member> {
  getCurrentMonthBirthdays(): Promise<Member[]>;
  getBirthdaysByMonth(month: number): Promise<Member[]>;
  getCurrentUserMember(): Promise<Member | null>;
}

@injectable()
export class MemberAdapter
  extends BaseAdapter<Member>
  implements IMemberAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
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
    membership_date,
    household_id,
    anniversary,
    birthday,
    profile_picture_url,
    gender,
    marital_status,
    occupation,
    baptism_date,
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
    care_status_code,
    care_pastor,
    care_follow_up_at,
    care_team,
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
    membership_center_id
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
        'envelope_number',
        'address_street',
        'address_city',
        'address_state',
        'address_postal_code',
        'member_names',
        'notes'
      ]
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

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('member_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!tenantUser?.member_id) return null;

    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', tenantUser.member_id)
      .is('deleted_at', null)
      .single();

    return (member as Member) || null;
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
    const envelope = this.cleanOptionalString(input.envelope_number);
    const street = this.cleanOptionalString(input.address_street);
    const city = this.cleanOptionalString(input.address_city);
    const state = this.cleanOptionalString(input.address_state);
    const postal = this.cleanOptionalString(input.address_postal_code);
    const memberNames = this.coerceStringArray(input.member_names);
    const notes = this.cleanOptionalString(input.notes);

    const hasMeaningfulInput = Boolean(
      input.id !== undefined ||
        name !== undefined ||
        envelope !== undefined ||
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
      envelope_number: envelope,
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
      envelope_number,
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

    let targetId: string | null = null;
    if (payload.envelope_number) {
      const { data: existing, error: lookupError } = await supabase
        .from('member_households')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('envelope_number', payload.envelope_number)
        .is('deleted_at', null)
        .limit(1);

      if (lookupError) {
        throw lookupError;
      }
      targetId = existing?.[0]?.id ?? null;
    }

    if (targetId) {
      const { data, error } = await supabase
        .from('member_households')
        .update(payload)
        .eq('id', targetId)
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

  private async prepareMemberPayload(data: Partial<Member>): Promise<Partial<Member>> {
    const payload: Record<string, unknown> = { ...data };
    const tenantId = await this.getTenantId();
    const userId = await this.getUserId();

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
        householdRecord = await this.upsertHousehold(householdInput ?? {}, tenantId ?? null, userId);
        if (householdRecord) {
          payload.household_id = householdRecord.id;
          if (householdRecord.envelope_number !== undefined) {
            payload.envelope_number = householdRecord.envelope_number;
          }
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
      'care_status_code',
      'care_pastor',
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
      'data_steward'
    ];

    for (const field of stringFields) {
      if (payload[field] !== undefined) {
        payload[field] = this.cleanOptionalString(payload[field]) ?? null;
      }
    }

    if (payload.care_status_code !== undefined) {
      const status = this.cleanOptionalString(payload.care_status_code);
      payload.care_status_code = status ? status.toLowerCase() : null;
    }

    const arrayFields: Array<keyof Member> = [
      'spiritual_gifts',
      'ministry_interests',
      'small_groups',
      'ministries',
      'volunteer_roles',
      'discipleship_pathways',
      'care_team',
      'leadership_roles',
      'prayer_requests',
      'tags'
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
      'care_follow_up_at',
      'last_attendance_date',
      'giving_last_gift_at',
      'anniversary',
      'next_serve_at',
      'last_huddle_at',
      'last_review_at'
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

    return prepared;
  }

  protected override async onAfterCreate(data: Member): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('create', 'member', data.id, data);
  }

  protected override async onBeforeUpdate(id: string, data: Partial<Member>): Promise<Partial<Member>> {
    const prepared = await this.prepareMemberPayload(data);

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

    return prepared;
  }

  protected override async onAfterUpdate(data: Member): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('update', 'member', data.id, data);
  }
}
