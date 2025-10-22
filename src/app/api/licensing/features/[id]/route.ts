import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authUtils } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/features/[id]
 * Get a single feature by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Get feature from catalog
    const { data: feature, error } = await supabase
      .from('feature_catalog')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching feature:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Feature not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to fetch feature' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    console.error('Error fetching feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch feature',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/licensing/features/[id]
 * Delete a feature
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        { success: false, error: 'Access denied. Only super admins can delete features.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Delete feature (will cascade to permissions and templates via database constraints)
    const { error } = await supabase
      .from('feature_catalog')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting feature:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete feature' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feature deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete feature',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/licensing/features/[id]
 * Update a feature
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
        { success: false, error: 'Access denied. Only super admins can update features.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Update feature
    const { data: feature, error } = await supabase
      .from('feature_catalog')
      .update({
        name: body.name,
        description: body.description,
        tier: body.tier,
        category: body.category,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating feature:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update feature' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feature,
      message: 'Feature updated successfully',
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update feature',
      },
      { status: 500 }
    );
  }
}
