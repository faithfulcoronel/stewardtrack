import { NextRequest, NextResponse } from 'next/server';
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

/**
 * POST /api/licensing/features
 * Create a new feature in the catalog
 */
export async function POST(request: NextRequest) {
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
        { success: false, error: 'Access denied. Only super admins can create features.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Feature name is required' },
        { status: 400 }
      );
    }

    if (!body.tier) {
      return NextResponse.json(
        { success: false, error: 'License tier is required' },
        { status: 400 }
      );
    }

    // Create feature
    const { data: feature, error } = await supabase
      .from('feature_catalog')
      .insert({
        code: body.code || body.name.toLowerCase().replace(/\s+/g, '_'),
        name: body.name,
        description: body.description,
        tier: body.tier,
        category: body.category,
        surface_id: body.surface_id,
        surface_type: body.surface_type,
        module: body.module,
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feature:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create feature' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: feature,
        message: 'Feature created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create feature',
      },
      { status: 500 }
    );
  }
}
