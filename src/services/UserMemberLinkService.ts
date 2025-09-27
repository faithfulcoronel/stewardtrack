import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { UserMemberLinkRepository } from '@/repositories/userMemberLink.repository';
import { MemberInvitationRepository } from '@/repositories/memberInvitation.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
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
import type {
  CreateMemberInvitationDto,
  MemberInvitation,
  MemberInvitationWithMember,
  InvitationStats,
  BulkInvitationRequest,
  BulkInvitationResult
} from '@/models/memberInvitation.model';

@injectable()
export class UserMemberLinkService {
  constructor(
    @inject(TYPES.UserMemberLinkRepository)
    private userMemberLinkRepository: UserMemberLinkRepository,
    @inject(TYPES.MemberInvitationRepository)
    private memberInvitationRepository: MemberInvitationRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // User-Member Linking Operations

  async linkUserToMember(
    data: LinkUserToMemberDto,
    performedBy: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LinkingResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Check for conflicts before attempting to link
    const conflicts = await this.userMemberLinkRepository.detectLinkingConflicts(
      data.user_id,
      data.member_id,
      effectiveTenantId
    );

    if (conflicts.length > 0) {
      const highPriorityConflict = conflicts.find(c =>
        c.type === 'user_already_linked' || c.type === 'member_already_linked'
      );

      if (highPriorityConflict) {
        return {
          success: false,
          error: `Linking conflict detected: ${highPriorityConflict.suggested_action}`,
          error_code: highPriorityConflict.type.toUpperCase()
        };
      }
    }

    return await this.userMemberLinkRepository.linkUserToMember(
      data,
      effectiveTenantId,
      performedBy,
      ipAddress,
      userAgent
    );
  }

  async unlinkUserFromMember(
    data: UnlinkUserFromMemberDto,
    performedBy: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LinkingResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    return await this.userMemberLinkRepository.unlinkUserFromMember(
      data,
      effectiveTenantId,
      performedBy,
      ipAddress,
      userAgent
    );
  }

  async getMembersWithUsers(
    tenantId?: string,
    limit = 50,
    offset = 0
  ): Promise<MemberWithUser[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.getMembersWithUsers(effectiveTenantId, limit, offset);
  }

  async searchMembers(
    query: string,
    linkedStatus?: 'linked' | 'unlinked' | 'all',
    tenantId?: string
  ): Promise<MemberSearchResult[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.searchMembers(effectiveTenantId, query, linkedStatus);
  }

  async searchUsers(
    query: string,
    linkedStatus?: 'linked' | 'unlinked' | 'all',
    tenantId?: string
  ): Promise<UserSearchResult[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.searchUsers(effectiveTenantId, query, linkedStatus);
  }

  async bulkLinkUsers(
    request: BulkLinkRequest,
    performedBy: string,
    tenantId?: string
  ): Promise<BulkLinkResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.bulkLinkUsers(request, effectiveTenantId, performedBy);
  }

