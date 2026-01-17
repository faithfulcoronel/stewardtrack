/**
 * POST /api/members/me/profile-photo
 *
 * Uploads a profile photo for the current user's member profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must be less than 5MB' },
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

    // Delete old profile photo if exists
    if (member.profile_picture_url) {
      try {
        const url = new URL(member.profile_picture_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/profiles\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from('profiles').remove([pathMatch[1]]);
        }
      } catch (deleteError) {
        console.error('Error deleting old profile photo:', deleteError);
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${tenantId}/${member.id}/avatar-${Date.now()}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Update member record
    const { error: updateError } = await supabase
      .from('members')
      .update({ profile_picture_url: publicUrl })
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
      url: publicUrl,
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload profile photo' },
      { status: 500 }
    );
  }
}
