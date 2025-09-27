import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BaseRepository } from './base.repository';
import {
  UserMemberLink,
  UserMemberLinkAudit,
  LinkUserToMemberDto,
  UnlinkUserFromMemberDto,
  LinkingResult,
  MemberWithUser,
  MemberSearchResult,
  UserSearchResult,
  BulkLinkRequest,
  BulkLinkResult,
  LinkingStats,
  LinkingConflict,
  LinkingAuditEntry
} from '@/models/userMemberLink.model';

@injectable()
export class UserMemberLinkRepository extends BaseRepository {
  private supabaseClient: SupabaseClient | null = null;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabaseClient) {
      this.supabaseClient = await createSupabaseServerClient();
    }
    return this.supabaseClient;
  }

  // Link user to member
  async linkUserToMember(
    data: LinkUserToMemberDto,
    tenantId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LinkingResult> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .rpc('link_user_to_member', {
        p_tenant_id: tenantId,
        p_user_id: data.user_id,
        p_member_id: data.member_id,
        p_performed_by: performedBy,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_notes: data.notes
      });

    if (error) {
      throw new Error(`Failed to link user to member: ${error.message}`);
    }

    return result as LinkingResult;
  }

  // Unlink user from member
  async unlinkUserFromMember(
    data: UnlinkUserFromMemberDto,
    tenantId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LinkingResult> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .rpc('unlink_user_from_member', {
        p_tenant_id: tenantId,
        p_member_id: data.member_id,
        p_performed_by: performedBy,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_notes: data.notes
      });

    if (error) {
      throw new Error(`Failed to unlink user from member: ${error.message}`);
    }

    return result as LinkingResult;
  }

  // Get members with user information
  async getMembersWithUsers(tenantId: string, limit = 50, offset = 0): Promise<MemberWithUser[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        user:user_id (
          id,
          email,
          last_sign_in_at,
          created_at
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch members with users: ${error.message}`);
    }

    return data || [];
  }

  // Search members for linking
  async searchMembers(
    tenantId: string,
    query: string,
    linkedStatus?: 'linked' | 'unlinked' | 'all'
  ): Promise<MemberSearchResult[]> {
    const supabase = await this.getSupabaseClient();

    let baseQuery = supabase
      .from('members')
      .select(`
        id,
        first_name,
        last_name,
        email,
        user_id,
        linked_at,
        tenant_id
      `)
      .eq('tenant_id', tenantId);

    // Apply search filter
    if (query) {
      baseQuery = baseQuery.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    // Apply linking status filter
    if (linkedStatus === 'linked') {
      baseQuery = baseQuery.not('user_id', 'is', null);
    } else if (linkedStatus === 'unlinked') {
      baseQuery = baseQuery.is('user_id', null);
    }

    const { data, error } = await baseQuery
      .order('last_name', { ascending: true })
      .limit(100);

    if (error) {
      throw new Error(`Failed to search members: ${error.message}`);
    }

    return (data || []).map((member: any) => ({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      contact_number: '', // Not available in this table
      membership_status: 'Unknown', // Would need to join membership_stage table separately
      is_linked: !!member.user_id,
      linked_user_email: undefined, // Would need to get from users table separately
      linked_at: member.linked_at
    }));
  }

  // Search users for linking
  async searchUsers(
    tenantId: string,
    query: string,
    linkedStatus?: 'linked' | 'unlinked' | 'all'
  ): Promise<UserSearchResult[]> {
    const supabase = await this.getSupabaseClient();

    // Get members to identify linked users
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('user_id, first_name, last_name, linked_at')
      .eq('tenant_id', tenantId)
      .not('user_id', 'is', null);

    if (membersError) {
      console.error('Error fetching members for user search:', membersError);
    }

    // Create a map of linked users
    const linkedUserMap = new Map();
    (members || []).forEach(member => {
      if (member.user_id) {
        linkedUserMap.set(member.user_id, {
          first_name: member.first_name,
          last_name: member.last_name,
          linked_at: member.linked_at
        });
      }
    });

    // Get user profiles using RPC function
    let users = [];

    try {
      const { data: userProfiles, error: profilesError } = await supabase
        .rpc('get_user_profiles', { p_tenant_id: tenantId });

      if (!profilesError && userProfiles) {
        users = userProfiles;
        console.log(`Got ${users.length} user profiles from get_user_profiles RPC`);
      } else {
        console.error('Error fetching user profiles:', profilesError);
      }
    } catch (error) {
      console.error('get_user_profiles RPC failed:', error);
    }

    // Fallback: try get_tenant_users if get_user_profiles is not available
    if (users.length === 0) {
      try {
        const { data: rpcUsers, error: rpcError } = await supabase
          .rpc('get_tenant_users', { p_tenant_id: tenantId });

        if (!rpcError && rpcUsers) {
          users = rpcUsers;
          console.log(`Fallback: Got ${users.length} users from get_tenant_users RPC`);
        } else {
          console.error('Error fetching tenant users:', rpcError);
        }
      } catch (error) {
        console.error('get_tenant_users RPC failed:', error);
      }
    }

    // Transform to UserSearchResult format
    const results = users.map((user: any) => {
      const linkedInfo = linkedUserMap.get(user.id || user.user_id);
      const metadata = user.raw_user_meta_data || user.user_metadata || {};
      const isLinked = !!linkedInfo;

      // Handle different data structures from RPC functions
      const userId = user.id || user.user_id;
      const userEmail = user.email || '';
      const firstName = linkedInfo?.first_name || user.first_name || metadata.first_name || metadata.firstName || '';
      const lastName = linkedInfo?.last_name || user.last_name || metadata.last_name || metadata.lastName || '';

      const result = {
        id: userId,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        is_linked: isLinked,
        linked_member_name: isLinked ? `${linkedInfo.first_name} ${linkedInfo.last_name}` : undefined,
        linked_at: linkedInfo?.linked_at
      };

      console.log(`Transformed user ${userId}:`, {
        original_user: {
          id: user.id,
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        },
        final_result: {
          id: result.id,
          email: result.email,
          first_name: result.first_name,
          last_name: result.last_name
        },
        linked_info: linkedInfo
      });

      return result;
    });

    // Apply search filter
    let filteredResults = results;
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredResults = results.filter(user =>
        user.email.toLowerCase().includes(lowerQuery) ||
        user.first_name.toLowerCase().includes(lowerQuery) ||
        user.last_name.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply linking status filter
    if (linkedStatus === 'linked') {
      return filteredResults.filter(user => user.is_linked);
    } else if (linkedStatus === 'unlinked') {
      return filteredResults.filter(user => !user.is_linked);
    }

    return filteredResults.slice(0, 100); // Limit results
  }

  // Bulk link operations
  async bulkLinkUsers(
    request: BulkLinkRequest,
    tenantId: string,
    performedBy: string
  ): Promise<BulkLinkResult> {
    const successful_links: BulkLinkResult['successful_links'] = [];
    const failed_links: BulkLinkResult['failed_links'] = [];

    for (const link of request.links) {
      try {
        const result = await this.linkUserToMember(
          {
            user_id: link.user_id,
            member_id: link.member_id,
            notes: request.notes
          },
          tenantId,
          performedBy
        );

        if (result.success) {
          successful_links.push({
            user_id: link.user_id,
            member_id: link.member_id,
            linked_at: result.linked_at!
          });
        } else {
          failed_links.push({
            user_id: link.user_id,
            member_id: link.member_id,
            error: result.error || 'Unknown error',
            error_code: result.error_code || 'UNKNOWN_ERROR'
          });
        }
      } catch (error) {
        failed_links.push({
          user_id: link.user_id,
          member_id: link.member_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          error_code: 'EXCEPTION'
        });
      }
    }

    return {
      successful_links,
      failed_links,
      total_processed: request.links.length,
      success_count: successful_links.length,
      failure_count: failed_links.length
    };
  }

  // Get linking statistics
  async getLinkingStats(tenantId: string): Promise<LinkingStats> {
    const supabase = await this.getSupabaseClient();

    // Get member counts
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const { count: linkedMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    // Get user counts for this tenant
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { data: linkedUsersData } = await supabase
      .from('members')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    const linkedUsers = new Set(linkedUsersData?.map(m => m.user_id) || []).size;

    // Get recent links count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentLinksCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('user_id', 'is', null)
      .gte('linked_at', thirtyDaysAgo.toISOString());

    // Get pending invitations count
    const { count: pendingInvitations } = await supabase
      .from('member_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'sent'])
      .gt('expires_at', new Date().toISOString());

    return {
      total_members: totalMembers || 0,
      linked_members: linkedMembers || 0,
      unlinked_members: (totalMembers || 0) - (linkedMembers || 0),
      total_users: totalUsers || 0,
      linked_users: linkedUsers,
      unlinked_users: (totalUsers || 0) - linkedUsers,
      linking_percentage: totalMembers ? Math.round((linkedMembers || 0) / totalMembers * 100) : 0,
      recent_links_count: recentLinksCount || 0,
      pending_invitations: pendingInvitations || 0
    };
  }

  // Detect linking conflicts
  async detectLinkingConflicts(
    userId: string,
    memberId: string,
    tenantId: string
  ): Promise<LinkingConflict[]> {
    const supabase = await this.getSupabaseClient();
    const conflicts: LinkingConflict[] = [];

    // Check if user is already linked to another member
    const { data: existingUserLink } = await supabase
      .from('members')
      .select('id, first_name, last_name, linked_at')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .neq('id', memberId)
      .is('deleted_at', null)
      .single();

    if (existingUserLink) {
      conflicts.push({
        type: 'user_already_linked',
        user_id: userId,
        member_id: existingUserLink.id,
        existing_link: {
          user_id: userId,
          member_id: existingUserLink.id,
          linked_at: existingUserLink.linked_at
        },
        suggested_action: 'Unlink user from current member first'
      });
    }

    // Check if member is already linked to another user
    const { data: existingMemberLink } = await supabase
      .from('members')
      .select('user_id, linked_at')
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .not('user_id', 'is', null)
      .single();

    if (existingMemberLink && existingMemberLink.user_id !== userId) {
      conflicts.push({
        type: 'member_already_linked',
        user_id: existingMemberLink.user_id,
        member_id: memberId,
        existing_link: {
          user_id: existingMemberLink.user_id,
          member_id: memberId,
          linked_at: existingMemberLink.linked_at
        },
        suggested_action: 'Unlink member from current user first'
      });
    }

    return conflicts;
  }

  // Get audit trail
  async getAuditTrail(
    tenantId: string,
    limit = 50,
    offset = 0,
    filters?: {
      user_id?: string;
      member_id?: string;
      action?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<LinkingAuditEntry[]> {
    const supabase = await this.getSupabaseClient();

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

    return (data || []).map((entry: any) => ({
      id: entry.id,
      action: entry.action,
      user_email: entry.users?.email,
      member_name: entry.members ? `${entry.members.first_name} ${entry.members.last_name}` : undefined,
      performed_by_name: entry.performed_by_user?.email || 'System',
      created_at: entry.created_at,
      notes: entry.notes,
      old_values: entry.old_values,
      new_values: entry.new_values
    }));
  }

  // Get member by user ID
  async getMemberByUserId(userId: string, tenantId: string): Promise<MemberWithUser | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        user:user_id (
          id,
          email,
          last_sign_in_at,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No member found
      }
      throw new Error(`Failed to fetch member by user ID: ${error.message}`);
    }

    return data;
  }

  // Get user by member ID
  async getUserByMemberId(memberId: string, tenantId: string): Promise<UserSearchResult | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('members')
      .select(`
        user_id,
        linked_at,
        user:user_id (
          id,
          email,
          raw_user_meta_data,
          last_sign_in_at,
          created_at
        )
      `)
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('user_id', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No linked user found
      }
      throw new Error(`Failed to fetch user by member ID: ${error.message}`);
    }

    if (!data.user) {
      return null;
    }

    const user = data.user;
    const metadata = user.raw_user_meta_data || {};

    return {
      id: user.id,
      email: user.email,
      first_name: metadata.first_name,
      last_name: metadata.last_name,
      last_sign_in_at: user.last_sign_in_at,
      created_at: user.created_at,
      is_linked: true,
      linked_at: data.linked_at
    };
  }
}