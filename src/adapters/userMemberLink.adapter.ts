import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { LinkingResult } from '@/models/userMemberLink.model';

export interface MemberCountResult {
  count: number;
}

export interface LinkedUserData {
  user_id: string;
}

export interface MemberLinkData {
  id: string;
  first_name: string;
  last_name: string;
  linked_at: string | null;
  user_id: string | null;
}

export interface UserProfileCount {
  count: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  old_values: any;
  new_values: any;
  notes: string | null;
  created_at: string;
  users?: { email: string }[] | null;
  members?: { first_name: string; last_name: string }[] | null;
  performed_by_user?: { email: string; raw_user_meta_data: any }[] | null;
}

/**
 * UserMemberLinkAdapter
 *
 * Handles all Supabase queries for user-member linking operations
 * This includes RPC calls, direct table queries, and audit operations
 */
@injectable()
export class UserMemberLinkAdapter {
  /**
   * Call RPC function to link user to member
   */
  async callLinkUserToMember(params: {
    p_tenant_id: string;
    p_user_id: string;
    p_member_id: string;
    p_performed_by: string;
    p_ip_address?: string;
    p_user_agent?: string;
    p_notes?: string;
  }): Promise<LinkingResult> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('link_user_to_member', params);

    if (error) {
      throw new Error(`Failed to link user to member: ${error.message}`);
    }

    return data as LinkingResult;
  }

  /**
   * Call RPC function to unlink user from member
   */
  async callUnlinkUserFromMember(params: {
    p_tenant_id: string;
    p_member_id: string;
    p_performed_by: string;
    p_ip_address?: string;
    p_user_agent?: string;
    p_notes?: string;
  }): Promise<LinkingResult> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('unlink_user_from_member', params);

    if (error) {
      throw new Error(`Failed to unlink user from member: ${error.message}`);
    }

    return data as LinkingResult;
  }

  /**
   * Count total members for a tenant
   */
  async countTotalMembers(tenantId: string): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Count linked members for a tenant
   */
  async countLinkedMembers(tenantId: string): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Count total users for a tenant
   */
  async countTotalUsers(tenantId: string): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Fetch linked user IDs for a tenant
   */
  async fetchLinkedUserIds(tenantId: string): Promise<string[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('members')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    if (error) throw error;
    return (data || []).map(m => m.user_id).filter((id): id is string => id !== null);
  }

  /**
   * Count recent links (last 30 days)
   */
  async countRecentLinks(tenantId: string, daysAgo: number = 30): Promise<number> {
    const supabase = await createSupabaseServerClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('user_id', 'is', null)
      .gte('linked_at', cutoffDate.toISOString());

    if (error) throw error;
    return count || 0;
  }

  /**
   * Count pending invitations
   */
  async countPendingInvitations(tenantId: string): Promise<number> {
    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();

    const { count, error } = await supabase
      .from('member_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'sent'])
      .gt('expires_at', now);

    if (error) throw error;
    return count || 0;
  }

  // Note: findExistingUserLink and findExistingMemberLink removed
  // These methods need to query encrypted member data, so they should use MemberAdapter
  // They have been moved to the repository layer where MemberAdapter is already injected

  /**
   * Fetch audit trail entries
   */
  async fetchAuditTrail(
    tenantId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      user_id?: string;
      member_id?: string;
      action?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<AuditEntry[]> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('user_member_link_audit')
      .select(`
        id,
        action,
        old_values,
        new_values,
        notes,
        created_at,
        users:user_id(email),
        members:member_id(first_name, last_name),
        performed_by_user:performed_by(email, raw_user_meta_data)
      `)
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.member_id) {
      query = query.eq('member_id', filters.member_id);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch audit trail: ${error.message}`);
    }

    return data || [];
  }
}
