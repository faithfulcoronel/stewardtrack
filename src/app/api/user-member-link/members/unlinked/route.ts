import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function GET() {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const members = await userMemberLinkService.searchMembers('', 'unlinked');

    const transformedMembers = members.map(member => ({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      is_linked: member.is_linked,
      user_id: null,
      user_email: null
    }));

    return NextResponse.json({ success: true, data: transformedMembers });

  } catch (error) {
    console.error('Error fetching unlinked members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}