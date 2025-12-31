/**
 * Haptics Bridge
 *
 * Unified API for haptic feedback across web and native platforms.
 * - Native (iOS/Android): Uses Capacitor Haptics plugin
 * - Web: Uses Vibration API where available
 */

import { isNative, isBrowser } from '../platform';

export type HapticImpactStyle = 'heavy' | 'medium' | 'light';
export type HapticNotificationType = 'success' | 'warning' | 'error';

/**
 * Trigger an impact haptic
 */
export async function impact(style: HapticImpactStyle = 'medium'): Promise<void> {
  if (isNative()) {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const impactStyle = style === 'heavy'
      ? ImpactStyle.Heavy
      : style === 'light'
      ? ImpactStyle.Light
      : ImpactStyle.Medium;
    await Haptics.impact({ style: impactStyle });
  } else if (isBrowser() && 'vibrate' in navigator) {
    // Web fallback using Vibration API
    const duration = style === 'heavy' ? 50 : style === 'light' ? 10 : 25;
    navigator.vibrate(duration);
  }
}

/**
 * Trigger a notification haptic
 */
export async function notification(type: HapticNotificationType = 'success'): Promise<void> {
  if (isNative()) {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const notificationType = type === 'error'
      ? NotificationType.Error
      : type === 'warning'
      ? NotificationType.Warning
      : NotificationType.Success;
    await Haptics.notification({ type: notificationType });
  } else if (isBrowser() && 'vibrate' in navigator) {
    // Web fallback using Vibration API with patterns
    const patterns: Record<HapticNotificationType, number[]> = {
      success: [20, 50, 20],
      warning: [30, 30, 30],
      error: [50, 50, 50, 50, 50],
    };
    navigator.vibrate(patterns[type]);
  }
}

/**
 * Trigger a selection haptic (light tap feedback)
 */
export async function selection(): Promise<void> {
  if (isNative()) {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionStart();
    await Haptics.selectionEnd();
  } else if (isBrowser() && 'vibrate' in navigator) {
    navigator.vibrate(5);
  }
}

/**
 * Start a selection change haptic
 */
export async function selectionStart(): Promise<void> {
  if (isNative()) {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionStart();
  }
}

/**
 * Trigger a selection changed haptic during a drag
 */
export async function selectionChanged(): Promise<void> {
  if (isNative()) {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionChanged();
  } else if (isBrowser() && 'vibrate' in navigator) {
    navigator.vibrate(3);
  }
}

/**
 * End a selection change haptic
 */
export async function selectionEnd(): Promise<void> {
  if (isNative()) {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionEnd();
  }
}

/**
 * Vibrate for a specific duration (milliseconds)
 */
export async function vibrate(duration: number = 300): Promise<void> {
  if (isNative()) {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration });
  } else if (isBrowser() && 'vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

/**
 * Check if haptics are available on this device
 */
export function isHapticsAvailable(): boolean {
  if (isNative()) {
    return true; // Native always has haptics support
  }
  return isBrowser() && 'vibrate' in navigator;
}

/**
 * React hook for haptic feedback
 */
export function useHaptics() {
  return {
    impact,
    notification,
    selection,
    vibrate,
    isAvailable: isHapticsAvailable(),
  };
}
