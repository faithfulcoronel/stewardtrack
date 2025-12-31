# Mobile App Security Guide

This document outlines security considerations and configurations for StewardTrack's mobile applications.

## Security Configurations

### iOS (Info.plist)

The following security settings are configured in the iOS app:

```xml
<!-- Require HTTPS -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>supabase.co</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <true/>
        </dict>
    </dict>
</dict>

<!-- Camera usage description -->
<key>NSCameraUsageDescription</key>
<string>StewardTrack uses the camera to capture profile photos and event images.</string>

<!-- Photo library usage description -->
<key>NSPhotoLibraryUsageDescription</key>
<string>StewardTrack accesses your photo library to select profile pictures and event images.</string>

<!-- Face ID usage description -->
<key>NSFaceIDUsageDescription</key>
<string>StewardTrack uses Face ID for secure and convenient login.</string>
```

### Android (AndroidManifest.xml)

```xml
<!-- Use network security config -->
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:allowBackup="false"
    android:fullBackupContent="false">
</application>

<!-- Permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

### Android Network Security Config

Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config>
        <domain includeSubdomains="true">supabase.co</domain>
        <pin-set expiration="2025-12-31">
            <!-- Add certificate pins for enhanced security -->
            <!-- <pin digest="SHA-256">BASE64_ENCODED_SHA256_HASH</pin> -->
        </pin-set>
    </domain-config>
</network-security-config>
```

## Secure Storage

### Token Storage

Authentication tokens are stored securely:

- **iOS**: Uses iOS Keychain via `@capacitor/preferences`
- **Android**: Uses Android Keystore via `@capacitor/preferences`
- **Web**: Uses localStorage (consider encryption for sensitive data)

```typescript
import { storage } from '@stewardtrack/native-bridge';

// Store token securely
await storage.setItem('auth_token', token);

// Retrieve token
const token = await storage.getItem('auth_token');

// Remove token on logout
await storage.removeItem('auth_token');
```

### Sensitive Data

Never store these in plain text:
- Passwords
- API keys
- Session tokens
- Personal information

## Biometric Authentication

Use biometric auth for sensitive operations:

```typescript
import { biometric } from '@stewardtrack/native-bridge';

// Check availability
const availability = await biometric.isAvailable();

if (availability.isAvailable) {
  // Authenticate before sensitive operations
  const result = await biometric.authenticate({
    reason: 'Confirm your identity to view financial data',
    allowDeviceCredential: true,
  });

  if (result.success) {
    // Proceed with sensitive operation
  }
}
```

## Network Security

### HTTPS Only

All network requests must use HTTPS:

- Web: Enforced by browser
- iOS: Enforced by App Transport Security
- Android: Enforced by network security config

### API Endpoints

Only connect to trusted API endpoints:

- `*.supabase.co` - Backend API
- `fonts.googleapis.com` - Fonts
- `fonts.gstatic.com` - Fonts

### Certificate Pinning (Optional)

For high-security deployments, implement certificate pinning:

```typescript
// Note: Requires native plugin implementation
// This is a conceptual example
const config = {
  domains: [
    {
      domain: 'your-project.supabase.co',
      pins: ['SHA256_HASH_OF_CERTIFICATE'],
    },
  ],
};
```

## Code Security

### ProGuard (Android)

Enable ProGuard for release builds to obfuscate code:

```gradle
// android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Source Maps

- Never include source maps in production mobile builds
- Keep source maps secure for debugging

## Data Protection

### At Rest

- All local data is stored in app-private storage
- Sensitive data uses secure storage (Keychain/Keystore)
- Database encryption is handled by Supabase

### In Transit

- All API calls use HTTPS
- WebSocket connections use WSS
- No sensitive data in URL parameters

### User Data

- Minimize data collection
- Clear cached data on logout
- Provide data export/deletion options

## Session Management

### Session Timeout

Implement session timeout for security:

```typescript
// Already implemented in InactivityTimeoutProvider
// Default: 15 minutes of inactivity
// Warning: 60 seconds before logout
```

### Logout Cleanup

On logout, clear all sensitive data:

```typescript
async function secureLogout() {
  // Clear storage
  await storage.clear();

  // Clear any cached credentials
  await biometric.deleteCredentials('stewardtrack.com');

  // Navigate to login
  router.push('/login');
}
```

## App Permissions

### Requesting Permissions

Always request permissions contextually:

```typescript
// Bad: Request camera on app start
// Good: Request camera when user tries to take photo

async function takeProfilePhoto() {
  const permission = await camera.requestPermissions();
  if (permission.camera === 'granted') {
    const photo = await camera.takePhoto();
    // ...
  } else {
    // Explain why permission is needed
    showPermissionExplanation();
  }
}
```

### Permission Descriptions

Provide clear descriptions for each permission:

- Camera: "Take profile photos and event pictures"
- Photo Library: "Select existing photos for profiles"
- Push Notifications: "Receive church announcements and reminders"
- Face ID/Touch ID: "Quick and secure login"

## Vulnerability Prevention

### Input Validation

- Validate all user inputs
- Sanitize data before display
- Use parameterized queries (handled by Supabase)

### XSS Prevention

- React escapes content by default
- Avoid `dangerouslySetInnerHTML`
- Sanitize any HTML content

### CSRF Protection

- Use Supabase's built-in CSRF protection
- Include CSRF tokens in state-changing requests

## Security Checklist

### Before Release

- [ ] HTTPS enforced on all connections
- [ ] Secure storage for tokens
- [ ] Biometric auth implemented
- [ ] ProGuard enabled (Android)
- [ ] Permissions requested contextually
- [ ] Session timeout implemented
- [ ] Logout clears all data
- [ ] No sensitive data in logs
- [ ] No hardcoded secrets
- [ ] Source maps excluded from builds

### Regular Audits

- [ ] Update dependencies regularly
- [ ] Review security headers
- [ ] Check for known vulnerabilities
- [ ] Test authentication flows
- [ ] Verify data encryption

## Reporting Security Issues

If you discover a security vulnerability, please report it to:

- Email: security@stewardtrack.com
- Do not disclose publicly until fixed
