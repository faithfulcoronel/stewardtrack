/**
 * POST /api/members/me/profile-photo
 *
 * Uploads a profile photo for the current user's member profile.
 * Stores the image in Supabase Storage and updates the member record.
 * File size and metadata are tracked in the tenant_media table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { StorageService } from '@/services/StorageService';

export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the member linked to this user
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, profile_picture_url')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member profile not found' },
        { status: 404 }
      );
    }

    // Get storage service from container
    const storageService = container.get<StorageService>(TYPES.StorageService);

    // Delete old profile photo if exists
    if (member.profile_picture_url) {
      try {
        await storageService.deleteMemberPhoto(member.profile_picture_url);
      } catch (deleteError) {
        console.error('Error deleting old profile photo:', deleteError);
        // Continue anyway
      }
    }

    // Upload new photo using storage service (tracks upload automatically with file size)
    const uploadResult = await storageService.uploadMemberPhoto(tenantId, member.id, file);

    // Update member record with new profile photo URL
    const { error: updateError } = await supabase
      .from('members')
      .update({ profile_picture_url: uploadResult.publicUrl })
      .eq('id', member.id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.publicUrl,
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);

    const message = error instanceof Error ? error.message : 'Failed to upload profile photo';

    // Return user-friendly error messages for validation errors
    if (message.includes('Invalid file type') || message.includes('File too large')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/members/me/profile-photo
 *
 * Removes the profile photo from the current user's member profile.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Get the member linked to this user
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, profile_picture_url')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member profile not found' },
        { status: 404 }
      );
    }

    // Delete from storage if exists
    if (member.profile_picture_url) {
      try {
        const storageService = container.get<StorageService>(TYPES.StorageService);
        await storageService.deleteMemberPhoto(member.profile_picture_url);
      } catch (deleteError) {
        console.error('Error deleting profile photo from storage:', deleteError);
      }
    }

    // Clear profile photo URL from member record
    const { error: updateError } = await supabase
      .from('members')
      .update({ profile_picture_url: null })
      .eq('id', member.id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo removed',
    });
  } catch (error) {
    console.error('Error removing profile photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove profile photo' },
      { status: 500 }
    );
  }
}
