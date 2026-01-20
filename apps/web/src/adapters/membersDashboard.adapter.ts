import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { startOfMonth, format } from 'date-fns';
import { tenantUtils } from '@/utils/tenantUtils';
import type { RequestContext } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

export interface MemberMetrics {
  totalMembers: number;
  newMembers: number;
  visitorCount: number;
  familyCount: number;
}

export interface IMembersDashboardAdapter {
  fetchMetrics(): Promise<MemberMetrics>;
  fetchRecentMembers(limit: number): Promise<any[]>;
  fetchMemberDirectory(search: string | undefined, limit?: number): Promise<any[]>;
  fetchBirthdaysToday(): Promise<any[]>;
  fetchBirthdaysThisMonth(): Promise<any[]>;
  fetchBirthdaysByMonth(month: number): Promise<any[]>;
}

/**
 * Members Dashboard Adapter with built-in encryption for PII fields
 *
 * Encrypted Fields (12 total):
 * - first_name, last_name
 * - email, contact_number, address
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * - physician_name, pastoral_notes
 * - prayer_requests (array)
 */
@injectable()
export class MembersDashboardAdapter implements IMembersDashboardAdapter {
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

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
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
  private async decryptMember<T extends Record<string, any>>(
    member: T,
    tenantId: string
  ): Promise<T> {
    try {
      console.log('[MembersDashboardAdapter] decryptMember called:', {
        memberId: (member as any).id,
        tenantId,
        hasFirstName: !!(member as any).first_name,
        firstNameSample: (member as any).first_name?.substring(0, 20),
        hasEncryptedFields: !!(member as any).encrypted_fields,
        encryptedFields: (member as any).encrypted_fields
      });

      // Check if record has encrypted fields marker
      const encrypted_fields = (member as any).encrypted_fields;

      // Check if first_name looks encrypted (format: version.iv.tag.ciphertext)
      const firstName = (member as any).first_name;
      const looksEncrypted = firstName && typeof firstName === 'string' &&
                            firstName.match(/^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

      console.log('[MembersDashboardAdapter] Encryption detection:', {
        hasMarker: !!(encrypted_fields && encrypted_fields.length > 0),
        looksEncrypted,
        firstNameFormat: firstName?.substring(0, 30)
      });

      if (!looksEncrypted && (!encrypted_fields || encrypted_fields.length === 0)) {
        // Plaintext record
        console.log('[MembersDashboardAdapter] Plaintext record - returning as-is');
        return member;
      }

      // Data is encrypted (either has marker OR looks encrypted)
      console.log('[MembersDashboardAdapter] Attempting decryption for all PII fields');

      // Decrypt PII fields
      const decrypted = await this.encryptionService.decryptFields(
        member,
        tenantId,
        this.getPIIFields()
      );

      console.log('[MembersDashboardAdapter] Decryption complete:', {
        memberId: (member as any).id,
        decryptedFirstName: (decrypted as any).first_name?.substring(0, 20),
        decryptedLastName: (decrypted as any).last_name?.substring(0, 20)
      });

      return decrypted;
    } catch (error) {
      console.error('[MembersDashboardAdapter] Decryption failed:', error);
      // Return original record rather than failing
      return member;
    }
  }

  async fetchMetrics(): Promise<MemberMetrics> {
    const tenantId = await this.getTenantId();
    const today = new Date();
    const monthStart = startOfMonth(today);
    const supabase = await this.getSupabaseClient();
    const tenantFilter = (query: any) =>
      tenantId ? query.eq('tenant_id', tenantId) : query;

    const totalPromise = tenantFilter(
      supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
    );

    const newPromise = tenantFilter(
      supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', format(monthStart, 'yyyy-MM-dd')),
    );

    const visitorStatusPromise = tenantFilter(
      supabase
        .from('membership_stage')
        .select('id')
        .eq('code', 'first_time_guest')
        .maybeSingle(),
    );

    const familyPromise = tenantFilter(
      supabase
        .from('families')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
    );

    const [totalRes, newRes, visitorStatusRes, familyRes] = await Promise.all([
      totalPromise,
      newPromise,
      visitorStatusPromise,
      familyPromise,
    ]);

    const visitorStatusId = (visitorStatusRes.data as any)?.id;
    let visitorCount = 0;
    if (visitorStatusId) {
      const visitorRes = await tenantFilter(
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('membership_status_id', visitorStatusId),
      );
      visitorCount = visitorRes.count || 0;
    }

    return {
      totalMembers: totalRes.count || 0,
      newMembers: newRes.count || 0,
      visitorCount,
      familyCount: familyRes.count || 0,
    };
  }

  async fetchRecentMembers(limit: number): Promise<any[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    const query = supabase
      .from('members')
      .select(
        `id, tenant_id, first_name, last_name, email, profile_picture_url, encrypted_fields, encryption_key_version, created_at, membership_stage:membership_status_id(name, code), membership_center:membership_center_id(name, code)`
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (tenantId) query.eq('tenant_id', tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async fetchMemberDirectory(search: string | undefined, limit?: number): Promise<any[]> {
    console.log('[MembersDashboardAdapter] fetchMemberDirectory called:', { search, limit });

    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from('members')
      .select(
        `id, tenant_id, first_name, last_name, email, contact_number, profile_picture_url, encrypted_fields, encryption_key_version, membership_stage:membership_status_id(name, code), membership_center:membership_center_id(name, code)`
      )
      .is('deleted_at', null)
      .order('last_name', { ascending: true });

    // Only apply limit if specified (allows fetching all records)
    if (limit !== undefined && limit > 0) {
      query = query.limit(limit);
    }
    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (search && search.trim()) {
      query = query.or(
        `first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%,preferred_name.ilike.%${search.trim()}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;

    const members = data || [];

    console.log('[MembersDashboardAdapter] Fetched directory from DB:', {
      count: members.length,
      firstMemberSample: members[0] ? {
        id: members[0].id,
        firstNameSample: members[0].first_name?.substring(0, 20),
        hasEncryptedFields: !!(members[0] as any).encrypted_fields,
        hasTenantId: !!(members[0] as any).tenant_id
      } : null
    });

    if (members.length === 0) {
      return members;
    }

    // Get tenant ID from first member record (all should have same tenant_id)
    const effectiveTenantId = (members[0] as any).tenant_id;
    if (!effectiveTenantId) {
      console.warn('[MembersDashboardAdapter] No tenant_id found in member records');
      return members;
    }

    console.log('[MembersDashboardAdapter] Starting decryption for', members.length, 'members with tenantId:', effectiveTenantId);

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: any) => this.decryptMember(member, effectiveTenantId))
    );

    console.log('[MembersDashboardAdapter] Successfully decrypted', decrypted.length, 'directory records');

    return decrypted;
  }

  async fetchBirthdaysToday(): Promise<any[]> {
    const all = await this.fetchBirthdaysThisMonth();
    const today = new Date();
    return all.filter(m => {
      if (!m.birthday) return false;
      const d = new Date(m.birthday);
      return d.getDate() === today.getDate();
    });
  }

  async fetchBirthdaysThisMonth(): Promise<any[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_current_month_birthdays');
    if (error) throw error;

    const members = data || [];

    if (members.length === 0) {
      return members;
    }

    // Get tenant ID from first member record
    const tenantId = (members[0] as any).tenant_id;
    if (!tenantId) {
      console.warn('[MembersDashboardAdapter] No tenant_id found in birthday records');
      return members;
    }

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: any) => this.decryptMember(member, tenantId))
    );

    return decrypted;
  }

  async fetchBirthdaysByMonth(month: number): Promise<any[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_birthdays_for_month', {
      p_month: month,
    });
    if (error) throw error;

    const members = data || [];

    if (members.length === 0) {
      return members;
    }

    // Get tenant ID from first member record
    const tenantId = (members[0] as any).tenant_id;
    if (!tenantId) {
      console.warn('[MembersDashboardAdapter] No tenant_id found in birthday records');
      return members;
    }

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: any) => this.decryptMember(member, tenantId))
    );

    return decrypted;
  }
}
