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
      'data_steward'
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

    // Encrypt PII fields before creating record
    const tenantId = this.context?.tenantId;
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
    const tenantId = this.context?.tenantId;
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
   */
  public override async fetch(
    options: QueryOptions = {}
  ): Promise<{ data: Member[]; count: number | null }> {
    // Fetch encrypted records from parent
    const result = await super.fetch(options);

    // Get tenant context
    const tenantId = this.context?.tenantId;
    console.log(`[MemberAdapter.fetch] Context tenantId: ${tenantId}, Records fetched: ${result.data.length}`);

    if (!tenantId || !result.data.length) {
      console.log(`[MemberAdapter.fetch] Skipping decryption - ${!tenantId ? 'no tenant context' : 'no records'}`);
      return result;
    }

    try {
      // Log sample of raw data from database before decryption
      if (result.data.length > 0) {
        const firstRecord = result.data[0];
        console.log(`[MemberAdapter.fetch] Sample record BEFORE decryption:`, {
          id: firstRecord.id,
          email: firstRecord.email,
          email_length: firstRecord.email?.length,
          encrypted_fields: firstRecord.encrypted_fields,
          encryption_key_version: firstRecord.encryption_key_version
        });
      }

      // Decrypt all records in parallel
      const decrypted = await Promise.all(
        result.data.map(async (record, index) => {
          // Check if record has encrypted fields
          if (!record.encrypted_fields || (record.encrypted_fields as any[]).length === 0) {
            console.log(`[MemberAdapter.fetch] Record ${index} has no encrypted_fields, skipping decryption`);
            // Legacy plaintext record or no PII fields
            return record;
          }

          console.log(`[MemberAdapter.fetch] Decrypting record ${index} with ${(record.encrypted_fields as any[]).length} encrypted fields`);
          const decryptedRecord = await this.encryptionService.decryptFields(
            record,
            tenantId,
            this.getPIIFields()
          );

          console.log(`[MemberAdapter.fetch] Record ${index} AFTER decryption:`, {
            id: decryptedRecord.id,
            email: decryptedRecord.email,
            email_length: decryptedRecord.email?.length
          });

          return decryptedRecord;
        })
      );

      console.log(
        `[MemberAdapter] Decrypted ${decrypted.length} member records`
      );

      // Log sample of decrypted data
      if (decrypted.length > 0) {
        const firstDecrypted = decrypted[0];
        console.log(`[MemberAdapter.fetch] Final sample AFTER all decryption:`, {
          id: firstDecrypted.id,
          email: firstDecrypted.email,
          first_name: firstDecrypted.first_name,
          last_name: firstDecrypted.last_name
        });
      }

      return { data: decrypted, count: result.count };
    } catch (error) {
      console.error('[MemberAdapter.fetch] Decryption failed during fetch:', error);
      // Return encrypted data rather than failing completely
      return result;
    }
  }

  /**
   * Decrypt PII fields after fetching single member
   */
  public override async fetchById(
    id: string,
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<Member | null> {
    // Fetch encrypted record from parent
    const record = await super.fetchById(id, options);

    if (!record) {
      return null;
    }

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      return record;
    }

    try {
      // Check if record has encrypted fields
      if (!record.encrypted_fields || (record.encrypted_fields as any[]).length === 0) {
        // Legacy plaintext record or no PII fields
        return record;
      }

      const decrypted = await this.encryptionService.decryptFields(
        record,
        tenantId,
        this.getPIIFields()
      );

      console.log(
        `[MemberAdapter] Decrypted member ${id}`
      );

      return decrypted;
    } catch (error) {
      console.error(`[MemberAdapter] Decryption failed for member ${id}:`, error);
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
