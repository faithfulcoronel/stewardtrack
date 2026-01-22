import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { decodeTeamInviteToken } from '@/lib/tokens/shortUrlTokens';

/**
 * POST /api/team-invite/accept
 *
 * Accepts a team invite link and adds the authenticated user to the tenant.
 * Requires authentication - the user must be logged in.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, inviteToken } = body;

    if (!tenantId || !inviteToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Decode and validate the token
    const decoded = decodeTeamInviteToken(inviteToken);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid invite token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (Date.now() >= decoded.expiresAt) {
      return NextResponse.json(
        { error: 'This invite link has expired' },
        { status: 400 }
      );
    }

    // Verify tenant ID matches
    if (decoded.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Invalid invite token for this organization' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to accept this invitation' },
        { status: 401 }
      );
    }

    // Check if user is already a member of this tenant
    const { data: existingMembership } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      );
    }

    // Add user to tenant
    const { error: tenantUserError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
      });

    if (tenantUserError) {
      console.error('Error adding user to tenant:', tenantUserError);
      return NextResponse.json(
        { error: 'Failed to join the team' },
        { status: 500 }
      );
    }

    // Find the "member" role for this tenant
    const { data: memberRole } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .or('metadata_key.eq.role_member,name.ilike.%member%')
      .limit(1)
      .single();

    if (memberRole) {
      // Assign the member role to the user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role_id: memberRole.id,
          tenant_id: tenantId,
        });

      if (roleError) {
        console.error('Error assigning member role:', roleError);
        // Don't fail the request - user is already added to tenant
      }
    }

    // Create or link member record
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', user.email)
      .single();

    if (!existingMember) {
      // Create a new member record
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          tenant_id: tenantId,
          email: user.email,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          user_id: user.id,
          status: 'active',
        });

      if (memberError) {
        console.error('Error creating member record:', memberError);
        // Don't fail the request - user is already added to tenant
      }
    } else {
      // Link existing member to user if not already linked
      const { error: linkError } = await supabase
        .from('members')
        .update({ user_id: user.id })
        .eq('id', existingMember.id)
        .is('user_id', null);

      if (linkError) {
        console.error('Error linking member to user:', linkError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the team',
    });
  } catch (error) {
    console.error('Error accepting team invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
