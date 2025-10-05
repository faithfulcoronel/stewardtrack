import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authUtils } from '@/utils/authUtils';

/**
 * GET /api/licensing/features
 * Gets all available features from the feature catalog
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await authUtils.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's admin role
    const { data: adminRole } = await supabase.rpc('get_user_admin_role');

    if (adminRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only super admins can view features.' },
        { status: 403 }
      );
    }

    // Get all active features from the catalog
    const { data: features, error } = await supabase
      .from('feature_catalog')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching features:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch features' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: features,
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch features',
      },
      { status: 500 }
    );
  }
}
