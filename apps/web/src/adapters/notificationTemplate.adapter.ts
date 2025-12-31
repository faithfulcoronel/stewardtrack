import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  RenderedTemplate,
  TemplateLookupKey,
} from '@/models/notification/notificationTemplate.model';

export interface INotificationTemplateAdapter extends IBaseAdapter<NotificationTemplate> {
  /**
   * Get a template by event type and channel, preferring tenant-specific over system
   */
  getTemplate(lookup: TemplateLookupKey): Promise<NotificationTemplate | null>;

  /**
   * Get all templates for a tenant (includes system templates)
   */
  getTenantTemplates(tenantId: string): Promise<NotificationTemplate[]>;

  /**
   * Get all system templates
   */
  getSystemTemplates(): Promise<NotificationTemplate[]>;

  /**
   * Create a tenant-specific template
   */
  createTemplate(
    tenantId: string,
    dto: CreateNotificationTemplateDto
  ): Promise<NotificationTemplate>;

  /**
   * Update a template
   */
  updateTemplate(id: string, dto: UpdateNotificationTemplateDto): Promise<NotificationTemplate>;

  /**
   * Render a template with variables
   */
  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, unknown>
  ): RenderedTemplate;
}

@injectable()
export class NotificationTemplateAdapter
  extends BaseAdapter<NotificationTemplate>
  implements INotificationTemplateAdapter
{
  protected tableName = 'notification_templates';

  protected defaultSelect = `
    id,
    tenant_id,
    event_type,
    channel,
    name,
    subject,
    title_template,
    body_template,
    is_active,
    is_system,
    variables,
    created_at,
    updated_at,
    created_by,
    updated_by
  `;

  async getTemplate(lookup: TemplateLookupKey): Promise<NotificationTemplate | null> {
    const supabase = await this.getSupabaseClient();

    // First try tenant-specific template
    if (lookup.tenantId) {
      const { data: tenantTemplate, error: tenantError } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('event_type', lookup.eventType)
        .eq('channel', lookup.channel)
        .eq('tenant_id', lookup.tenantId)
        .eq('is_active', true)
        .maybeSingle();

      if (tenantError) throw tenantError;
      if (tenantTemplate) return tenantTemplate as unknown as NotificationTemplate;
    }

    // Fall back to system template
    const { data: systemTemplate, error: systemError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('event_type', lookup.eventType)
      .eq('channel', lookup.channel)
      .is('tenant_id', null)
      .eq('is_active', true)
      .maybeSingle();

    if (systemError) throw systemError;
    return systemTemplate as unknown as NotificationTemplate | null;
  }

  async getTenantTemplates(tenantId: string): Promise<NotificationTemplate[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('event_type')
      .order('channel');

    if (error) throw error;
    return (data ?? []) as unknown as NotificationTemplate[];
  }

  async getSystemTemplates(): Promise<NotificationTemplate[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .is('tenant_id', null)
      .eq('is_system', true)
      .order('event_type')
      .order('channel');

    if (error) throw error;
    return (data ?? []) as unknown as NotificationTemplate[];
  }

  async createTemplate(
    tenantId: string,
    dto: CreateNotificationTemplateDto
  ): Promise<NotificationTemplate> {
    const supabase = await this.getSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        event_type: dto.event_type,
        channel: dto.channel,
        name: dto.name,
        subject: dto.subject,
        title_template: dto.title_template,
        body_template: dto.body_template,
        is_active: true,
        is_system: false,
        variables: dto.variables ?? [],
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select(this.defaultSelect)
      .single();

    if (error) throw error;
    return data as unknown as NotificationTemplate;
  }

  async updateTemplate(
    id: string,
    dto: UpdateNotificationTemplateDto
  ): Promise<NotificationTemplate> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.title_template !== undefined) updateData.title_template = dto.title_template;
    if (dto.body_template !== undefined) updateData.body_template = dto.body_template;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.variables !== undefined) updateData.variables = dto.variables;

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('is_system', false) // Prevent updating system templates
      .select(this.defaultSelect)
      .single();

    if (error) throw error;
    return data as unknown as NotificationTemplate;
  }

  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, unknown>
  ): RenderedTemplate {
    const render = (text: string | undefined | null): string => {
      if (!text) return '';

      return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        const value = variables[trimmedKey];

        if (value === undefined || value === null) {
          // Check for nested path like "user.name"
          const parts = trimmedKey.split('.');
          let current: unknown = variables;

          for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
              current = (current as Record<string, unknown>)[part];
            } else {
              return match; // Keep original if not found
            }
          }

          return String(current ?? match);
        }

        return String(value);
      });
    };

    return {
      subject: render(template.subject),
      title: render(template.title_template),
      body: render(template.body_template),
    };
  }
}
