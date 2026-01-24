import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  CommunicationPreference,
  UpsertPreferenceDto,
  PreferenceCheck,
} from '@/models/communication/preference.model';

export type IPreferenceAdapter = IBaseAdapter<CommunicationPreference> & {
  upsertPreference(data: UpsertPreferenceDto, tenantId: string): Promise<CommunicationPreference>;
  getPreferenceByMember(memberId: string, tenantId: string): Promise<CommunicationPreference | null>;
  getPreferenceByEmail(email: string, tenantId: string): Promise<CommunicationPreference | null>;
  getPreferenceByPhone(phone: string, tenantId: string): Promise<CommunicationPreference | null>;
  checkPreferences(tenantId: string, email?: string, phone?: string, memberId?: string): Promise<PreferenceCheck>;
  optOut(tenantId: string, channel: 'email' | 'sms' | 'all', identifier: OptOutIdentifier): Promise<void>;
  optIn(tenantId: string, channel: 'email' | 'sms' | 'all', identifier: OptOutIdentifier): Promise<void>;
  getOptedOutContacts(tenantId: string, channel?: 'email' | 'sms'): Promise<OptedOutContact[]>;
};

export interface OptOutIdentifier {
  email?: string;
  phone?: string;
  memberId?: string;
}

export interface OptedOutContact {
  id: string;
  email?: string;
  phone?: string;
  memberId?: string;
  channel: 'email' | 'sms' | 'all';
  optedOutAt: string;
  reason?: string;
}

@injectable()
export class PreferenceAdapter extends BaseAdapter<CommunicationPreference> implements IPreferenceAdapter {
  protected tableName = 'communication_preferences';
  protected defaultSelect = `
    id, tenant_id, member_id, email, phone, email_opted_in, sms_opted_in,
    opted_out_at, opted_out_reason, created_at, updated_at
  `;

  async upsertPreference(data: UpsertPreferenceDto, tenantId: string): Promise<CommunicationPreference> {
    const supabase = await this.getSupabaseClient();

    // Try to find existing preference
    let existingId: string | null = null;

    if (data.member_id) {
      const { data: existing } = await supabase
        .from(this.tableName)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('member_id', data.member_id)
        .single();
      if (existing) existingId = (existing as { id: string }).id;
    } else if (data.email) {
      const { data: existing } = await supabase
        .from(this.tableName)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', data.email)
        .single();
      if (existing) existingId = (existing as { id: string }).id;
    } else if (data.phone) {
      const { data: existing } = await supabase
        .from(this.tableName)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', data.phone)
        .single();
      if (existing) existingId = (existing as { id: string }).id;
    }

    const now = new Date().toISOString();

    if (existingId) {
      // Update existing
      const updateData: Record<string, unknown> = { updated_at: now };
      if (data.email_opted_in !== undefined) updateData.email_opted_in = data.email_opted_in;
      if (data.sms_opted_in !== undefined) updateData.sms_opted_in = data.sms_opted_in;
      if (data.opted_out_reason !== undefined) updateData.opted_out_reason = data.opted_out_reason;

      // If opting out, set opted_out_at
      if (data.email_opted_in === false || data.sms_opted_in === false) {
        updateData.opted_out_at = now;
      }

      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', existingId)
        .select(this.defaultSelect)
        .single();

      if (error) {
        throw new Error(`Failed to update preference: ${error.message}`);
      }

      return this.enrichPreference(result);
    } else {
      // Create new
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert({
          tenant_id: tenantId,
          member_id: data.member_id ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          email_opted_in: data.email_opted_in ?? true,
          sms_opted_in: data.sms_opted_in ?? true,
          opted_out_at: (data.email_opted_in === false || data.sms_opted_in === false) ? now : null,
          opted_out_reason: data.opted_out_reason ?? null,
          created_at: now,
          updated_at: now,
        })
        .select(this.defaultSelect)
        .single();

      if (error) {
        throw new Error(`Failed to create preference: ${error.message}`);
      }

      return this.enrichPreference(result);
    }
  }

