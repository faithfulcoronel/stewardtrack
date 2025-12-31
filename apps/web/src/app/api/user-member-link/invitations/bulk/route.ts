import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function POST(request: Request) {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const body = await request.json();

    const { member_ids, expires_in_days = 7, message } = body;

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json({ error: 'member_ids array is required' }, { status: 400 });
    }

    const bulkRequest = {
      member_ids,
      invitation_type: 'email' as const,
      expires_in_days,
      notes: message
    };

    const result = await userMemberLinkService.bulkCreateInvitations(
      bulkRequest,
      'system' // TODO: Get from authentication layer
    );

    return NextResponse.json({
      success: true,
      message: `Bulk invitation process completed`,
      results: {
        total_requested: member_ids.length,
        successful: result.success_count,
        failed: result.failure_count,
        skipped: 0, // Service handles validation internally
        details: {
          successful: result.successful_invitations.map(inv => ({
            member: {
              id: inv,
              name: '', // Service doesn't return member names
              email: ''
            },
            invitation_id: inv,
            token: ''
          })),
          failed: result.failed_invitations.map(fail => ({
            member: {
              id: fail.member_id,
              name: '',
              email: ''
            },
            error: fail.error
          })),
          skipped: {
            already_linked: [],
            no_email: []
          }
        }
      }
    });

  } catch (error) {
    console.error('Error creating bulk invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}