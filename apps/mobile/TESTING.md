# Mobile App Testing Guide

This document describes the testing strategy for StewardTrack's mobile applications.

## Testing Layers

### 1. Playwright E2E Tests (Web + Mobile Viewports)

Playwright tests run against the web app in mobile viewport configurations to test responsive behavior.

```bash
# Run all tests including mobile viewports
cd apps/web
npx playwright test

# Run only mobile viewport tests
npx playwright test --project=mobile-chrome --project=mobile-safari

# Run mobile tests with UI
npx playwright test --project=mobile-chrome --ui
```

**Mobile Projects Available:**
- `mobile-chrome` - Pixel 5 viewport (Android)
- `mobile-chrome-landscape` - Pixel 5 landscape
- `mobile-safari` - iPhone 12 viewport (iOS)
- `mobile-safari-landscape` - iPhone 12 landscape
- `tablet-ipad` - iPad viewport
- `tablet-ipad-landscape` - iPad landscape

### 2. Native E2E Tests with Detox (Future)

For native-specific testing (push notifications, biometrics, camera), Detox will be used.

**Setup (when ready to implement):**

```bash
# Install Detox CLI
npm install -g detox-cli

# Install dependencies
cd apps/mobile
npm install detox --save-dev

# Build for testing
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

**Test Structure:**
```
apps/mobile/
├── e2e/
│   ├── config.json          # Detox configuration
│   ├── init.js               # Test setup
│   └── tests/
│       ├── app-launch.e2e.js
│       ├── push-notifications.e2e.js
│       ├── camera.e2e.js
│       └── biometric-auth.e2e.js
```

## Test Scenarios

### Critical Paths (Must Pass)

1. **App Launch**
   - Splash screen displays
   - App loads without crash
   - Navigation is functional

2. **Authentication**
   - Login form works on mobile
   - Form inputs are touch-friendly
   - Keyboard doesn't obscure inputs

3. **Core Features**
   - Member list scrolls smoothly
   - Forms are usable on mobile
   - Actions complete successfully

### Mobile-Specific Tests

1. **Safe Area Handling**
   - Content respects notch/island
   - Bottom navigation avoids home indicator
   - Landscape orientation works

2. **Touch Interactions**
   - Buttons have 44px+ touch targets
   - Swipe gestures work
   - Pull-to-refresh functions

3. **Native Features**
   - Push notifications arrive
   - Camera capture works
   - Biometric auth prompts correctly
   - Offline mode displays cached data

## Running Tests

### Web Responsive Tests

```bash
# From project root
cd apps/web

# Quick mobile test run
npx playwright test e2e/tests/mobile-responsive.spec.ts --project=mobile-chrome

# Full mobile test suite
npx playwright test --project=mobile-chrome --project=mobile-safari

# With visual debugging
npx playwright test --project=mobile-chrome --headed
```

### Native App Tests (Simulator/Emulator)

```bash
# Build iOS app for testing
cd apps/mobile
pnpm cap build ios

# Run on iOS Simulator
pnpm cap run ios

# Build Android app for testing
pnpm cap build android

# Run on Android Emulator
pnpm cap run android
```

### Device Testing

For real device testing:

1. **iOS (TestFlight)**
   - Deploy to TestFlight via Azure Pipelines
   - Test on physical devices

2. **Android (Internal Testing)**
   - Deploy to Play Store Internal track
   - Test on physical devices

## Manual Test Checklist

### Before Release

- [ ] App launches without crash on iOS
- [ ] App launches without crash on Android
- [ ] Login works on both platforms
- [ ] Core features function correctly
- [ ] Push notifications arrive
- [ ] Camera permissions work
- [ ] Biometric auth works
- [ ] Offline mode works
- [ ] Deep links work
- [ ] Status bar displays correctly
- [ ] Safe areas are respected
- [ ] Keyboard handling is correct
- [ ] Orientation changes work

### Performance Checks

- [ ] App launches in < 3 seconds
- [ ] Scrolling is smooth (60fps)
- [ ] No memory leaks during navigation
- [ ] Network requests are optimized

## CI/CD Integration

Tests run automatically in Azure Pipelines:

1. **Web Build** → Playwright E2E tests
2. **iOS Build** → Manual testing via TestFlight
3. **Android Build** → Manual testing via Play Store Internal

See [azure-pipelines.yml](../../azure-pipelines.yml) for configuration.

## Troubleshooting

### Playwright Mobile Tests Failing

```bash
# Update Playwright browsers
npx playwright install

# Clear test cache
rm -rf test-results playwright-report

# Run with debug logging
DEBUG=pw:api npx playwright test --project=mobile-chrome
```

### Capacitor Build Issues

```bash
# Clean and rebuild
cd apps/mobile
pnpm clean
cd ../web
pnpm build:static
cd ../mobile
pnpm cap sync
```

### iOS Simulator Issues

```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

### Android Emulator Issues

```bash
# Cold boot emulator
emulator -avd Pixel_5_API_34 -no-snapshot-load
```
