/**
 * @stewardtrack/native-bridge
 * Native platform integration utilities for cross-platform support
 *
 * This package provides a unified API for platform-specific features:
 * - Platform detection (web, iOS, Android)
 * - Push notifications
 * - Camera access
 * - Biometric authentication
 * - Secure storage
 * - Haptic feedback
 *
 * Uses Capacitor plugins on native platforms (iOS/Android)
 * and fallback to web APIs where available.
 */

// Platform detection and device info
export * from './platform';

// Re-export modules with namespaces for cleaner imports
export * as push from './push';
export * as camera from './camera';
export * as biometric from './biometric';
export * as storage from './storage';
export * as haptics from './haptics';
export * as offline from './offline';
