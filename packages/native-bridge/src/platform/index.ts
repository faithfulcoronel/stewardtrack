/**
 * Platform detection utilities
 *
 * This module provides platform detection without requiring Capacitor.
 * When Capacitor is added in Phase 3, this will be enhanced with native detection.
 */

import type { Platform, DeviceInfo, PlatformCapabilities } from '@stewardtrack/shared-types';

/**
 * Check if code is running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if code is running in a server environment
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Detect the current platform
 * This is a placeholder that will be enhanced when Capacitor is added
 */
export function getPlatform(): Platform {
  if (isServer()) {
    return 'web';
  }

  // Check for Capacitor native platform
  // This will work once Capacitor is installed
  const win = window as Window & { Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean } };
  if (win.Capacitor?.getPlatform) {
    const platform = win.Capacitor.getPlatform();
    if (platform === 'ios' || platform === 'android') {
      return platform;
    }
  }

  return 'web';
}

/**
 * Check if running in a native Capacitor container
 */
export function isNative(): boolean {
  if (isServer()) {
    return false;
  }

  const win = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  return win.Capacitor?.isNativePlatform?.() ?? false;
}

/**
 * Get device information
 * This is a placeholder that will be enhanced when Capacitor Device plugin is added
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  return {
    platform: getPlatform(),
    isNative: isNative(),
    osVersion: isBrowser() ? navigator.userAgent : 'server',
    model: 'unknown',
    uuid: 'web-' + (isBrowser() ? btoa(navigator.userAgent).slice(0, 16) : 'server'),
  };
}

/**
 * Get platform capabilities
 * This is a placeholder that will be enhanced with actual capability detection
 */
export async function getCapabilities(): Promise<PlatformCapabilities> {
  const native = isNative();
  const browser = isBrowser();

  return {
    hasPushNotifications: native || (browser && 'Notification' in window),
    hasCamera: native || (browser && 'mediaDevices' in navigator),
    hasBiometrics: native, // Only available on native
    hasSecureStorage: native, // Native uses iOS Keychain / Android Keystore
    hasHaptics: native, // Only available on native
    hasOfflineSupport: browser && 'serviceWorker' in navigator,
  };
}

/**
 * React hook for platform detection
 */
export function usePlatform(): Platform {
  return getPlatform();
}

/**
 * React hook for native detection
 */
export function useIsNative(): boolean {
  return isNative();
}
