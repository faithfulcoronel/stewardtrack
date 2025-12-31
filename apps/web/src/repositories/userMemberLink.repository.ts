import { injectable, inject } from 'inversify';
import { MemberAdapter } from '@/adapters/member.adapter';
import { UserAdapter } from '@/adapters/user.adapter';
import { UserMemberLinkAdapter } from '@/adapters/userMemberLink.adapter';
import { TYPES } from '@/lib/types';
import type {
  LinkUserToMemberDto,
  UnlinkUserFromMemberDto,
  LinkingResult,
  MemberSearchResult,
  MemberWithUser,
  UserSearchResult,
  BulkLinkRequest,
  BulkLinkResult,
  LinkingStats,
  LinkingConflict,
  LinkingAuditEntry
} from '@/models/userMemberLink.model';

/**
 * UserMemberLinkRepository
 *
 * Handles linking/unlinking users to member records.
 * Uses MemberAdapter for member data (handles encryption transparently).
 * Uses UserAdapter for auth user data (handles RPC calls).
 */
@injectable()
export class UserMemberLinkRepository {
  constructor(
    @inject(TYPES.MemberAdapter) private memberAdapter: MemberAdapter,
    @inject(TYPES.UserAdapter) private userAdapter: UserAdapter,
    @inject(TYPES.UserMemberLinkAdapter) private linkAdapter: UserMemberLinkAdapter
  ) {}

