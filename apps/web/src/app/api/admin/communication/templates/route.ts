import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import type { CommunicationService } from '@/services/communication/CommunicationService';
import type { CreateTemplateDto, UpdateTemplateDto } from '@/models/communication/template.model';

/**
 * GET /api/admin/communication/templates
 *
 * Fetches all templates for the current tenant
 * @requires communication:view permission
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:view', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') || undefined;
    const channel = searchParams.get('channel') || undefined;
    const includeSystem = searchParams.get('includeSystem') !== 'false';

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);

    const templates = await communicationService.getTemplates(tenantId, {
      category: category as any,
      channel: channel as any,
      includeSystem,
    });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('[Communication API] Error fetching templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/communication/templates
 *
 * Creates a new template
 * @requires communication:manage permission
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:manage', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const body: CreateTemplateDto = await request.json();

    // Basic validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { success: false, error: 'Template category is required' },
        { status: 400 }
      );
    }

    if (!body.channels || body.channels.length === 0) {
      body.channels = ['email']; // Default to email
    }

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);
    const template = await communicationService.createTemplate(body, tenantId);

    return NextResponse.json(
      {
        success: true,
        data: template,
        id: template.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Communication API] Error creating template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/communication/templates
 *
 * Updates an existing template
 * @requires communication:manage permission
 */
export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:manage', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const body: UpdateTemplateDto & { id: string } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Basic validation
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Template name cannot be empty' },
        { status: 400 }
      );
    }

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);

    const { id, ...updateData } = body;
    const template = await communicationService.updateTemplate(id, updateData, tenantId);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[Communication API] Error updating template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template',
      },
      { status: 500 }
    );
  }
}
