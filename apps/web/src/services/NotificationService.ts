import 'server-only';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationPayload {
  type: NotificationType;
  text: string;
  duration?: number;
}

export type NotificationHandler = (payload: NotificationPayload) => void | Promise<void>;

let handler: NotificationHandler | null = null;

/**
 * Registers a handler invoked whenever the data layer emits a notification.
 * Call this from server entry points to forward messages to another system
 * (for example, a message queue or audit log). If no handler is registered the
 * notification is logged to the server console.
 */
export function setNotificationHandler(nextHandler: NotificationHandler | null) {
  handler = nextHandler;
}

async function emit(type: NotificationType, text: string, duration?: number) {
  const payload: NotificationPayload = { type, text, duration };
  try {
    if (handler) {
      await handler(payload);
      return;
    }

    if (process.env.NODE_ENV !== 'test') {
      const label = type.toUpperCase();
      const log = type === 'error' ? console.error : console.info;
      log(`[Notification:${label}]`, text);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Notification handler failed', error);
    }
  }
}

export class NotificationService {
  static showSuccess(text: string, duration?: number) {
    return emit('success', text, duration);
  }

  static showError(text: string, duration?: number) {
    return emit('error', text, duration);
  }

  static showInfo(text: string, duration?: number) {
    return emit('info', text, duration);
  }
}
