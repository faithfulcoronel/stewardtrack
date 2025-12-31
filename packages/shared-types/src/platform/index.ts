/**
 * Platform-related types for cross-platform support
 */

/**
 * Supported platforms
 */
export type Platform = 'web' | 'ios' | 'android';

/**
 * Device information
 */
export interface DeviceInfo {
  /** Current platform */
  platform: Platform;
  /** Whether running in native container (Capacitor) */
  isNative: boolean;
  /** Operating system version */
  osVersion: string;
  /** Device model name */
  model: string;
  /** Unique device identifier */
  uuid: string;
}

/**
 * Platform capabilities for feature detection
 */
export interface PlatformCapabilities {
  /** Whether push notifications are supported */
  hasPushNotifications: boolean;
  /** Whether camera access is available */
  hasCamera: boolean;
  /** Whether biometric authentication is available */
  hasBiometrics: boolean;
  /** Whether secure storage is available */
  hasSecureStorage: boolean;
  /** Whether haptic feedback is available */
  hasHaptics: boolean;
  /** Whether offline mode is supported */
  hasOfflineSupport: boolean;
}

/**
 * Biometry types for authentication
 */
export type BiometryType = 'face' | 'fingerprint' | 'iris' | 'none';

/**
 * Result of a biometric authentication attempt
 */
export interface BiometricResult {
  /** Whether authentication was successful */
  success: boolean;
  /** Error message if authentication failed */
  error?: string;
  /** Type of biometry used */
  biometryType?: BiometryType;
}

/**
 * Push notification token
 */
export interface PushDeviceToken {
  /** The device token value */
  token: string;
  /** Platform the token is for */
  platform: Platform;
  /** When the token was registered */
  registeredAt: string;
}

/**
 * Push notification payload
 */
export interface PushNotification {
  /** Unique notification ID */
  id: string;
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Additional data payload */
  data?: Record<string, unknown>;
  /** When the notification was received */
  receivedAt: string;
}

/**
 * Action performed on a notification
 */
export interface NotificationAction {
  /** The notification that was acted upon */
  notification: PushNotification;
  /** The action ID that was performed */
  actionId: string;
  /** Input text if the action included text input */
  inputValue?: string;
}

/**
 * Safe area insets for notched devices
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Network status
 */
export interface NetworkStatus {
  /** Whether device is connected to network */
  connected: boolean;
  /** Type of connection */
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
}

/**
 * Offline sync operation
 */
export interface SyncOperation {
  /** Unique operation ID */
  id: string;
  /** Entity type being synced */
  entity: string;
  /** Type of operation */
  action: 'create' | 'update' | 'delete';
  /** Data for the operation */
  data: Record<string, unknown>;
  /** When the operation was queued */
  timestamp: string;
  /** Number of retry attempts */
  retryCount: number;
}

/**
 * Sync queue status
 */
export interface SyncQueueStatus {
  /** Number of pending operations */
  pendingCount: number;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Last successful sync time */
  lastSyncAt?: string;
  /** Any error from the last sync attempt */
  lastError?: string;
}
