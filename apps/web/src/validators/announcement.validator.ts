import { Announcement } from '@/models/announcement.model';

export class AnnouncementValidator {
  static validate(data: Partial<Announcement>): void {
    if (!data.message?.trim()) {
      throw new Error('Message is required');
    }

    if (data.starts_at != null && isNaN(Date.parse(data.starts_at))) {
      throw new Error('Invalid start date format');
    }

    if (data.ends_at != null && isNaN(Date.parse(data.ends_at))) {
      throw new Error('Invalid end date format');
    }
  }
}
