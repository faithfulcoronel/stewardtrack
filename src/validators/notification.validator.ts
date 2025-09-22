import { Notification } from '../models/notification.model';

export class NotificationValidator {
  static validate(data: Partial<Notification>): void {
    if (!data.title?.trim()) {
      throw new Error('Title is required');
    }

    if (!data.message?.trim()) {
      throw new Error('Message is required');
    }

    if (!data.type) {
      throw new Error('Type is required');
    }

    const validTypes = ['info', 'success', 'warning', 'error'];
    if (data.type && !validTypes.includes(data.type)) {
      throw new Error('Invalid notification type. Must be one of: info, success, warning, error');
    }
  }
}
