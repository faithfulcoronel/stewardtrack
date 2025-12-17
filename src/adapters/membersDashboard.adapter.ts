import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { startOfMonth, format } from 'date-fns';
import { tenantUtils } from '@/utils/tenantUtils';
import type { RequestContext } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface MemberMetrics {
  totalMembers: number;
  newMembers: number;
  visitorCount: number;
  familyCount: number;
}

export interface IMembersDashboardAdapter {
  fetchMetrics(): Promise<MemberMetrics>;
  fetchRecentMembers(limit: number): Promise<any[]>;
  fetchMemberDirectory(search: string | undefined, limit: number): Promise<any[]>;
  fetchBirthdaysToday(): Promise<any[]>;
  fetchBirthdaysThisMonth(): Promise<any[]>;
  fetchBirthdaysByMonth(month: number): Promise<any[]>;
}

@injectable()
export class MembersDashboardAdapter implements IMembersDashboardAdapter {
  private supabase: SupabaseClient | null = null;
  private context: RequestContext = {} as RequestContext;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
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
        .eq('code', 'visitor')
        .maybeSingle(),
    );

    const familyPromise = tenantFilter(
      supabase
        .from('family_relationships')
        .select('id', { count: 'exact', head: true }),
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

  async fetchMemberDirectory(search: string | undefined, limit: number): Promise<any[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from('members')
      .select(
        `id, tenant_id, first_name, last_name, email, contact_number, profile_picture_url, encrypted_fields, encryption_key_version, membership_stage:membership_status_id(name, code), membership_center:membership_center_id(name, code)`
      )
      .is('deleted_at', null)
      .order('last_name', { ascending: true })
      .limit(limit);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (search && search.trim()) {
      query = query.or(
        `first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%,preferred_name.ilike.%${search.trim()}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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
    return data || [];
  }

  async fetchBirthdaysByMonth(month: number): Promise<any[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_birthdays_for_month', {
      p_month: month,
    });
    if (error) throw error;
    return data || [];
  }
}
