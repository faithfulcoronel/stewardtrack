import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for StewardTrack Mobile App
 *
 * IMPORTANT: Since StewardTrack has API routes, we cannot use static export.
 * Instead, the mobile app connects to a live Next.js server:
 *
 * Development:
 *   1. Start the web dev server: cd apps/web && pnpm dev
 *   2. Update the server.url below with your local IP (not localhost)
 *   3. Run: pnpm cap sync android && pnpm cap run android
 *
 * Production:
 *   Deploy your Next.js app and set server.url to your production URL
 *   Or use the app as a PWA directly
 */
const config: CapacitorConfig = {
  appId: 'com.stewardtrack.app',
  appName: 'StewardTrack',
  webDir: 'dist', // Empty folder since app loads from server URL

  // Server configuration - REQUIRED for apps with API routes
  server: {
    // Production URL
    url: 'https://stewardtrack.com',
    cleartext: false, // HTTPS only for production
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body' as const,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#3b82f6', // Primary blue color
      overlaysWebView: false, // Don't overlay the WebView - content below status bar
    },
    Camera: {
      // Photo quality settings
      quality: 90,
      allowEditing: true,
      resultType: 'uri',
    },
  },

  // iOS-specific configuration
  ios: {
    contentInset: 'automatic',
    scheme: 'StewardTrack',
    // Enable background modes for push notifications
    backgroundColor: '#ffffff',
    // Scroll behavior
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },

  // Android-specific configuration
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Disabled for production
    // Background color for the WebView
    backgroundColor: '#ffffff',
    // Build variants
    buildOptions: {
      signingType: 'apksigner',
    },
  },

  // Logging configuration
  loggingBehavior: 'production',
};

export default config;
