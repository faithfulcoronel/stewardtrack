# Mobile App Assets

This directory contains all visual assets for the StewardTrack mobile apps.

## Directory Structure

```
assets/
├── icons/              # App icons for all platforms and sizes
├── splash/             # Splash screen images
├── screenshots/
│   ├── ios/           # App Store screenshots
│   └── android/       # Play Store screenshots
└── README.md
```

## Required Assets

### App Icons

Generate from a 1024x1024 source icon. Required sizes:

**iOS (in `icons/ios/`):**
- AppIcon-20@2x.png (40x40)
- AppIcon-20@3x.png (60x60)
- AppIcon-29@2x.png (58x58)
- AppIcon-29@3x.png (87x87)
- AppIcon-40@2x.png (80x80)
- AppIcon-40@3x.png (120x120)
- AppIcon-60@2x.png (120x120)
- AppIcon-60@3x.png (180x180)
- AppIcon-76@1x.png (76x76)
- AppIcon-76@2x.png (152x152)
- AppIcon-83.5@2x.png (167x167)
- AppIcon-1024@1x.png (1024x1024)

**Android (in `icons/android/`):**
- mipmap-mdpi/ic_launcher.png (48x48)
- mipmap-hdpi/ic_launcher.png (72x72)
- mipmap-xhdpi/ic_launcher.png (96x96)
- mipmap-xxhdpi/ic_launcher.png (144x144)
- mipmap-xxxhdpi/ic_launcher.png (192x192)
- play_store_512.png (512x512)

### Splash Screens

**iOS (in `splash/ios/`):**
- Default@2x~universal~anyany.png (2732x2732)
- Or use storyboard-based splash

**Android (in `splash/android/`):**
- splash-hdpi.png (800x480)
- splash-xhdpi.png (1280x720)
- splash-xxhdpi.png (1600x960)
- splash-xxxhdpi.png (1920x1280)

### Screenshots

See APP_STORE_PREPARATION.md for detailed screenshot requirements.

**iOS (in `screenshots/ios/`):**
- 6.9-inch displays (1320x2868)
- 6.7-inch displays (1290x2796)
- 6.5-inch displays (1242x2688)
- 5.5-inch displays (1242x2208)
- iPad Pro 12.9" (2048x2732)

**Android (in `screenshots/android/`):**
- Phone (1080x1920 minimum)
- Tablet 7" (1200x1920)
- Tablet 10" (1920x1200)

## Icon Generation Tools

Use one of these tools to generate all required icon sizes from a source image:

- [App Icon Generator](https://www.appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)
- [Icon Kitchen](https://icon.kitchen/)

## Design Guidelines

### App Icon

- Primary color: #3B82F6 (StewardTrack Blue)
- Background: White or gradient
- Symbol: Church/stewardship themed
- No text on icon
- Rounded corners handled by OS

### Splash Screen

- Centered StewardTrack logo
- White background (#FFFFFF)
- Keep minimal for fast loading
- Logo should be ~200px centered

### Screenshots

- Show real app data (use demo account)
- Add device frames
- Include captions
- Consistent style across all screenshots
- Highlight key features

## Adaptive Icons (Android)

For Android adaptive icons, provide:
- Foreground layer (108x108 safe zone in 432x432)
- Background layer (108x108 in 432x432)

See: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
