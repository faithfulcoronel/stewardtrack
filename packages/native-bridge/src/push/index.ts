/**
 * Push Notifications Bridge
 *
 * Unified API for push notifications across web and native platforms.
 * - Native (iOS/Android): Uses Capacitor PushNotifications plugin
 * - Web: Uses Firebase Cloud Messaging (FCM) via existing implementation
 */

import { isNative, isBrowser } from '../platform';

// Define types for push notification tokens and permissions
export interface PushNotificationToken {
  value: string;
  platform: 'ios' | 'android' | 'web';
}

export interface PushNotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface PushNotification {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  click_action?: string;
  sound?: string;
  badge?: number;
}

// Event listeners
type PushNotificationListener = (notification: PushNotification) => void;
type TokenListener = (token: PushNotificationToken) => void;

let tokenListeners: TokenListener[] = [];
let notificationListeners: PushNotificationListener[] = [];

/**
 * Request push notification permissions
 */
export async function requestPermissions(): Promise<PushNotificationPermissionStatus> {
  if (isNative()) {
    // Use Capacitor PushNotifications
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    return {
      granted: result.receive === 'granted',
      denied: result.receive === 'denied',
      prompt: result.receive === 'prompt',
    };
  } else if (isBrowser() && 'Notification' in window) {
    // Use Web Notifications API
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      prompt: permission === 'default',
    };
  }

  return { granted: false, denied: false, prompt: false };
}

/**
 * Check current permission status
 */
export async function checkPermissions(): Promise<PushNotificationPermissionStatus> {
  if (isNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.checkPermissions();
    return {
      granted: result.receive === 'granted',
      denied: result.receive === 'denied',
      prompt: result.receive === 'prompt',
    };
  } else if (isBrowser() && 'Notification' in window) {
    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      prompt: permission === 'default',
    };
  }

  return { granted: false, denied: false, prompt: false };
}

/**
 * Register for push notifications and get token
 */
export async function register(): Promise<void> {
  if (isNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Add listeners for registration
    await PushNotifications.addListener('registration', (token) => {
      const pushToken: PushNotificationToken = {
        value: token.value,
        platform: getPlatformForToken(),
      };
      tokenListeners.forEach((listener) => listener(pushToken));
    });

    // Add listeners for incoming notifications
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const pushNotification: PushNotification = {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      };
      notificationListeners.forEach((listener) => listener(pushNotification));
    });

    // Add listeners for notification actions
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const pushNotification: PushNotification = {
        id: notification.notification.id,
        title: notification.notification.title,
        body: notification.notification.body,
        data: notification.notification.data,
      };
      notificationListeners.forEach((listener) => listener(pushNotification));
    });

    // Register with APNS/FCM
    await PushNotifications.register();
  }
}

/**
 * Unregister from push notifications
 */
export async function unregister(): Promise<void> {
  if (isNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
  }
}

/**
 * Add a listener for token updates
 */
export function addTokenListener(listener: TokenListener): () => void {
  tokenListeners.push(listener);
  return () => {
    tokenListeners = tokenListeners.filter((l) => l !== listener);
  };
}

/**
 * Add a listener for incoming notifications
 */
export function addNotificationListener(listener: PushNotificationListener): () => void {
  notificationListeners.push(listener);
  return () => {
    notificationListeners = notificationListeners.filter((l) => l !== listener);
  };
}

/**
 * Get delivered notifications
 */
export async function getDeliveredNotifications(): Promise<PushNotification[]> {
  if (isNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      data: n.data,
    }));
  }
  return [];
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications(): Promise<void> {
  if (isNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllDeliveredNotifications();
  }
}

function getPlatformForToken(): 'ios' | 'android' | 'web' {
  if (!isBrowser()) return 'web';
  const win = window as Window & { Capacitor?: { getPlatform?: () => string } };
  const platform = win.Capacitor?.getPlatform?.();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * React hook for push notification permissions
 */
export function usePushNotificationPermissions() {
  // This would need to be implemented with React state
  // For now, return the sync check function
  return { checkPermissions, requestPermissions };
}
