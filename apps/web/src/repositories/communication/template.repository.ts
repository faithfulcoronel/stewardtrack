import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { TYPES } from '@/lib/types';
import type { ITemplateAdapter, TemplateFilters } from '@/adapters/communication/template.adapter';
import type {
  Template,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateCategory,
} from '@/models/communication/template.model';

export interface ITemplateRepository {
  createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template>;
  updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template>;
  deleteTemplate(id: string, tenantId: string): Promise<void>;
  getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]>;
  getTemplateById(id: string, tenantId: string): Promise<Template | null>;
  getTemplatesByCategory(tenantId: string, category: TemplateCategory): Promise<Template[]>;
  incrementUsageCount(id: string): Promise<void>;
}

@injectable()
export class TemplateRepository extends BaseRepository<Template> implements ITemplateRepository {
  constructor(
    @inject(TYPES.ITemplateAdapter) private readonly templateAdapter: ITemplateAdapter
  ) {
    super(templateAdapter);
  }

  async createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template> {
    return await this.templateAdapter.createTemplate(data, tenantId);
  }

  async updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template> {
    return await this.templateAdapter.updateTemplate(id, data, tenantId);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    return await this.templateAdapter.deleteTemplate(id, tenantId);
  }

  async getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]> {
    return await this.templateAdapter.getTemplates(tenantId, filters);
  }

  async getTemplateById(id: string, tenantId: string): Promise<Template | null> {
    return await this.templateAdapter.getTemplateById(id, tenantId);
  }

  async getTemplatesByCategory(tenantId: string, category: TemplateCategory): Promise<Template[]> {
    return await this.templateAdapter.getTemplatesByCategory(tenantId, category);
  }

  async incrementUsageCount(id: string): Promise<void> {
    return await this.templateAdapter.incrementUsageCount(id);
  }
}
