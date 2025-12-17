import { injectable, inject } from 'inversify';
import type { IMemberRepository } from '@/repositories/member.repository';
import type { IMemberInvitationAdapter } from '@/adapters/memberInvitation.adapter';
import { BaseRepository } from '@/repositories/base.repository';
import { TYPES } from '@/lib/types';
import {
  MemberInvitation,
  MemberInvitationWithMember,
  CreateMemberInvitationDto,
  UpdateMemberInvitationDto,
  InvitationStats,
  BulkInvitationRequest,
  BulkInvitationResult,
  EmailDeliveryStatus,
  MemberInvitationStatus
} from '@/models/memberInvitation.model';

export interface IMemberInvitationRepository extends BaseRepository<MemberInvitation> {
  createInvitation(
    data: CreateMemberInvitationDto,
    tenantId: string,
    invitedBy: string
  ): Promise<{ success: boolean; invitation?: MemberInvitation; error?: string; error_code?: string }>;

  getInvitationById(id: string, tenantId: string): Promise<MemberInvitation | null>;

  getInvitationByToken(token: string): Promise<MemberInvitationWithMember | null>;

  getInvitations(
    tenantId: string,
    limit?: number,
    offset?: number,
    filters?: {
      status?: MemberInvitationStatus;
      member_id?: string;
      invited_by?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<MemberInvitationWithMember[]>;

  updateInvitation(
    id: string,
    data: UpdateMemberInvitationDto,
    tenantId: string,
    updatedBy: string
  ): Promise<MemberInvitation>;

  acceptInvitation(
    token: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string; member_id?: string; tenant_id?: string }>;

  revokeInvitation(
    id: string,
    tenantId: string,
    revokedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string }>;

  resendInvitation(id: string, tenantId: string, userId: string): Promise<MemberInvitation>;

  bulkCreateInvitations(
    request: BulkInvitationRequest,
    tenantId: string,
    invitedBy: string
  ): Promise<BulkInvitationResult>;

  getInvitationStats(tenantId: string): Promise<InvitationStats>;

  markExpiredInvitations(tenantId: string): Promise<number>;

  updateEmailDeliveryStatus(invitationId: string, status: EmailDeliveryStatus): Promise<void>;

  getPendingInvitations(tenantId: string, limit?: number): Promise<MemberInvitationWithMember[]>;

  sendReminder(id: string, tenantId: string): Promise<MemberInvitation>;
}

@injectable()
export class MemberInvitationRepository
  extends BaseRepository<MemberInvitation>
  implements IMemberInvitationRepository
{
  constructor(
    @inject(TYPES.IMemberInvitationAdapter) private readonly invitationAdapter: IMemberInvitationAdapter,
    @inject(TYPES.IMemberRepository) private readonly memberRepository: IMemberRepository
  ) {
    super(invitationAdapter);
  }

  async createInvitation(
    data: CreateMemberInvitationDto,
    tenantId: string,
    invitedBy: string
  ): Promise<{ success: boolean; invitation?: MemberInvitation; error?: string; error_code?: string }> {
    return await this.invitationAdapter.createInvitation(data, tenantId, invitedBy);
  }

  async getInvitationById(id: string, _tenantId: string): Promise<MemberInvitation | null> {
    return await this.invitationAdapter.fetchById(id);
  }

  async getInvitationByToken(token: string): Promise<MemberInvitationWithMember | null> {
    return await this.invitationAdapter.getInvitationByToken(token);
  }

  async getInvitations(
    tenantId: string,
    limit = 50,
    offset = 0,
    filters?: {
      status?: MemberInvitationStatus;
      member_id?: string;
      invited_by?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<MemberInvitationWithMember[]> {
    return await this.invitationAdapter.getInvitations(tenantId, limit, offset, filters);
  }

  async updateInvitation(
    id: string,
    data: UpdateMemberInvitationDto,
    tenantId: string,
    updatedBy: string
  ): Promise<MemberInvitation> {
    const updated = await this.invitationAdapter.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy
    } as Partial<MemberInvitation>);

    return updated;
  }

  async acceptInvitation(
    token: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string; member_id?: string; tenant_id?: string }> {
    return await this.invitationAdapter.acceptInvitation(token, userId, ipAddress, userAgent);
  }

  async revokeInvitation(
    id: string,
    _tenantId: string,
    revokedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string }> {
    return await this.invitationAdapter.revokeInvitation(id, revokedBy, reason);
  }

  async resendInvitation(id: string, tenantId: string, userId: string): Promise<MemberInvitation> {
    return await this.invitationAdapter.resendInvitation(id, tenantId, userId);
  }

  async bulkCreateInvitations(
    request: BulkInvitationRequest,
    tenantId: string,
    invitedBy: string
  ): Promise<BulkInvitationResult> {
    const successful_invitations: string[] = [];
    const failed_invitations: BulkInvitationResult['failed_invitations'] = [];

    for (const memberId of request.member_ids) {
      try {
        // Get member email using MemberRepository (handles decryption automatically)
        const member = await this.memberRepository.findById(memberId);

        if (!member?.email) {
          failed_invitations.push({
            member_id: memberId,
            error: 'Member has no email address',
            error_code: 'NO_EMAIL'
          });
          continue;
        }

        const result = await this.createInvitation(
          {
            member_id: memberId,
            email: member.email,
            invitation_type: request.invitation_type,
            expires_in_days: request.expires_in_days,
            notes: request.notes
          },
          tenantId,
          invitedBy
        );

        if (result.success) {
          successful_invitations.push(memberId);
        } else {
          failed_invitations.push({
            member_id: memberId,
            error: result.error || 'Unknown error',
            error_code: result.error_code || 'UNKNOWN_ERROR'
          });
        }
      } catch (error) {
        failed_invitations.push({
          member_id: memberId,
          error: error instanceof Error ? error.message : 'Unknown error',
          error_code: 'EXCEPTION'
        });
      }
    }

    return {
      successful_invitations,
      failed_invitations,
      total_processed: request.member_ids.length,
      success_count: successful_invitations.length,
      failure_count: failed_invitations.length
    };
  }

  async getInvitationStats(tenantId: string): Promise<InvitationStats> {
    return await this.invitationAdapter.getInvitationStats(tenantId);
  }

  async markExpiredInvitations(tenantId: string): Promise<number> {
    return await this.invitationAdapter.markExpiredInvitations(tenantId);
  }

  async updateEmailDeliveryStatus(
    invitationId: string,
    status: EmailDeliveryStatus
  ): Promise<void> {
    return await this.invitationAdapter.updateEmailDeliveryStatus(invitationId, status);
  }

  async getPendingInvitations(tenantId: string, limit = 50): Promise<MemberInvitationWithMember[]> {
    return this.getInvitations(tenantId, limit, 0, { status: 'pending' });
  }

  async sendReminder(id: string, tenantId: string): Promise<MemberInvitation> {
    return await this.invitationAdapter.sendReminder(id, tenantId);
  }
}