  async getLinkingStats(tenantId?: string): Promise<LinkingStats> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.getLinkingStats(effectiveTenantId);
  }

  async detectLinkingConflicts(
    userId: string,
    memberId: string,
    tenantId?: string
  ): Promise<LinkingConflict[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.detectLinkingConflicts(userId, memberId, effectiveTenantId);
  }

  async getAuditTrail(
    tenantId?: string,
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
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.getAuditTrail(effectiveTenantId, limit, offset, filters);
  }

  async getMemberByUserId(userId: string, tenantId?: string): Promise<MemberWithUser | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.getMemberByUserId(userId, effectiveTenantId);
  }

  async getUserByMemberId(memberId: string, tenantId?: string): Promise<UserSearchResult | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.userMemberLinkRepository.getUserByMemberId(memberId, effectiveTenantId);
  }

  // Member Invitation Operations

  async createMemberInvitation(
    data: CreateMemberInvitationDto,
    invitedBy: string,
    tenantId?: string
  ): Promise<{ success: boolean; invitation?: MemberInvitation; error?: string; error_code?: string }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.createInvitation(data, effectiveTenantId, invitedBy);
  }

  async getInvitationById(id: string, tenantId?: string): Promise<MemberInvitation | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.getInvitationById(id, effectiveTenantId);
  }

  async getInvitationByToken(token: string): Promise<MemberInvitationWithMember | null> {
    return await this.memberInvitationRepository.getInvitationByToken(token);
  }

  async getInvitations(
    tenantId?: string,
    limit = 50,
    offset = 0,
    filters?: {
      status?: 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';
      member_id?: string;
      invited_by?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<MemberInvitationWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.getInvitations(effectiveTenantId, limit, offset, filters);
  }

  async acceptInvitation(
    token: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string; member_id?: string; tenant_id?: string }> {
    return await this.memberInvitationRepository.acceptInvitation(token, userId, ipAddress, userAgent);
  }

  async revokeInvitation(
    id: string,
    revokedBy: string,
    reason?: string,
    tenantId?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.revokeInvitation(id, effectiveTenantId, revokedBy, reason);
  }

  async resendInvitation(id: string, userId: string, tenantId?: string): Promise<MemberInvitation> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.resendInvitation(id, effectiveTenantId, userId);
  }

  async bulkCreateInvitations(
    request: BulkInvitationRequest,
    invitedBy: string,
    tenantId?: string
  ): Promise<BulkInvitationResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.bulkCreateInvitations(request, effectiveTenantId, invitedBy);
  }

  async getInvitationStats(tenantId?: string): Promise<InvitationStats> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.getInvitationStats(effectiveTenantId);
  }

  async markExpiredInvitations(tenantId?: string): Promise<number> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.markExpiredInvitations(effectiveTenantId);
  }

  async getPendingInvitations(tenantId?: string, limit = 50): Promise<MemberInvitationWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.getPendingInvitations(effectiveTenantId, limit);
  }

  async sendReminder(id: string, tenantId?: string): Promise<MemberInvitation> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.memberInvitationRepository.sendReminder(id, effectiveTenantId);
  }

  // Combined operations and utilities

  async validateLinkingOperation(
    userId: string,
    memberId: string,
    tenantId?: string
  ): Promise<{
    isValid: boolean;
    conflicts: LinkingConflict[];
    warnings: string[];
    suggestions: string[];
  }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const conflicts = await this.detectLinkingConflicts(userId, memberId, effectiveTenantId);
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for email mismatches
    try {
      const [member, userLinkedMember] = await Promise.all([
        this.userMemberLinkRepository.getMemberByUserId(userId, effectiveTenantId),
        this.userMemberLinkRepository.getUserByMemberId(memberId, effectiveTenantId)
      ]);

      if (member && member.email && userLinkedMember && userLinkedMember.email) {
        if (member.email.toLowerCase() !== userLinkedMember.email.toLowerCase()) {
          warnings.push('Email addresses do not match between user and member profiles');
          suggestions.push('Verify that this is the correct member for this user');
        }
      }
    } catch (error) {
      // Ignore errors in validation checks
    }

    const isValid = conflicts.length === 0;

    if (conflicts.length > 0) {
      suggestions.push('Resolve conflicts before proceeding with the linking operation');
    }

    return {
      isValid,
      conflicts,
      warnings,
      suggestions
    };
  }

  async getDashboardStats(tenantId?: string): Promise<{
    linking: LinkingStats;
    invitations: InvitationStats;
    recent_activity: {
      recent_links: number;
      recent_invitations: number;
      pending_invitations: number;
      expiring_invitations: number;
    };
  }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const [linkingStats, invitationStats] = await Promise.all([
      this.getLinkingStats(effectiveTenantId),
      this.getInvitationStats(effectiveTenantId)
    ]);

    // Calculate expiring invitations (within 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const invitations = await this.getInvitations(effectiveTenantId, 1000, 0, {
      status: 'sent'
    });

    const expiringInvitations = invitations.filter(inv =>
      new Date(inv.expires_at) <= threeDaysFromNow
    ).length;

    return {
      linking: linkingStats,
      invitations: invitationStats,
      recent_activity: {
        recent_links: linkingStats.recent_links_count,
        recent_invitations: invitationStats.pending_invitations + invitationStats.sent_invitations,
        pending_invitations: invitationStats.pending_invitations,
        expiring_invitations: expiringInvitations
      }
    };
  }

  // Security and compliance methods

  async validateInvitationSecurity(
    memberIds: string[],
    tenantId?: string
  ): Promise<{
    isValid: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for members without email addresses
    const membersWithoutEmail = await this.searchMembers('', 'unlinked', effectiveTenantId);
    const invalidMembers = membersWithoutEmail.filter(m =>
      memberIds.includes(m.id) && !m.email
    );

    if (invalidMembers.length > 0) {
      violations.push(`${invalidMembers.length} members do not have email addresses`);
      recommendations.push('Add email addresses to member profiles before sending invitations');
    }

    // Check rate limits (max 50 invitations per hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentInvitations = await this.getInvitations(effectiveTenantId, 1000, 0, {
      date_from: oneHourAgo.toISOString()
    });

    if (recentInvitations.length + memberIds.length > 50) {
      violations.push('Rate limit exceeded: Maximum 50 invitations per hour');
      recommendations.push('Wait before sending additional invitations or reduce batch size');
    }

    return {
      isValid: violations.length === 0,
      violations,
      recommendations
    };
  }

  async generateLinkingReport(
    tenantId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    summary: LinkingStats & InvitationStats;
    audit_entries: LinkingAuditEntry[];
    recommendations: string[];
  }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const [linkingStats, invitationStats, auditEntries] = await Promise.all([
      this.getLinkingStats(effectiveTenantId),
      this.getInvitationStats(effectiveTenantId),
      this.getAuditTrail(effectiveTenantId, 100, 0, {
        date_from: dateFrom,
        date_to: dateTo
      })
    ]);

    const recommendations: string[] = [];

    // Generate recommendations based on statistics
    if (linkingStats.linking_percentage < 50) {
      recommendations.push('Consider implementing a member onboarding campaign to increase linking percentage');
    }

    if (invitationStats.acceptance_rate < 70) {
      recommendations.push('Review invitation email content and follow-up process to improve acceptance rates');
    }

    if (invitationStats.pending_invitations > 20) {
      recommendations.push('Follow up on pending invitations or consider resending them');
    }

    if (linkingStats.unlinked_users > linkingStats.unlinked_members) {
      recommendations.push('Some users may not have corresponding member profiles - review user registration process');
    }

    return {
      summary: { ...linkingStats, ...invitationStats },
      audit_entries: auditEntries,
      recommendations
    };
  }
}