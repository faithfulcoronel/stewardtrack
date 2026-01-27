import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type {
  Template,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateCategory,
} from '@/models/communication/template.model';

/**
 * ITemplateAdapter - Database adapter interface for communication templates
 *
 * This adapter handles direct database operations for message templates in the communication module.
 * Implements tenant-scoped queries and audit logging for all state changes.
 *
 * @module communication.core
 *
 * Permission Requirements (enforced at API route level via PermissionGate):
 * - View operations (getTemplates, getTemplateById, getTemplatesByCategory): `communication:view`
 * - Manage operations (createTemplate, updateTemplate, incrementUsageCount): `communication:manage`
 * - Delete operations (deleteTemplate): `communication:delete`
 *
 * @see {@link PermissionGate} for permission enforcement
 * @see {@link TemplateRepository} for the repository layer
 */
export type ITemplateAdapter = IBaseAdapter<Template> & {
  createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template>;
  updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template>;
  deleteTemplate(id: string, tenantId: string): Promise<void>;
  getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]>;
  getTemplateById(id: string, tenantId: string): Promise<Template | null>;
  getTemplatesByCategory(tenantId: string, category: TemplateCategory): Promise<Template[]>;
  incrementUsageCount(id: string): Promise<void>;
};

export interface TemplateFilters {
  category?: TemplateCategory;
  channel?: string;
  isSystem?: boolean;
  isAiGenerated?: boolean;
  search?: string;
}

@injectable()
export class TemplateAdapter extends BaseAdapter<Template> implements ITemplateAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'communication_templates';
  protected defaultSelect = `
    id, tenant_id, name, description, category, channels, subject,
    content_html, content_text, variables, is_system, is_ai_generated,
    ai_prompt, usage_count, created_by, created_at, updated_at, deleted_at
  `;

  protected override async onAfterCreate(data: Template): Promise<void> {
    await this.auditService.logAuditEvent('create', 'communication_template', data.id, data);
  }

  protected override async onAfterUpdate(data: Template): Promise<void> {
    await this.auditService.logAuditEvent('update', 'communication_template', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'communication_template', id, { id });
  }

  async createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        channels: data.channels,
        subject: data.subject ?? null,
        content_html: data.content_html ?? null,
        content_text: data.content_text ?? null,
        variables: data.variables ?? [],
        is_system: false,
        is_ai_generated: data.is_ai_generated ?? false,
        ai_prompt: data.ai_prompt ?? null,
        usage_count: 0,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create template: missing response payload');
    }

    const template = this.enrichTemplate(result);
    await this.onAfterCreate(template);
    return template;
  }

  async updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const updateData: Record<string, unknown> = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.channels !== undefined) updateData.channels = data.channels;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.content_html !== undefined) updateData.content_html = data.content_html;
    if (data.content_text !== undefined) updateData.content_text = data.content_text;
    if (data.variables !== undefined) updateData.variables = data.variables;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_system', false) // Cannot update system templates
      .is('deleted_at', null)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update template: record not found or is system template');
    }

    const template = this.enrichTemplate(result);
    await this.onAfterUpdate(template);
    return template;
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_system', false); // Cannot delete system templates

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    await this.onAfterDelete(id);
  }

  async getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.channel) {
      query = query.contains('channels', [filters.channel]);
    }

    if (filters?.isSystem !== undefined) {
      query = query.eq('is_system', filters.isSystem);
    }

    if (filters?.isAiGenerated !== undefined) {
      query = query.eq('is_ai_generated', filters.isAiGenerated);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return this.enrichTemplateList(data || []);
  }

  async getTemplateById(id: string, tenantId: string): Promise<Template | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    return this.enrichTemplate(data);
  }

  async getTemplatesByCategory(tenantId: string, category: TemplateCategory): Promise<Template[]> {
    return this.getTemplates(tenantId, { category });
  }

  async incrementUsageCount(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase.rpc('increment_template_usage', { template_id: id });

    // If RPC doesn't exist, fall back to manual increment
    if (error) {
      const { data: current } = await supabase
        .from(this.tableName)
        .select('usage_count')
        .eq('id', id)
        .single();

      if (current) {
        await supabase
          .from(this.tableName)
          .update({ usage_count: ((current as { usage_count: number }).usage_count || 0) + 1 })
          .eq('id', id);
      }
    }
  }

  private enrichTemplate(data: unknown): Template {
    const row = data as Record<string, unknown>;
    return {
      ...row,
      channels: (row.channels as string[]) || ['email'],
      variables: (row.variables as Template['variables']) || [],
      is_system: row.is_system as boolean ?? false,
      is_ai_generated: row.is_ai_generated as boolean ?? false,
      usage_count: row.usage_count as number ?? 0,
    } as Template;
  }

  private enrichTemplateList(data: unknown[]): Template[] {
    return data.map((row) => this.enrichTemplate(row));
  }
}
