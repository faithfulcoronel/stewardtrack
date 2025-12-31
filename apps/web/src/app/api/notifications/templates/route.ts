import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationTemplateRepository } from '@/repositories/notificationTemplate.repository';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { CreateNotificationTemplateDto } from '@/models/notification/notificationTemplate.model';

export async function GET() {
  try {
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

    // Get tenant-specific templates
    const tenantTemplates = await templateRepo.getTenantTemplates(tenantId);

    // Get system templates
    const systemTemplates = await templateRepo.getSystemTemplates();

    // Deduplicate: tenant templates override system templates with same event_type+channel
    // Use Map with id as key to ensure unique templates
    const templateMap = new Map<string, typeof tenantTemplates[0]>();

    // Add system templates first (lower priority)
    for (const template of systemTemplates) {
      templateMap.set(template.id, template);
    }

    // Add tenant templates (higher priority - overwrites system if same ID)
    for (const template of tenantTemplates) {
      templateMap.set(template.id, template);
    }

    // Convert to array and sort
    const allTemplates = Array.from(templateMap.values()).sort((a, b) => {
      // Sort by event_type, then by channel
      const typeCompare = a.event_type.localeCompare(b.event_type);
      if (typeCompare !== 0) return typeCompare;
      return a.channel.localeCompare(b.channel);
    });

    return NextResponse.json({
      success: true,
      data: allTemplates,
    });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();

    // Validate required fields
    if (!body.event_type || !body.channel || !body.name || !body.body_template) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: event_type, channel, name, body_template' },
        { status: 400 }
      );
    }

    // Validate channel
    const validChannels = ['in_app', 'email', 'sms', 'push', 'webhook'];
    if (!validChannels.includes(body.channel)) {
      return NextResponse.json(
        { success: false, error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      );
    }

    const dto: CreateNotificationTemplateDto = {
      event_type: body.event_type,
      channel: body.channel,
      name: body.name,
      subject: body.subject,
      title_template: body.title_template,
      body_template: body.body_template,
      variables: body.variables || [],
    };

    const template = await templateRepo.createTemplate(tenantId, dto);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error creating notification template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification template' },
      { status: 500 }
    );
  }
}
