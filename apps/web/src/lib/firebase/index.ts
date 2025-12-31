/**
 * ================================================================================
 * FIREBASE CLIENT-SIDE INTEGRATION
 * ================================================================================
 *
 * Handles Firebase Cloud Messaging (FCM) for web push notifications.
 *
 * Usage:
 * 1. Import and call initializeFirebaseMessaging() on app load
 * 2. Call requestNotificationPermission() to request user permission
 * 3. Call registerDeviceToken() to save the token to the backend
 *
 * Required Environment Variables:
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_SENDER_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * - NEXT_PUBLIC_FIREBASE_VAPID_KEY
 *
 * ================================================================================
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  );
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Initialize Firebase app and messaging
 */
export function initializeFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!isFirebaseConfigured()) {
    console.warn('Firebase is not configured. Push notifications will not work.');
    return null;
  }
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported in this browser.');
    return null;
  }

  try {
    // Initialize Firebase app if not already initialized
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    // Get messaging instance
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Failed to initialize Firebase messaging:', error);
    return null;
  }
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  token: string | null;
  error?: string;
}> {
  if (!isPushSupported()) {
    return {
      granted: false,
      token: null,
      error: 'Push notifications are not supported in this browser',
    };
  }

  if (!isFirebaseConfigured()) {
    return {
      granted: false,
      token: null,
      error: 'Firebase is not configured',
    };
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return {
        granted: false,
        token: null,
        error: permission === 'denied'
          ? 'Notification permission was denied'
          : 'Notification permission was not granted',
      };
    }

    // Initialize messaging if not already done
    const msg = messaging || initializeFirebaseMessaging();
    if (!msg) {
      return {
        granted: true,
        token: null,
        error: 'Failed to initialize Firebase messaging',
      };
    }

    // Register service worker for background notifications
    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        granted: true,
        token: null,
        error: 'Failed to register service worker',
      };
    }

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return {
        granted: true,
        token: null,
        error: 'Failed to get FCM token',
      };
    }

    return {
      granted: true,
      token,
    };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return {
      granted: false,
      token: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register the Firebase service worker
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Register device token with the backend
 */
export async function registerDeviceToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get browser info for device identification
    const browserInfo = getBrowserInfo();

    const response = await fetch('/api/notifications/device-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        device_type: 'web',
        device_name: `${browserInfo.browser} on ${browserInfo.os}`,
        browser_info: browserInfo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to register device token',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error registering device token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unregister device token from the backend
 */
export async function unregisterDeviceToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // URL encode the token as it may contain special characters
    const encodedToken = encodeURIComponent(token);
    const response = await fetch(`/api/notifications/device-tokens/${encodedToken}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to unregister device token',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Set up foreground message handler
 */
export function onForegroundMessage(
  callback: (payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }) => void
): () => void {
  const msg = messaging || initializeFirebaseMessaging();
  if (!msg) {
    console.warn('Firebase messaging not initialized');
    return () => {};
  }

  return onMessage(msg, (payload) => {
    const notification = payload.notification;
    if (notification) {
      callback({
        title: notification.title || 'New Notification',
        body: notification.body || '',
        data: payload.data,
      });
    }
  });
}

/**
 * Get browser information for device identification
 */
function getBrowserInfo(): {
  browser: string;
  os: string;
  version: string;
} {
  const ua = navigator.userAgent;

  // Detect browser
  let browser = 'Unknown';
  let version = '';
  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    version = ua.split('Firefox/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    version = ua.split('Edg/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    version = ua.split('Chrome/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
    version = ua.split('Version/')[1]?.split(' ')[0] || '';
  }

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }

  return { browser, os, version };
}

/**
 * Get the current FCM token (if already registered)
 */
export async function getCurrentToken(): Promise<string | null> {
  const msg = messaging || initializeFirebaseMessaging();
  if (!msg) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (error) {
    console.error('Error getting current token:', error);
    return null;
  }
}
