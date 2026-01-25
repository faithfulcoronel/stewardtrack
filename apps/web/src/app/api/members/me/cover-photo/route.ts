/**
 * POST /api/members/me/cover-photo
 *
 * Uploads a cover photo for the current user's member profile.
 * Stores the image in Supabase Storage and updates the member record.
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
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    // Get the uploaded file
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
      .select('id, cover_photo_url')
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

    // Delete old cover photo if exists
    if (member.cover_photo_url) {
      try {
        await storageService.deleteMemberPhoto(member.cover_photo_url);
      } catch (deleteError) {
        console.error('Error deleting old cover photo:', deleteError);
        // Continue anyway
      }
    }

    // Upload new photo using storage service (tracks upload automatically)
    const uploadResult = await storageService.uploadMemberPhoto(tenantId, member.id, file);

    // Update member record with new cover photo URL
    const { error: updateError } = await supabase
      .from('members')
      .update({ cover_photo_url: uploadResult.publicUrl })
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
    console.error('Error uploading cover photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload cover photo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/members/me/cover-photo
 *
 * Removes the cover photo from the current user's member profile.
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
      .select('id, cover_photo_url')
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
    if (member.cover_photo_url) {
      try {
        const storageService = container.get<StorageService>(TYPES.StorageService);
        await storageService.deleteMemberPhoto(member.cover_photo_url);
      } catch (deleteError) {
        console.error('Error deleting cover photo from storage:', deleteError);
      }
    }

    // Clear cover photo URL from member record
    const { error: updateError } = await supabase
      .from('members')
      .update({ cover_photo_url: null })
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
      message: 'Cover photo removed',
    });
  } catch (error) {
    console.error('Error removing cover photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove cover photo' },
      { status: 500 }
    );
  }
}
