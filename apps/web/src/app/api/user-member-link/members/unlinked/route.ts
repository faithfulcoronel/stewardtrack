import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function GET() {
  try {
    console.log('[API /user-member-link/members/unlinked] Starting request');

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    console.log('[API /user-member-link/members/unlinked] Calling searchMembers service');
    const members = await userMemberLinkService.searchMembers('', 'unlinked');

    console.log(`[API /user-member-link/members/unlinked] Service returned ${members.length} members`);
    if (members.length > 0) {
      console.log('[API /user-member-link/members/unlinked] First member from service:', {
        id: members[0].id,
        email: members[0].email,
        email_length: members[0].email?.length,
        first_name: members[0].first_name,
        last_name: members[0].last_name
      });
    }

    const transformedMembers = members.map(member => ({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      is_linked: member.is_linked,
      user_id: null,
      user_email: null
    }));

    console.log(`[API /user-member-link/members/unlinked] Transformed ${transformedMembers.length} members`);
    if (transformedMembers.length > 0) {
      console.log('[API /user-member-link/members/unlinked] First transformed member (sending to client):', {
        id: transformedMembers[0].id,
        email: transformedMembers[0].email,
        first_name: transformedMembers[0].first_name,
        last_name: transformedMembers[0].last_name
      });
    }

    return NextResponse.json({ success: true, data: transformedMembers });

  } catch (error) {
    console.error('[API /user-member-link/members/unlinked] Error fetching unlinked members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}