  async getPreferenceByMember(memberId: string, tenantId: string): Promise<CommunicationPreference | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('member_id', memberId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch preference: ${error.message}`);
    }

    return this.enrichPreference(data);
  }

  async getPreferenceByEmail(email: string, tenantId: string): Promise<CommunicationPreference | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch preference: ${error.message}`);
    }

    return this.enrichPreference(data);
  }

  async getPreferenceByPhone(phone: string, tenantId: string): Promise<CommunicationPreference | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch preference: ${error.message}`);
    }

    return this.enrichPreference(data);
  }

  async checkPreferences(
    tenantId: string,
    email?: string,
    phone?: string,
    memberId?: string
  ): Promise<PreferenceCheck> {
    const result: PreferenceCheck = {
      email,
      phone,
      emailOptedIn: true,
      smsOptedIn: true,
      canSendEmail: !!email,
      canSendSms: !!phone,
    };

    // Check member preference first
    if (memberId) {
      const pref = await this.getPreferenceByMember(memberId, tenantId);
      if (pref) {
        result.emailOptedIn = pref.email_opted_in;
        result.smsOptedIn = pref.sms_opted_in;
        result.canSendEmail = !!email && pref.email_opted_in;
        result.canSendSms = !!phone && pref.sms_opted_in;
        return result;
      }
    }

    // Check email preference
    if (email) {
      const pref = await this.getPreferenceByEmail(email, tenantId);
      if (pref) {
        result.emailOptedIn = pref.email_opted_in;
        result.canSendEmail = pref.email_opted_in;
      }
    }

    // Check phone preference
    if (phone) {
      const pref = await this.getPreferenceByPhone(phone, tenantId);
      if (pref) {
        result.smsOptedIn = pref.sms_opted_in;
        result.canSendSms = pref.sms_opted_in;
      }
    }

    return result;
  }

  async optOut(
    tenantId: string,
    channel: 'email' | 'sms' | 'all',
    identifier: OptOutIdentifier
  ): Promise<void> {
    const updateData: UpsertPreferenceDto = {
      ...identifier,
    };

    if (channel === 'email' || channel === 'all') {
      updateData.email_opted_in = false;
    }

    if (channel === 'sms' || channel === 'all') {
      updateData.sms_opted_in = false;
    }

    await this.upsertPreference(updateData, tenantId);
  }

  async optIn(
    tenantId: string,
    channel: 'email' | 'sms' | 'all',
    identifier: OptOutIdentifier
  ): Promise<void> {
    const updateData: UpsertPreferenceDto = {
      ...identifier,
    };

    if (channel === 'email' || channel === 'all') {
      updateData.email_opted_in = true;
    }

    if (channel === 'sms' || channel === 'all') {
      updateData.sms_opted_in = true;
    }

    await this.upsertPreference(updateData, tenantId);
  }

  async getOptedOutContacts(tenantId: string, channel?: 'email' | 'sms'): Promise<OptedOutContact[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId);

    if (channel === 'email') {
      query = query.eq('email_opted_in', false);
    } else if (channel === 'sms') {
      query = query.eq('sms_opted_in', false);
    } else {
      query = query.or('email_opted_in.eq.false,sms_opted_in.eq.false');
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch opted out contacts: ${error.message}`);
    }

    return ((data as unknown as CommunicationPreference[]) || []).map((pref) => {
      let contactChannel: 'email' | 'sms' | 'all' = 'all';
      if (!pref.email_opted_in && pref.sms_opted_in) {
        contactChannel = 'email';
      } else if (pref.email_opted_in && !pref.sms_opted_in) {
        contactChannel = 'sms';
      }

      return {
        id: pref.id,
        email: pref.email ?? undefined,
        phone: pref.phone ?? undefined,
        memberId: pref.member_id ?? undefined,
        channel: contactChannel,
        optedOutAt: pref.opted_out_at || pref.updated_at || '',
        reason: pref.opted_out_reason ?? undefined,
      };
    });
  }

  private enrichPreference(data: unknown): CommunicationPreference {
    const row = data as Record<string, unknown>;
    return {
      ...row,
      email_opted_in: row.email_opted_in as boolean ?? true,
      sms_opted_in: row.sms_opted_in as boolean ?? true,
    } as CommunicationPreference;
  }
}
