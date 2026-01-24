import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ITemplateRepository } from '@/repositories/communication/template.repository';
import type { TemplateFilters } from '@/adapters/communication/template.adapter';
import type {
  Template,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateCategory,
  TemplatesByCategory,
} from '@/models/communication/template.model';

export interface TemplateService {
  createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template>;
  updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template>;
  deleteTemplate(id: string, tenantId: string): Promise<void>;
  getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]>;
  getTemplateById(id: string, tenantId: string): Promise<Template | null>;
  getTemplatesByCategory(tenantId: string, category: TemplateCategory): Promise<Template[]>;
  getTemplatesGroupedByCategory(tenantId: string): Promise<TemplatesByCategory[]>;
  duplicateTemplate(id: string, tenantId: string, newName?: string): Promise<Template>;
  applyTemplateVariables(templateId: string, tenantId: string, variables: Record<string, string>): Promise<{ subject: string; contentHtml: string; contentText: string }>;
}

@injectable()
export class SupabaseTemplateService implements TemplateService {
  constructor(
    @inject(TYPES.ITemplateRepository) private templateRepo: ITemplateRepository
  ) {}

  async createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template> {
    return await this.templateRepo.createTemplate(data, tenantId);
  }

  async updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template> {
    const existing = await this.templateRepo.getTemplateById(id, tenantId);
    if (!existing) {
      throw new Error('Template not found');
    }

    if (existing.is_system) {
      throw new Error('Cannot update system templates');
    }

    return await this.templateRepo.updateTemplate(id, data, tenantId);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    const existing = await this.templateRepo.getTemplateById(id, tenantId);
    if (!existing) {
      throw new Error('Template not found');
    }

    if (existing.is_system) {
      throw new Error('Cannot delete system templates');
    }

    await this.templateRepo.deleteTemplate(id, tenantId);
  }

  async getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]> {
    return await this.templateRepo.getTemplates(tenantId, filters);
  }

  async getTemplateById(id: string, tenantId: string): Promise<Template | null> {
    return await this.templateRepo.getTemplateById(id, tenantId);
  }

  async getTemplatesByCategory(tenantId: string, category: TemplateCategory): Promise<Template[]> {
    return await this.templateRepo.getTemplatesByCategory(tenantId, category);
  }

  async getTemplatesGroupedByCategory(tenantId: string): Promise<TemplatesByCategory[]> {
    const templates = await this.templateRepo.getTemplates(tenantId);

    const grouped = new Map<TemplateCategory, Template[]>();

    for (const template of templates) {
      const category = template.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(template);
    }

    const result: TemplatesByCategory[] = [];
    const categoryOrder: TemplateCategory[] = [
      'welcome',
      'event',
      'newsletter',
      'prayer',
      'announcement',
      'follow-up',
      'birthday',
      'anniversary',
      'custom',
    ];

    for (const category of categoryOrder) {
      const categoryTemplates = grouped.get(category);
      if (categoryTemplates && categoryTemplates.length > 0) {
        result.push({
          category,
          templates: categoryTemplates,
        });
      }
    }

    return result;
  }

  async duplicateTemplate(id: string, tenantId: string, newName?: string): Promise<Template> {
    const existing = await this.templateRepo.getTemplateById(id, tenantId);
    if (!existing) {
      throw new Error('Template not found');
    }

    const duplicateData: CreateTemplateDto = {
      name: newName || `${existing.name} (Copy)`,
      description: existing.description ?? undefined,
      category: existing.category,
      channels: existing.channels,
      subject: existing.subject ?? undefined,
      content_html: existing.content_html ?? undefined,
      content_text: existing.content_text ?? undefined,
      variables: existing.variables,
      is_ai_generated: false, // Duplicated templates are not AI generated
    };

    return await this.templateRepo.createTemplate(duplicateData, tenantId);
  }

  async applyTemplateVariables(
    templateId: string,
    tenantId: string,
    variables: Record<string, string>
  ): Promise<{ subject: string; contentHtml: string; contentText: string }> {
    const template = await this.templateRepo.getTemplateById(templateId, tenantId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Increment usage count
    await this.templateRepo.incrementUsageCount(templateId);

    // Replace variables in template content
    let subject = template.subject || '';
    let contentHtml = template.content_html || '';
    let contentText = template.content_text || '';

    // Apply variable substitutions
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      subject = subject.replace(pattern, value);
      contentHtml = contentHtml.replace(pattern, value);
      contentText = contentText.replace(pattern, value);
    }

    // Apply default values for any remaining variables
    for (const variable of template.variables) {
      if (variable.defaultValue) {
        const pattern = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g');
        subject = subject.replace(pattern, variable.defaultValue);
        contentHtml = contentHtml.replace(pattern, variable.defaultValue);
        contentText = contentText.replace(pattern, variable.defaultValue);
      }
    }

    // Remove any remaining unsubstituted variables
    const unsubstitutedPattern = /{{[^}]+}}/g;
    subject = subject.replace(unsubstitutedPattern, '');
    contentHtml = contentHtml.replace(unsubstitutedPattern, '');
    contentText = contentText.replace(unsubstitutedPattern, '');

    return { subject, contentHtml, contentText };
  }
}
