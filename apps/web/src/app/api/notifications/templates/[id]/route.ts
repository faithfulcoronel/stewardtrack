import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationTemplateRepository } from '@/repositories/notificationTemplate.repository';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { UpdateNotificationTemplateDto } from '@/models/notification/notificationTemplate.model';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const templateRepo = container.get<INotificationTemplateRepository>(TYPES.INotificationTemplateRepository);

    // Check authentication
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = await templateRepo.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const templateRepo = container.get<INotificationTemplateRepository>(TYPES.INotificationTemplateRepository);

    // Check authentication
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }

    // Check template exists and belongs to tenant
    const existingTemplate = await templateRepo.findById(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Cannot edit system templates
    if (existingTemplate.is_system) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit system templates. Create a custom template instead.' },
        { status: 403 }
      );
    }

    // Ensure template belongs to this tenant
    if (existingTemplate.tenant_id !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const dto: UpdateNotificationTemplateDto = {};
    if (body.name !== undefined) dto.name = body.name;
    if (body.subject !== undefined) dto.subject = body.subject;
    if (body.title_template !== undefined) dto.title_template = body.title_template;
    if (body.body_template !== undefined) dto.body_template = body.body_template;
    if (body.is_active !== undefined) dto.is_active = body.is_active;
    if (body.variables !== undefined) dto.variables = body.variables;

    const template = await templateRepo.updateTemplate(id, dto);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const templateRepo = container.get<INotificationTemplateRepository>(TYPES.INotificationTemplateRepository);

    // Check authentication
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }

    // Check template exists and belongs to tenant
    const existingTemplate = await templateRepo.findById(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Cannot delete system templates
    if (existingTemplate.is_system) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system templates' },
        { status: 403 }
      );
    }

    // Ensure template belongs to this tenant
    if (existingTemplate.tenant_id !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    await templateRepo.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