  // Link user to member
  async linkUserToMember(
    data: LinkUserToMemberDto,
    tenantId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LinkingResult> {
    return this.linkAdapter.callLinkUserToMember({
      p_tenant_id: tenantId,
      p_user_id: data.user_id,
      p_member_id: data.member_id,
      p_performed_by: performedBy,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_notes: data.notes
    });
  }

  // Unlink user from member
  async unlinkUserFromMember(
    data: UnlinkUserFromMemberDto,
    tenantId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LinkingResult> {
    return this.linkAdapter.callUnlinkUserFromMember({
      p_tenant_id: tenantId,
      p_member_id: data.member_id,
      p_performed_by: performedBy,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_notes: data.notes
    });
  }

  // Get members with user information
  async getMembersWithUsers(tenantId: string, limit = 50, offset = 0): Promise<MemberWithUser[]> {
    // Use MemberAdapter to get members (handles decryption)
    (this.memberAdapter as any).context = { tenantId };

    const result = await this.memberAdapter.fetch({
      order: { column: 'created_at', ascending: false },
      pagination: { page: Math.floor(offset / limit) + 1, pageSize: limit }
    });

    // Note: User information would need to be fetched separately if needed
    // The member data is already decrypted by the adapter
    return result.data as any[];
  }

  // Search members for linking
  async searchMembers(
    tenantId: string,
    query: string,
    linkedStatus?: 'linked' | 'unlinked' | 'all'
  ): Promise<MemberSearchResult[]> {
    console.log(`[UserMemberLinkRepository.searchMembers] Called with tenantId: ${tenantId}, query: "${query}", linkedStatus: ${linkedStatus}`);

    // Set tenant context on the adapter
    (this.memberAdapter as any).context = { tenantId };
    console.log(`[UserMemberLinkRepository.searchMembers] Set context on adapter, verifying: ${(this.memberAdapter as any).context?.tenantId}`);

    // Build filter conditions (ONLY for non-encrypted fields)
    const filters: Record<string, any> = {};

    // Apply linking status filter (user_id is not encrypted)
    if (linkedStatus === 'linked') {
      filters.user_id = { operator: 'neq', value: null };
    } else if (linkedStatus === 'unlinked') {
      filters.user_id = { operator: 'eq', value: null };
    }

    // NOTE: We cannot filter on encrypted fields (first_name, last_name, email) in the database
    // We'll fetch all members matching the linking status, then filter in memory after decryption

    console.log(`[UserMemberLinkRepository.searchMembers] Filters:`, JSON.stringify(filters));

    // Fetch members using adapter (which handles decryption automatically)
    const result = await this.memberAdapter.fetch({
      filters,
      order: { column: 'created_at', ascending: false },
      pagination: { page: 1, pageSize: 500 } // Increased to support in-memory search
    });

    console.log(`[UserMemberLinkRepository.searchMembers] Fetched ${result.data.length} members from adapter`);

    // Log first member's data to check if encrypted or decrypted
    if (result.data.length > 0) {
      const firstMember = result.data[0];
      console.log(`[UserMemberLinkRepository.searchMembers] First member sample:`, {
        id: firstMember.id,
        email: firstMember.email,
        email_length: firstMember.email?.length,
        email_starts_with: firstMember.email?.substring(0, 10),
        first_name: firstMember.first_name,
        last_name: firstMember.last_name,
        encrypted_fields: firstMember.encrypted_fields
      });
    }

    // Transform to MemberSearchResult format
    let transformed = result.data.map((member: any) => ({
      id: member.id,
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      contact_number: member.contact_number || '',
      membership_status: 'Unknown', // Would need to join membership_stage table separately
      is_linked: !!member.user_id,
      linked_user_email: undefined, // Would need to get from users table separately
      linked_at: member.linked_at
    }));

    // Filter in memory based on decrypted values (if query provided)
    if (query && query.trim()) {
      const searchLower = query.trim().toLowerCase();
      transformed = transformed.filter(member => {
        const firstNameMatch = member.first_name.toLowerCase().includes(searchLower);
        const lastNameMatch = member.last_name.toLowerCase().includes(searchLower);
        const emailMatch = member.email.toLowerCase().includes(searchLower);
        const fullNameMatch = `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchLower);

        return firstNameMatch || lastNameMatch || emailMatch || fullNameMatch;
      });

      console.log(`[UserMemberLinkRepository.searchMembers] After in-memory filtering with query "${query}": ${transformed.length} results`);
    }

    console.log(`[UserMemberLinkRepository.searchMembers] Returning ${transformed.length} results`);
    if (transformed.length > 0) {
      console.log(`[UserMemberLinkRepository.searchMembers] First result:`, {
        id: transformed[0].id,
        email: transformed[0].email,
        first_name: transformed[0].first_name,
        last_name: transformed[0].last_name
      });
    }

    return transformed;
  }

  // Search users for linking
  async searchUsers(
    tenantId: string,
    query: string,
    linkedStatus?: 'linked' | 'unlinked' | 'all'
  ): Promise<UserSearchResult[]> {
    console.log(`[UserMemberLinkRepository.searchUsers] Called with tenantId: ${tenantId}, query: "${query}", linkedStatus: ${linkedStatus}`);

    // Get members to identify linked users - use adapter for decryption
    (this.memberAdapter as any).context = { tenantId };

    const linkedMembers = await this.memberAdapter.fetch({
      filters: {
        user_id: { operator: 'neq', value: null }
      },
      pagination: { page: 1, pageSize: 1000 }
    });

    console.log(`[UserMemberLinkRepository.searchUsers] Found ${linkedMembers.data.length} linked members`);

    // Create a map of linked users with decrypted names
    const linkedUserMap = new Map();
    linkedMembers.data.forEach((member: any) => {
      if (member.user_id) {
        console.log(`[UserMemberLinkRepository.searchUsers] Adding to map - user_id: ${member.user_id}, member: ${member.first_name} ${member.last_name} (ID: ${member.id})`);
        linkedUserMap.set(member.user_id, {
          first_name: member.first_name,
          last_name: member.last_name,
          linked_at: member.linked_at,
          member_id: member.id
        });
      }
    });

    console.log(`[UserMemberLinkRepository.searchUsers] linkedUserMap size: ${linkedUserMap.size}`);

    // Get user profiles using UserAdapter (handles RPC calls)
    const users = await this.userAdapter.fetchUsers(tenantId);
    console.log(`[UserMemberLinkRepository.searchUsers] Got ${users.length} users from UserAdapter`);

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
      filteredResults = results.filter((user: UserSearchResult) =>
        user.email.toLowerCase().includes(lowerQuery) ||
        (user.first_name || '').toLowerCase().includes(lowerQuery) ||
        (user.last_name || '').toLowerCase().includes(lowerQuery)
      );
    }

    // Apply linking status filter
    if (linkedStatus === 'linked') {
      return filteredResults.filter((user: UserSearchResult) => user.is_linked);
    } else if (linkedStatus === 'unlinked') {
      return filteredResults.filter((user: UserSearchResult) => !user.is_linked);
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
    // Get member counts
    const totalMembers = await this.linkAdapter.countTotalMembers(tenantId);
    const linkedMembers = await this.linkAdapter.countLinkedMembers(tenantId);

    // Get user counts for this tenant
    const totalUsers = await this.linkAdapter.countTotalUsers(tenantId);
    const linkedUserIds = await this.linkAdapter.fetchLinkedUserIds(tenantId);
    const linkedUsers = new Set(linkedUserIds).size;

    // Get recent links count (last 30 days)
    const recentLinksCount = await this.linkAdapter.countRecentLinks(tenantId, 30);

    // Get pending invitations count
    const pendingInvitations = await this.linkAdapter.countPendingInvitations(tenantId);

    return {
      total_members: totalMembers,
      linked_members: linkedMembers,
      unlinked_members: totalMembers - linkedMembers,
      total_users: totalUsers,
      linked_users: linkedUsers,
      unlinked_users: totalUsers - linkedUsers,
      linking_percentage: totalMembers ? Math.round((linkedMembers / totalMembers) * 100) : 0,
      recent_links_count: recentLinksCount,
      pending_invitations: pendingInvitations
    };
  }

  // Detect linking conflicts
  async detectLinkingConflicts(
    userId: string,
    memberId: string,
    tenantId: string
  ): Promise<LinkingConflict[]> {
    const conflicts: LinkingConflict[] = [];

    // Set tenant context on member adapter for encryption/decryption
    (this.memberAdapter as any).context = { tenantId };

    // Check if user is already linked to another member
    // Use MemberAdapter to handle encrypted data properly
    const existingUserLinkResult = await this.memberAdapter.fetch({
      filters: {
        user_id: { operator: 'eq', value: userId }
      },
      pagination: { page: 1, pageSize: 100 }
    });

    // Filter out the current member being linked
    const existingUserLinks = existingUserLinkResult.data.filter((m: any) => m.id !== memberId);

    if (existingUserLinks.length > 0) {
      const existingUserLink = existingUserLinks[0];
      conflicts.push({
        type: 'user_already_linked',
        user_id: userId,
        member_id: existingUserLink.id,
        existing_link: {
          user_id: userId,
          member_id: existingUserLink.id,
          linked_at: existingUserLink.linked_at || new Date().toISOString()
        },
        suggested_action: 'Unlink user from current member first'
      });
    }

    // Check if member is already linked to another user
    // Use MemberAdapter to handle encrypted data properly
    const existingMemberLink = await this.memberAdapter.fetchById(memberId);

    if (existingMemberLink && existingMemberLink.user_id && existingMemberLink.user_id !== userId) {
      conflicts.push({
        type: 'member_already_linked',
        user_id: existingMemberLink.user_id,
        member_id: memberId,
        existing_link: {
          user_id: existingMemberLink.user_id,
          member_id: memberId,
          linked_at: existingMemberLink.linked_at || new Date().toISOString()
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
    const data = await this.linkAdapter.fetchAuditTrail(tenantId, limit, offset, filters);

    return data.map((entry: any) => ({
      id: entry.id,
      action: entry.action,
      user_email: entry.users?.[0]?.email,
      member_name: entry.members?.[0] ? `${entry.members[0].first_name} ${entry.members[0].last_name}` : undefined,
      performed_by_name: entry.performed_by_user?.[0]?.email || 'System',
      created_at: entry.created_at,
      notes: entry.notes,
      old_values: entry.old_values,
      new_values: entry.new_values
    }));
  }

  // Get member by user ID
  async getMemberByUserId(userId: string, tenantId: string): Promise<MemberWithUser | null> {
    // Use MemberAdapter to get member (handles decryption)
    (this.memberAdapter as any).context = { tenantId };

    const result = await this.memberAdapter.fetch({
      filters: {
        user_id: { operator: 'eq', value: userId }
      },
      pagination: { page: 1, pageSize: 1 }
    });

    if (result.data.length === 0) {
      return null; // No member found
    }

    return result.data[0] as any;
  }

  // Get user by member ID
  async getUserByMemberId(memberId: string, tenantId: string): Promise<UserSearchResult | null> {
    // Use MemberAdapter to get member (handles decryption)
    (this.memberAdapter as any).context = { tenantId };

    const result = await this.memberAdapter.fetchById(memberId);

    if (!result || !result.user_id) {
      return null; // No linked user found
    }

    // Get all users from tenant to find the linked user
    const users = await this.userAdapter.fetchUsers(tenantId);
    const user = users.find(u => u.id === result.user_id || u.user_id === result.user_id);

    if (!user) {
      return null;
    }

    const metadata = user.raw_user_meta_data || user.user_metadata || {};

    return {
      id: (user.id || user.user_id) ?? '',
      email: user.email ?? '',
      first_name: metadata.first_name || metadata.firstName || '',
      last_name: metadata.last_name || metadata.lastName || '',
      last_sign_in_at: user.last_sign_in_at ?? undefined,
      created_at: user.created_at ?? new Date().toISOString(),
      is_linked: true,
      linked_at: result.linked_at ? result.linked_at : undefined
    };
  }
}