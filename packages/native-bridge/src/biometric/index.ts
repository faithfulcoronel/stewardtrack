/**
 * Biometric Authentication Bridge
 *
 * Unified API for biometric authentication across platforms.
 * - Native iOS: Uses Face ID or Touch ID
 * - Native Android: Uses Fingerprint or Face Unlock
 * - Web: Not supported (returns unavailable)
 *
 * Note: This uses Capacitor Device plugin for basic checks.
 * For full biometric support, @capacitor-community/biometric-auth should be added.
 */

import { isNative, getPlatform } from '../platform';

export type BiometricType = 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none';

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType: BiometricType;
  strongBiometryIsAvailable: boolean;
  deviceHasPasscode: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface BiometricAuthOptions {
  /** Reason shown to user for authentication */
  reason?: string;
  /** Title of the authentication dialog (Android only) */
  title?: string;
  /** Subtitle of the authentication dialog (Android only) */
  subtitle?: string;
  /** Negative button text (Android only) */
  negativeButtonText?: string;
  /** Allow device passcode/PIN as fallback */
  allowDeviceCredential?: boolean;
  /** Maximum number of attempts */
  maxAttempts?: number;
}

/**
 * Check if biometric authentication is available
 */
export async function isAvailable(): Promise<BiometricAvailability> {
  if (!isNative()) {
    return {
      isAvailable: false,
      biometryType: 'none',
      strongBiometryIsAvailable: false,
      deviceHasPasscode: false,
    };
  }

  const platform = getPlatform();

  // For now, we'll provide a basic check using Device info
  // Full implementation would use @capacitor-community/biometric-auth
  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();

    // On iOS, we can infer biometric support from device model
    if (platform === 'ios') {
      // This is a simplified check - production would use actual biometric API
      return {
        isAvailable: true, // Most modern iOS devices support biometrics
        biometryType: 'faceId', // Default assumption for modern devices
        strongBiometryIsAvailable: true,
        deviceHasPasscode: true,
      };
    }

    // On Android
    if (platform === 'android') {
      return {
        isAvailable: parseFloat(info.osVersion || '0') >= 6.0, // Android 6+ has fingerprint API
        biometryType: 'fingerprint',
        strongBiometryIsAvailable: parseFloat(info.osVersion || '0') >= 9.0,
        deviceHasPasscode: true,
      };
    }
  } catch (error) {
    console.error('Error checking biometric availability:', error);
  }

  return {
    isAvailable: false,
    biometryType: 'none',
    strongBiometryIsAvailable: false,
    deviceHasPasscode: false,
  };
}

/**
 * Authenticate using biometrics
 *
 * Note: This is a placeholder implementation.
 * Full implementation requires @capacitor-community/biometric-auth plugin.
 */
export async function authenticate(
  options: BiometricAuthOptions = {}
): Promise<BiometricAuthResult> {
  const {
    reason = 'Please authenticate to continue',
    title = 'Authentication Required',
    allowDeviceCredential = true,
  } = options;

  if (!isNative()) {
    return {
      success: false,
      error: 'Biometric authentication is not available on web',
      errorCode: 'NOT_AVAILABLE',
    };
  }

  const availability = await isAvailable();
  if (!availability.isAvailable) {
    return {
      success: false,
      error: 'Biometric authentication is not available on this device',
      errorCode: 'NOT_AVAILABLE',
    };
  }

  // Placeholder - in production, this would use the actual biometric plugin
  // For now, we'll simulate success for development purposes
  console.log('Biometric authentication requested:', { reason, title, allowDeviceCredential });

  // In a real implementation, this would call:
  // import { NativeBiometric } from 'capacitor-native-biometric';
  // return await NativeBiometric.verifyIdentity({ reason, title, ... });

  return {
    success: true, // Simulated success for development
  };
}

/**
 * Delete stored biometric credentials
 */
export async function deleteCredentials(server: string): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  // Placeholder - would use biometric plugin to delete stored credentials
  console.log('Deleting biometric credentials for:', server);
  return true;
}

/**
 * Set biometric credentials for a server
 */
export async function setCredentials(
  server: string,
  username: string,
  password: string
): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  // Placeholder - would use biometric plugin to store credentials
  console.log('Storing biometric credentials for:', server, username);
  return true;
}

/**
 * Get stored biometric credentials
 */
export async function getCredentials(
  server: string
): Promise<{ username: string; password: string } | null> {
  if (!isNative()) {
    return null;
  }

  // Placeholder - would use biometric plugin to retrieve credentials
  console.log('Retrieving biometric credentials for:', server);
  return null;
}

/**
 * Check if the device has stored biometric credentials
 */
export async function hasCredentials(server: string): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  // Placeholder - would check if credentials exist
  console.log('Checking biometric credentials for:', server);
  return false;
}

/**
 * React hook for biometric authentication
 */
export function useBiometricAuth() {
  return {
    isAvailable,
    authenticate,
    setCredentials,
    getCredentials,
    deleteCredentials,
    hasCredentials,
  };
}
