/**
 * ================================================================================
 * DISCIPLESHIP PATHWAYS API ROUTE
 * ================================================================================
 *
 * API endpoints for managing discipleship pathways.
 * Supports quick-create from form fields and full CRUD operations.
 *
 * ENDPOINTS:
 *   GET  /api/admin/community/discipleship-pathways - List all pathways
 *   POST /api/admin/community/discipleship-pathways - Create new pathway
 *
 * AUTHORIZATION:
 *   Requires authenticated user with tenant context.
 *   Uses TenantService for multi-tenant data isolation.
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { DiscipleshipPathwayService } from '@/services/DiscipleshipPathwayService';
import type { TenantService } from '@/services/TenantService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/community/discipleship-pathways
 *
 * Returns all active discipleship pathways for the current tenant.
 * Used by forms to populate pathway dropdown options.
 */
export async function GET() {
  try {
    // Verify authentication
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pathwayService = container.get<DiscipleshipPathwayService>(TYPES.DiscipleshipPathwayService);
    const pathways = await pathwayService.getActivePathways();

    return NextResponse.json({
      success: true,
      data: pathways,
    });
  } catch (error) {
    console.error('[API] Error fetching discipleship pathways:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pathways' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/community/discipleship-pathways
 *
 * Creates a new discipleship pathway for the current tenant.
 * Used by quick-create dialog in the discipleship plan form.
 *
 * Request body:
 *   {
 *     name: string (required) - Display name
 *     code: string (required) - Unique code identifier
 *     description?: string    - Optional description
 *   }
 *
 * Response:
 *   {
 *     success: boolean,
 *     data: { id, name, code, ... },  // Created pathway
 *     option: { value, label }        // For immediate dropdown update
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, code, description } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Validate code format (lowercase with underscores)
    const codePattern = /^[a-z][a-z0-9_]*$/;
    if (!codePattern.test(code)) {
      return NextResponse.json(
        { error: 'Code must start with a letter and contain only lowercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    const pathwayService = container.get<DiscipleshipPathwayService>(TYPES.DiscipleshipPathwayService);

    // Check for duplicate code
    const existing = await pathwayService.getPathwayByCode(code);
    if (existing) {
      return NextResponse.json(
        { error: `A pathway with code '${code}' already exists` },
        { status: 409 }
      );
    }

    // Get current max display_order to append at end
    const pathways = await pathwayService.getActivePathways();
    const maxOrder = pathways.reduce((max, p) => Math.max(max, p.display_order || 0), 0);

    // Create the pathway
    const pathway = await pathwayService.createPathway({
      name,
      code,
      description: description || null,
      display_order: maxOrder + 1,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      data: pathway,
      // Return option format for immediate dropdown update
      option: {
        value: pathway.code,
        label: pathway.name,
      },
    });
  } catch (error) {
    console.error('[API] Error creating discipleship pathway:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pathway' },
      { status: 500 }
    );
  }
}
