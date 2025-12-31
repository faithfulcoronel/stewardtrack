import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { INotificationRepository } from '@/repositories/notification.repository';
import type { INotificationPreferenceRepository } from '@/repositories/notificationPreference.repository';
import type { INotificationTemplateRepository } from '@/repositories/notificationTemplate.repository';
import type {
  Notification,
  CreateNotificationDto,
  NotificationListResponse,
  NotificationCategory,
} from '@/models/notification/notification.model';
import type {
  NotificationPreference,
  UpsertNotificationPreferenceDto,
  DeliveryCheckResult,
} from '@/models/notification/notificationPreference.model';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  RenderedTemplate,
  TemplateLookupKey,
} from '@/models/notification/notificationTemplate.model';
import type { DeliveryChannelType } from '@/models/notification/notificationEvent.model';

export interface INotificationService {
  // Notification operations
  getNotifications(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<NotificationListResponse>;
  getNotificationById(id: string): Promise<Notification | null>;
  getUnreadCount(userId: string): Promise<number>;
  createNotification(dto: CreateNotificationDto): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;
  deleteExpiredNotifications(): Promise<void>;

  // Preference operations
  getUserPreferences(userId: string, tenantId: string): Promise<NotificationPreference[]>;
  getPreference(
    userId: string,
    tenantId: string,
    category: NotificationCategory | 'all',
    channel: DeliveryChannelType
  ): Promise<NotificationPreference | null>;
  upsertPreference(
    userId: string,
    tenantId: string,
    preference: UpsertNotificationPreferenceDto
  ): Promise<NotificationPreference>;
  checkShouldDeliver(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: DeliveryChannelType
  ): Promise<DeliveryCheckResult>;
  resetPreferencesToDefaults(userId: string, tenantId: string): Promise<void>;

  // Template operations
  getTemplate(lookup: TemplateLookupKey): Promise<NotificationTemplate | null>;
  getTenantTemplates(tenantId: string): Promise<NotificationTemplate[]>;
  getSystemTemplates(): Promise<NotificationTemplate[]>;
  createTemplate(
    tenantId: string,
    dto: CreateNotificationTemplateDto
  ): Promise<NotificationTemplate>;
  updateTemplate(
    id: string,
    dto: UpdateNotificationTemplateDto
  ): Promise<NotificationTemplate>;
  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, unknown>
  ): RenderedTemplate;
}

@injectable()
export class NotificationService implements INotificationService {
  constructor(
    @inject(TYPES.INotificationRepository)
    private readonly notificationRepository: INotificationRepository,
    @inject(TYPES.INotificationPreferenceRepository)
    private readonly preferenceRepository: INotificationPreferenceRepository,
    @inject(TYPES.INotificationTemplateRepository)
    private readonly templateRepository: INotificationTemplateRepository
  ) {}

  // ==================== NOTIFICATION OPERATIONS ====================

  async getNotifications(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<NotificationListResponse> {
    return this.notificationRepository.getUserNotifications(userId, options);
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findById(id);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    return this.notificationRepository.createNotification(dto);
  }

  async markAsRead(id: string): Promise<void> {
    return this.notificationRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    return this.notificationRepository.deleteNotification(id, userId);
  }

  async deleteExpiredNotifications(): Promise<void> {
    return this.notificationRepository.deleteExpired();
  }

  // ==================== PREFERENCE OPERATIONS ====================

  async getUserPreferences(
    userId: string,
    tenantId: string
  ): Promise<NotificationPreference[]> {
    return this.preferenceRepository.getUserPreferences(userId, tenantId);
  }

  async getPreference(
    userId: string,
    tenantId: string,
    category: NotificationCategory | 'all',
    channel: DeliveryChannelType
  ): Promise<NotificationPreference | null> {
    return this.preferenceRepository.getPreference(userId, tenantId, category, channel);
  }

  async upsertPreference(
    userId: string,
    tenantId: string,
    preference: UpsertNotificationPreferenceDto
  ): Promise<NotificationPreference> {
    return this.preferenceRepository.upsertPreference(userId, tenantId, preference);
  }

  async checkShouldDeliver(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: DeliveryChannelType
  ): Promise<DeliveryCheckResult> {
    return this.preferenceRepository.checkShouldDeliver(
      userId,
      tenantId,
      category,
      channel
    );
  }

  async resetPreferencesToDefaults(userId: string, tenantId: string): Promise<void> {
    return this.preferenceRepository.resetToDefaults(userId, tenantId);
  }

  // ==================== TEMPLATE OPERATIONS ====================

  async getTemplate(lookup: TemplateLookupKey): Promise<NotificationTemplate | null> {
    return this.templateRepository.getTemplate(lookup);
  }

  async getTenantTemplates(tenantId: string): Promise<NotificationTemplate[]> {
    return this.templateRepository.getTenantTemplates(tenantId);
  }

  async getSystemTemplates(): Promise<NotificationTemplate[]> {
    return this.templateRepository.getSystemTemplates();
  }

  async createTemplate(
    tenantId: string,
    dto: CreateNotificationTemplateDto
  ): Promise<NotificationTemplate> {
    return this.templateRepository.createTemplate(tenantId, dto);
  }

  async updateTemplate(
    id: string,
    dto: UpdateNotificationTemplateDto
  ): Promise<NotificationTemplate> {
    return this.templateRepository.updateTemplate(id, dto);
  }

  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, unknown>
  ): RenderedTemplate {
    return this.templateRepository.renderTemplate(template, variables);
  }
}
