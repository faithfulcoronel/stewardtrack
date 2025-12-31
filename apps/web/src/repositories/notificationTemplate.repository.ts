import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  RenderedTemplate,
  TemplateLookupKey,
} from '@/models/notification/notificationTemplate.model';
import type { INotificationTemplateAdapter } from '@/adapters/notificationTemplate.adapter';
import { TYPES } from '@/lib/types';

export interface INotificationTemplateRepository extends BaseRepository<NotificationTemplate> {
  getTemplate(lookup: TemplateLookupKey): Promise<NotificationTemplate | null>;
  getTenantTemplates(tenantId: string): Promise<NotificationTemplate[]>;
  getSystemTemplates(): Promise<NotificationTemplate[]>;
  createTemplate(
    tenantId: string,
    dto: CreateNotificationTemplateDto
  ): Promise<NotificationTemplate>;
  updateTemplate(id: string, dto: UpdateNotificationTemplateDto): Promise<NotificationTemplate>;
  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, unknown>
  ): RenderedTemplate;
}

@injectable()
export class NotificationTemplateRepository
  extends BaseRepository<NotificationTemplate>
  implements INotificationTemplateRepository
{
  constructor(
    @inject(TYPES.INotificationTemplateAdapter)
    private readonly templateAdapter: INotificationTemplateAdapter
  ) {
    super(templateAdapter);
  }

  async getTemplate(lookup: TemplateLookupKey): Promise<NotificationTemplate | null> {
    return this.templateAdapter.getTemplate(lookup);
  }

  async getTenantTemplates(tenantId: string): Promise<NotificationTemplate[]> {
    return this.templateAdapter.getTenantTemplates(tenantId);
  }

  async getSystemTemplates(): Promise<NotificationTemplate[]> {
    return this.templateAdapter.getSystemTemplates();
  }

  async createTemplate(
    tenantId: string,
    dto: CreateNotificationTemplateDto
  ): Promise<NotificationTemplate> {
    return this.templateAdapter.createTemplate(tenantId, dto);
  }

  async updateTemplate(
    id: string,
    dto: UpdateNotificationTemplateDto
  ): Promise<NotificationTemplate> {
    return this.templateAdapter.updateTemplate(id, dto);
  }

  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, unknown>
  ): RenderedTemplate {
    return this.templateAdapter.renderTemplate(template, variables);
  }
}
