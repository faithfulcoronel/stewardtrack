# App Store Preparation Guide

This document outlines the requirements and steps for publishing StewardTrack to the Apple App Store and Google Play Store.

## Table of Contents

1. [Pre-Submission Checklist](#pre-submission-checklist)
2. [Apple App Store](#apple-app-store)
3. [Google Play Store](#google-play-store)
4. [Screenshots and Assets](#screenshots-and-assets)
5. [Privacy Policy](#privacy-policy)
6. [Marketing Materials](#marketing-materials)

---

## Pre-Submission Checklist

### Technical Requirements

- [ ] App launches without crash on iOS (iPhone, iPad)
- [ ] App launches without crash on Android (phones, tablets)
- [ ] All critical user flows work correctly
- [ ] Push notifications function properly
- [ ] Biometric authentication works
- [ ] Offline mode works (cached data displays)
- [ ] Deep links function correctly
- [ ] No placeholder content in UI
- [ ] All API endpoints point to production
- [ ] Analytics and crash reporting configured
- [ ] ProGuard/R8 enabled for Android release builds
- [ ] App Transport Security configured for iOS

### Content Requirements

- [ ] App description written (see below)
- [ ] Keywords researched and selected
- [ ] Screenshots for all required device sizes
- [ ] App preview videos (optional but recommended)
- [ ] Privacy policy URL active
- [ ] Support URL active
- [ ] Marketing website URL active

---

## Apple App Store

### App Store Connect Setup

1. **Create App Record**
   - Log in to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to My Apps → + New App
   - Platform: iOS
   - Bundle ID: `com.stewardtrack.app`
   - SKU: `stewardtrack-ios-001`
   - App Name: StewardTrack

2. **App Information**
   - Primary Language: English (U.S.)
   - Category: Business
   - Secondary Category: Productivity
   - Content Rights: Does not contain third-party content

3. **Pricing and Availability**
   - Price: Free (in-app subscriptions)
   - Availability: All territories
   - Pre-order: No

### Required App Store Information

**App Name (30 characters)**
```
StewardTrack
```

**Subtitle (30 characters)**
```
Church Management Made Simple
```

**Promotional Text (170 characters)**
```
Streamline your church operations with powerful membership management, donation tracking, event planning, and team coordination tools. Free to start, scales with your church.
```

**Description (4000 characters max)**
```
StewardTrack is the modern church management solution designed to simplify how you run your congregation.

KEY FEATURES:

MEMBER MANAGEMENT
- Complete member directory with profiles and photos
- Track family relationships and households
- Manage membership status and milestones
- Search and filter members instantly

GIVING & DONATIONS
- Track tithes, offerings, and special gifts
- Generate giving statements for tax purposes
- View giving trends and reports
- Support for multiple funds and campaigns

EVENT MANAGEMENT
- Create and manage church events
- Track RSVPs and attendance
- Send event reminders and updates
- Coordinate volunteers and resources

MINISTRY TEAMS
- Organize ministry groups and teams
- Manage volunteer schedules
- Track participation and involvement
- Communicate with team members

SECURE & PRIVATE
- Bank-level data encryption
- Role-based access control
- Multi-factor authentication
- GDPR and privacy compliant

StewardTrack is trusted by churches of all sizes to manage their congregation effectively. Whether you're a small community church or a multi-campus organization, our flexible platform grows with you.

Start free today and experience the difference that modern church management software can make.

Questions? Contact us at support@stewardtrack.com
```

**Keywords (100 characters)**
```
church,management,membership,donation,giving,ministry,congregation,volunteer,events,directory
```

**Support URL**
```
https://stewardtrack.com/support
```

**Marketing URL**
```
https://stewardtrack.com
```

**Privacy Policy URL**
```
https://stewardtrack.com/privacy
```

### iOS Screenshots Required

| Device | Size (pixels) | Orientation |
|--------|---------------|-------------|
| iPhone 6.9" (15 Pro Max, 16 Pro Max) | 1320 × 2868 | Portrait |
| iPhone 6.7" (12-16 Pro Max, Plus) | 1290 × 2796 | Portrait |
| iPhone 6.5" (11 Pro Max, XS Max) | 1242 × 2688 | Portrait |
| iPhone 5.5" (6+, 7+, 8+) | 1242 × 2208 | Portrait |
| iPad Pro 12.9" 6th gen | 2048 × 2732 | Portrait/Landscape |
| iPad Pro 12.9" 2nd gen | 2048 × 2732 | Portrait/Landscape |

### App Review Information

**Contact Information**
- First Name: [Your Name]
- Last Name: [Your Last Name]
- Phone: [Your Phone]
- Email: [Your Email]

**Demo Account**
- Username: demo@stewardtrack.com
- Password: [Demo Password]

**Notes for Reviewer**
```
StewardTrack is a church management application. To test the full functionality:

1. Log in with the demo account provided
2. You will see a sample church organization with members, events, and giving data
3. Key features to test:
   - Member directory (Home > Members)
   - Giving records (Home > Giving)
   - Events calendar (Home > Events)
   - Ministry teams (Home > Teams)

The app requires an internet connection for most features. Cached data is available offline for viewing.

Push notifications require a physical device to test fully.

Biometric authentication can be tested on devices with Face ID or Touch ID.
```

### Age Rating

- Made for Kids: No
- Age Rating: 4+ (no objectionable content)
- Gambling: None
- Medical/Health: None
- Violence: None
- Profanity: None

---

## Google Play Store

### Play Console Setup

1. **Create App**
   - Log in to [Google Play Console](https://play.google.com/console)
   - Create app → Enter app details
   - App name: StewardTrack
   - Default language: English (United States)
   - App type: App (not game)
   - Free or paid: Free

2. **Store Settings**
   - Category: Business
   - Tags: Church, Management, Productivity
   - Contact email: support@stewardtrack.com
   - Contact phone: [Your Phone]
   - Contact website: https://stewardtrack.com

### Required Play Store Information

**Short Description (80 characters)**
```
Church management made simple. Members, giving, events, and teams in one app.
```

**Full Description (4000 characters)**
```
[Same as App Store description above]
```

### Google Play Screenshots Required

| Device | Size (pixels) | Count |
|--------|---------------|-------|
| Phone | 1080 × 1920 (min) | 2-8 |
| 7-inch tablet | 1200 × 1920 | 0-8 (optional) |
| 10-inch tablet | 1920 × 1200 | 0-8 (optional) |

### Feature Graphic

- Size: 1024 × 500 pixels
- Format: JPEG or 24-bit PNG
- No text in top/bottom 15%
- Logo centered

### App Icon

- Size: 512 × 512 pixels
- Format: 32-bit PNG
- No transparency allowed
- No badge or text overlays

### Content Rating

Complete the content rating questionnaire:
- Violence: None
- Sexual content: None
- Language: None
- Controlled substances: None
- User-generated content: No
- Location sharing: No
- Data collection: Yes (with consent)

**Result:** Rated for All (E for Everyone)

### Data Safety Section

**Data Collected:**
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name | Yes | No | App functionality |
| Email | Yes | No | Account management |
| Phone | Optional | No | App functionality |
| Address | Optional | No | App functionality |
| Photos | Optional | No | Profile pictures |
| App interactions | Yes | No | Analytics |
| Crash logs | Yes | No | App stability |

**Security Practices:**
- Data encrypted in transit: Yes
- Data can be deleted: Yes (upon request)
- Independent security review: No

---

## Screenshots and Assets

### Screenshot Guidelines

1. **Show Real Features**
   - Member directory with sample data
   - Giving dashboard with charts
   - Event calendar view
   - Ministry team management

2. **Add Descriptive Captions**
   - "Manage your congregation"
   - "Track giving and donations"
   - "Plan events effortlessly"
   - "Coordinate ministry teams"

3. **Consistent Branding**
   - Use StewardTrack brand colors
   - Include app icon in corner
   - Maintain visual consistency

4. **Device Frames**
   - Use device frames for context
   - Match device to screenshot size

### Screenshot Content Suggestions

1. **Dashboard** - Overview with key metrics
2. **Member List** - Searchable directory
3. **Member Profile** - Detailed member view
4. **Giving Summary** - Charts and totals
5. **Event Calendar** - Upcoming events
6. **Team Management** - Ministry teams

### App Preview Video (Optional)

- Duration: 15-30 seconds
- No audio narration required
- Show key user flows
- Highlight unique features

---

## Privacy Policy

### Required Privacy Policy Contents

```
STEWARDTRACK PRIVACY POLICY

Last Updated: [Date]

1. INFORMATION WE COLLECT

Personal Information:
- Name, email address, phone number
- Church membership information
- Profile photos
- Giving and donation records

Usage Information:
- App usage analytics
- Device information
- Crash reports

2. HOW WE USE YOUR INFORMATION

- To provide church management services
- To process donations and giving records
- To send notifications and updates
- To improve our services
- To ensure app security

3. DATA SHARING

We do not sell your personal information. We may share data with:
- Your church organization (as member data)
- Service providers (hosting, analytics)
- Legal requirements (when required by law)

4. DATA SECURITY

- All data encrypted in transit (HTTPS/TLS)
- Data encrypted at rest
- Regular security audits
- Access controls and authentication

5. YOUR RIGHTS

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data
- Export your data
- Opt out of marketing

6. CHILDREN'S PRIVACY

We do not knowingly collect data from children under 13.

7. CONTACT US

Email: privacy@stewardtrack.com
Address: [Your Business Address]

8. CHANGES TO THIS POLICY

We may update this policy periodically. Check this page for updates.
```

---

## Marketing Materials

### App Store Feature Graphic Template

```
+--------------------------------------------------+
|                                                  |
|    [StewardTrack Logo]                          |
|                                                  |
|    Church Management                             |
|    Made Simple                                   |
|                                                  |
|    [Screenshot Preview]                          |
|                                                  |
+--------------------------------------------------+
```

### Press Kit Contents

- High-resolution logo (PNG, SVG)
- App screenshots (all sizes)
- Feature graphic
- App icon (various sizes)
- Brand guidelines
- Press release template

### Launch Checklist

- [ ] All store listings complete
- [ ] Screenshots uploaded for all device sizes
- [ ] Privacy policy live at URL
- [ ] Support page live at URL
- [ ] Demo account credentials ready
- [ ] App submitted for review
- [ ] Marketing emails prepared
- [ ] Social media posts scheduled
- [ ] Press release drafted
- [ ] Launch announcement ready

---

## Submission Timeline

### TestFlight (iOS Beta)

1. Archive build in Xcode
2. Upload to App Store Connect
3. Add internal testers
4. Submit for TestFlight review (24-48 hours)
5. Invite external testers

### Play Store Internal Testing

1. Generate signed APK/AAB
2. Upload to Internal Testing track
3. Add tester email addresses
4. Testers install via Play Store

### Production Release

1. Complete all store listings
2. Submit for review
3. iOS: 24-48 hours typically
4. Android: Few hours to 7 days
5. Monitor for rejection feedback
6. Address any issues and resubmit
7. Approve for release when ready

---

## Post-Launch

### Monitoring

- Monitor crash reports (Firebase Crashlytics)
- Track user reviews and ratings
- Respond to support requests
- Monitor app analytics

### Updates

- Plan regular update schedule
- Address critical bugs immediately
- Add new features based on feedback
- Keep dependencies updated

### User Support

- Respond to reviews professionally
- Maintain FAQ and help documentation
- Provide email support channel
- Consider in-app chat support
