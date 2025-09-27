import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function GET() {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const invitations = await userMemberLinkService.getInvitations();

    const transformedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      member_id: invitation.member_id,
      member_name: invitation.member ? `${invitation.member.first_name} ${invitation.member.last_name}` : '',
      member_email: invitation.email,
      status: invitation.status,
      invited_by: invitation.invited_by_user?.email || 'System',
      invited_at: invitation.invited_at,
      expires_at: invitation.expires_at,
      accepted_at: invitation.accepted_at,
      token: invitation.token
    }));

    return NextResponse.json({ success: true, data: transformedInvitations });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const body = await request.json();

    const { member_id, expires_in_days = 7, message } = body;

    if (!member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }

    const invitationData = {
      member_id,
      email: '', // Will be filled by service from member data
      invitation_type: 'email' as const,
      expires_in_days,
      notes: message
    };

    const result = await userMemberLinkService.createMemberInvitation(
      invitationData,
      'system' // TODO: Get from authentication layer
    );

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Failed to create invitation'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitation_id: result.invitation?.id,
      token: result.invitation?.token,
      message: 'Invitation created successfully'
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}