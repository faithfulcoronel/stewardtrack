import { BaseModel } from '@/models/base.model';

export type ReminderNotificationType = 'in_app' | 'email' | 'sms';

export interface CalendarEventReminder extends BaseModel {
  id: string;
  tenant_id: string;
  event_id: string;
  remind_at: string;
  minutes_before: number;
  notification_type: ReminderNotificationType;
  recipient_id?: string | null;
  is_sent: boolean;
  sent_at?: string | null;
}

export interface CalendarEventReminderCreateInput {
  event_id: string;
  remind_at: string;
  minutes_before?: number;
  notification_type?: ReminderNotificationType;
  recipient_id?: string | null;
}
