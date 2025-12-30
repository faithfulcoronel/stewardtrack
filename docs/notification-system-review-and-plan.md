# Notification System Review and Implementation Plan

## Implementation Status (Updated 2025-12-30)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation (Database) | ✅ COMPLETE | All tables created, RLS policies applied |
| Phase 2: Service Layer | ✅ COMPLETE | NotificationBusService + All 5 Channels implemented |
| Phase 3: API Layer | ✅ COMPLETE | All CRUD endpoints + Preferences API |
| Phase 4: UI Components | ✅ COMPLETE | NotificationBell + NotificationCenter + Preferences UI + Integration Settings |
| Phase 5: Event Publishing | ✅ COMPLETE | All core domain services integrated with notifications |
| Phase 6: Premium Features | ✅ COMPLETE | All UI components implemented (Templates, Analytics, Scheduled) |

### What's Implemented
- ✅ Database: `notifications`, `notification_queue`, `notification_preferences`, `notification_templates` tables
- ✅ Models: `notification.model.ts`, `notificationQueue.model.ts`, `notificationPreference.model.ts`, `notificationTemplate.model.ts`, `notificationEvent.model.ts`
- ✅ Adapters: All 4 notification adapters (`notification.adapter.ts`, `notificationQueue.adapter.ts`, `notificationPreference.adapter.ts`, `notificationTemplate.adapter.ts`)
- ✅ Repositories: All 4 notification repositories
- ✅ Services: `NotificationService`, `NotificationQueueService`, `NotificationBusService`, `ChannelDispatcher`
- ✅ Channels: `InAppChannel`, `EmailChannel`, `SmsChannel`, `PushChannel`, `WebhookChannel`
- ✅ API Routes: `/api/notifications/*` (GET, POST, PATCH, DELETE, mark-read, mark-all-read, unread-count)
- ✅ API Routes: `/api/notifications/preferences` (GET, POST, DELETE) - Preferences management
- ✅ UI: `NotificationBell.tsx`, `NotificationCenter.tsx`
- ✅ UI: `AdminNotificationPreferences.tsx` - Metadata-based dynamic component in settings page
- ✅ UI: `AdminIntegrationSettings.tsx` - Twilio SMS and Email provider configuration
- ✅ UI: `AdminSettingsTabs.tsx` - Tabbed settings with URL-based tab tracking
- ✅ React Hook: `useNotifications.ts` for realtime client updates via Supabase Realtime
- ✅ Feature Codes: Added to `feature_catalog` in migration
- ✅ Event Types: Care Plan and Discipleship Plan events added
- ✅ Service Integration: `MemberCarePlanService`, `MemberDiscipleshipPlanService`, `MemberService`, `RbacDelegationService`, `LicenseMonitoringService` send notifications
- ✅ Templates: Email/SMS/In-App templates for care plan and discipleship plan assignments
- ✅ Metadata Integration: All settings components registered in component registry and settings XML blueprint

### Channel Implementation Summary

| Channel | File | Feature Code | Tier | Provider |
|---------|------|--------------|------|----------|
| In-App | `InAppChannel.ts` | notifications-inapp | Essential | Supabase DB |
| Email | `EmailChannel.ts` | notifications-email | Essential | Resend API |
| SMS | `SmsChannel.ts` | notifications-sms | Professional | Twilio REST API |
| Push | `PushChannel.ts` | notifications-push | Professional | Firebase Cloud Messaging |
| Webhook | `WebhookChannel.ts` | notifications-webhooks | Enterprise | HTTP POST with HMAC-SHA256 |

### Settings Page UI Architecture

The notification and integration settings are integrated into a tabbed settings page at `/admin/settings`:

#### Settings Tabs Component

| Component | Location | Description |
|-----------|----------|-------------|
| `AdminSettingsTabs` | `src/components/dynamic/admin/AdminSettingsTabs.tsx` | Tabbed navigation with URL tracking |

**Features:**
- URL-based tab tracking via `?tab=` query parameter (e.g., `/admin/settings?tab=notifications`)
- Browser back/forward navigation support
- Mobile-first responsive design (pill tabs on mobile, sidebar on desktop)
- Shareable/bookmarkable tab URLs

#### Tab Content Components

| Tab | Component | Description |
|-----|-----------|-------------|
| General | `AdminDetailPanels` + `AdminFormSection` | Tenant profile + global settings form |
| Notifications | `AdminNotificationPreferences` | Channel preferences, quiet hours, digest options |
| Integrations | `AdminIntegrationSettings` | Twilio SMS, Email, and Webhook provider configuration |
| Templates | `AdminNotificationTemplates` | Template management with RichTextEditor (Enterprise) |
| Analytics | `AdminNotificationAnalytics` | Delivery metrics and channel performance (Premium) |
| Scheduled | `AdminScheduledNotifications` | View and manage scheduled notifications (Enterprise) |

#### Component Registry

| Component | Location | Description |
|-----------|----------|-------------|
| `AdminNotificationPreferences` | `src/components/dynamic/admin/AdminNotificationPreferences.tsx` | Mobile-first preferences component |
| `AdminIntegrationSettings` | `src/components/dynamic/admin/AdminIntegrationSettings.tsx` | Twilio/Email/Webhook provider config UI |
| `AdminNotificationTemplates` | `src/components/dynamic/admin/AdminNotificationTemplates.tsx` | Template CRUD with RichTextEditor for email/in_app |
| `AdminNotificationAnalytics` | `src/components/dynamic/admin/AdminNotificationAnalytics.tsx` | Delivery metrics dashboard |
| `AdminScheduledNotifications` | `src/components/dynamic/admin/AdminScheduledNotifications.tsx` | Scheduled notifications management |
| `AdminSettingsTabs` | `src/components/dynamic/admin/AdminSettingsTabs.tsx` | Tabbed container with URL sync |
| Component Registry | `src/lib/metadata/components/admin.tsx` | All components registered |
| Settings Blueprint | `metadata/authoring/blueprints/admin-settings/settings-overview.xml` | XML page definition |
| Service Handler | `src/lib/metadata/services/admin-settings.ts` | Provides all settings data |

#### Integration Settings Features

| Provider | Features | Status |
|----------|----------|--------|
| Twilio (SMS) | Account SID, Auth Token, Phone Number configuration | ✅ Complete |
| Email (Resend) | API Key, From Email, From Name configuration | ✅ Complete |
| Webhook | URL, Signing Secret, Test functionality | ✅ Complete |

**Features:**
- Save and retrieve integration credentials via Settings API
- Test SMS/Email/Webhook delivery from the settings UI
- Masked display of sensitive fields (tokens, API keys, secrets)
- Verification status badges (Verified, Not Tested, Not Configured)
- HMAC-SHA256 signature verification for webhook payloads

#### Template Management Features (Enterprise)

| Feature | Description | Status |
|---------|-------------|--------|
| Template CRUD | Create, edit, delete notification templates | ✅ Complete |
| RichTextEditor | TipTap-based HTML editor for email/in_app channels | ✅ Complete |
| Plain Text | Simple textarea for SMS/push/webhook channels | ✅ Complete |
| Channel-specific UI | Different editors based on channel type | ✅ Complete |
| Variable Support | `{{variable}}` syntax for dynamic content | ✅ Complete |
| HTML Preview | Rendered preview for email/in_app templates | ✅ Complete |
| Event Type Grouping | Templates grouped by event type | ✅ Complete |
| System Templates | Read-only system default templates | ✅ Complete |

#### Analytics Dashboard Features (Premium)

| Feature | Description | Status |
|---------|-------------|--------|
| Delivery Summary | Total, delivered, pending, failed, scheduled counts | ✅ Complete |
| Delivery Rate | Percentage of successful deliveries | ✅ Complete |
| Channel Breakdown | Stats per channel (email, sms, in_app, push, webhook) | ✅ Complete |
| Trend Charts | Delivery trends over time | ✅ Complete |
| Date Range Filter | Filter analytics by time period | ✅ Complete |

#### Scheduled Notifications Features (Enterprise)

| Feature | Description | Status |
|---------|-------------|--------|
| Scheduled List | View all scheduled notifications | ✅ Complete |
| Cancel/Reschedule | Manage scheduled notifications | ✅ Complete |
| Status Tracking | Pending, processing, completed, failed states | ✅ Complete |
| Channel Display | Visual channel indicators | ✅ Complete |

### Service Integrations (Phase 5) - COMPLETE

| Service | Event Types | Status | Description |
|---------|-------------|--------|-------------|
| `MemberCarePlanService` | CARE_PLAN_ASSIGNED | ✅ Complete | Notifies members when care plan is assigned |
| `MemberDiscipleshipPlanService` | DISCIPLESHIP_PLAN_ASSIGNED | ✅ Complete | Notifies members when discipleship plan is assigned |
| `MemberService` | MEMBER_JOINED | ✅ Complete | Welcome notification for new members with linked accounts |
| `RbacDelegationService` | DELEGATION_ASSIGNED | ✅ Complete | Notifies users when roles are delegated to them |
| `LicenseMonitoringService` | LICENSE_EXPIRING | ✅ Complete | Alerts tenant admins on license expiration/seat limits |

**Note:** The `DonationService` (IncomeExpenseTransactionService) is a batch-oriented financial transaction service that doesn't have member context for individual donation notifications. Donation receipts would typically be handled separately via email templates.

### What's Still Missing (Phase 6 - Premium Features) - ALL COMPLETE ✅
- ✅ Scheduled notifications UI (Enterprise feature) - `AdminScheduledNotifications` component
- ✅ Analytics dashboard UI (Premium feature) - `AdminNotificationAnalytics` component
- ✅ Template management UI (Enterprise feature) - `AdminNotificationTemplates` with RichTextEditor
- ✅ Firebase Push Notifications - Complete implementation with device token management
- ✅ Integration credentials API endpoints (save/validate Twilio, Email, Webhook settings)
- ✅ Webhook URL configuration UI (for WebhookChannel)
- ✅ Test notification functionality (send test SMS/Email/Webhook from settings)

### Firebase Push Notifications Implementation (COMPLETE)

| Component | Location | Status |
|-----------|----------|--------|
| Database Migration | `supabase/migrations/20251229233625_add_push_device_tokens.sql` | ✅ Complete |
| Model | `src/models/notification/pushDeviceToken.model.ts` | ✅ Complete |
| Adapter | `src/adapters/pushDeviceToken.adapter.ts` | ✅ Complete |
| Repository | `src/repositories/pushDeviceToken.repository.ts` | ✅ Complete |
| Service | `src/services/PushDeviceTokenService.ts` | ✅ Complete |
| API Routes | `src/app/api/notifications/device-tokens/route.ts` | ✅ Complete |
| Client Integration | `src/lib/firebase/index.ts` | ✅ Complete |
| Service Worker | `public/firebase-messaging-sw.js` | ✅ Complete |
| DI Container | `src/lib/container.ts` + `src/lib/types.ts` | ✅ Complete |

**API Endpoints:**
- `POST /api/notifications/device-tokens` - Register device token
- `GET /api/notifications/device-tokens` - Get user's device tokens
- `DELETE /api/notifications/device-tokens` - Delete all user tokens
- `DELETE /api/notifications/device-tokens/[token]` - Delete specific token

**Client Functions (`src/lib/firebase/index.ts`):**
- `initializeFirebaseMessaging()` - Initialize Firebase app
- `requestNotificationPermission()` - Request browser permission and get FCM token
- `registerDeviceToken()` - Register token with backend
- `unregisterDeviceToken()` - Remove token from backend
- `onForegroundMessage()` - Handle foreground push notifications
- `getCurrentToken()` - Get current FCM token
- `isPushSupported()` - Check browser support
- `isFirebaseConfigured()` - Check environment variables

### Firebase Service Account Setup (Push Notifications)

To enable push notifications via Firebase Cloud Messaging (FCM), follow these steps:

#### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or select an existing project)
3. Enter a project name (e.g., "StewardTrack-Push")
4. Optionally enable Google Analytics
5. Click **Create project**

#### Step 2: Enable Cloud Messaging

1. In the Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to the **Cloud Messaging** tab
3. Note your **Server Key** (legacy) or ensure FCM API is enabled

#### Step 3: Create a Service Account

1. In Firebase Console, go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Confirm by clicking **Generate key**
4. A JSON file will download - this is your service account credentials

**Important:** Keep this file secure. Never commit it to version control.

#### Step 4: Extract Required Values

Open the downloaded JSON file and extract these values:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",        // → FIREBASE_PROJECT_ID
  "private_key": "-----BEGIN PRIVATE...", // → FIREBASE_PRIVATE_KEY
  "client_email": "firebase-adminsdk-...", // → FIREBASE_CLIENT_EMAIL
  ...
}
```

#### Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Firebase Push Notifications (Professional+ tier)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

**Note:** The `FIREBASE_PRIVATE_KEY` must:
- Be wrapped in double quotes
- Keep the `\n` newline characters intact
- Include the full key from `-----BEGIN` to `-----END`

#### Step 6: Configure Web Push (Optional - for Browser Notifications)

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Under **Web configuration**, click **Generate key pair**
3. Copy the generated VAPID key
4. Add to your frontend configuration:

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token;
  }
  return null;
}
```

#### Step 7: Install Firebase Admin SDK

```bash
npm install firebase-admin
```

#### Step 8: Verify PushChannel Configuration

The `PushChannel` service at `src/services/notification/channels/PushChannel.ts` should be configured to use Firebase Admin SDK:

```typescript
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (do this once at app startup)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Send push notification
async function sendPushNotification(token: string, title: string, body: string) {
  const message = {
    notification: { title, body },
    token,
  };

  const response = await admin.messaging().send(message);
  return response;
}
```

#### Step 9: Device Token Storage

To send push notifications, you need to store user device tokens. Create a migration for device tokens:

```sql
CREATE TABLE push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('web', 'ios', 'android')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, token)
);

-- RLS policies
ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own device tokens"
  ON push_device_tokens FOR ALL
  USING (user_id = auth.uid());
```

#### Troubleshooting

| Issue | Solution |
|-------|----------|
| `FIREBASE_PRIVATE_KEY` parsing error | Ensure the key is wrapped in quotes and `\n` characters are preserved |
| "messaging/invalid-registration-token" | The device token has expired or is invalid - remove from database |
| "messaging/registration-token-not-registered" | User has uninstalled the app or disabled notifications |
| Push not working in development | FCM requires HTTPS; use ngrok or deploy to staging |
| Rate limiting errors | FCM has quotas; implement exponential backoff |

#### Security Best Practices

1. **Never expose service account credentials** in client-side code
2. Store credentials in environment variables, not in code
3. Use separate Firebase projects for development/staging/production
4. Rotate service account keys periodically
5. Implement token refresh logic for expired device tokens

---

## Executive Summary

This document provides a comprehensive review of the current notification system in StewardTrack and outlines an implementation plan for a robust, multi-channel notification service using a Service Bus pattern.

---

## Part 1: Current Implementation Review

### 1.1 What Exists

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Database Table | Partial | `migrations/20250617222702_steep_mode.sql` | Missing `expires_at` and `metadata` columns |
| Domain Model | Complete | `src/models/notification.model.ts` | Has `expires_at` and `metadata` (schema mismatch) |
| Validator | Complete | `src/validators/notification.validator.ts` | Validates title, message, type |
| Adapter | Complete | `src/adapters/notification.adapter.ts` | Includes realtime subscription support |
| Repository | Complete | `src/repositories/notification.repository.ts` | Uses `expires_at` (will fail until schema fixed) |
| DI Type Symbol | Partial | `src/lib/types.ts` | Only `INotificationAdapter` exists |
| DI Container Binding | Missing | `src/lib/container.ts` | Not bound |
| API Routes | Missing | - | No endpoints |
| UI Bell Component | Placeholder | `src/components/admin/layout-shell.tsx:116-122` | Non-functional button |
| Notification Center UI | Missing | - | No dropdown/panel |
| Console Notification Service | Complete | `src/services/NotificationService.ts` | Handler pattern for server-side messages |

### 1.2 Database Schema Analysis

**Current Schema (from migration):**
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  tenant_id UUID REFERENCES tenants,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('success', 'info', 'warning', 'error')),
  action_type TEXT CHECK (action_type IN ('redirect', 'modal', 'none')),
  action_payload TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Missing Columns (required by code):**
- `expires_at` - Used by repository for auto-expiration (30-day default)
- `metadata` - JSONB field for extensible notification data

**RLS Policy Issues:**
All policies use `true` instead of proper user isolation:
```sql
-- Current (too permissive):
USING (true)

-- Should be:
USING (user_id = auth.uid())
```

### 1.3 Existing Notification Bell (Non-Functional)

Located at `src/components/admin/layout-shell.tsx:116-122`:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="flex-none rounded-full border border-border/60 text-muted-foreground"
>
  <Bell className="size-4" />
</Button>
```

**Missing:**
- Click handler
- Dropdown menu/notification center
- Unread count badge
- Realtime updates
- Mark as read functionality

### 1.4 Email Service (Existing)

**Edge Function:** `supabase/functions/email-service/index.ts`
- Uses Resend API
- Template-based (currently only `invite-user` template)
- Called from PostgreSQL via `pg_net`
- Synchronous, no retry logic, no queuing

### 1.5 What's Lacking

1. **No Multi-Channel Support**
   - No abstraction for different delivery channels
   - Email is tightly coupled to member invitations
   - No SMS integration
   - No push notification support

2. **No Message Queue**
   - All operations synchronous
   - No retry logic for failed deliveries
   - No dead letter queue
   - No rate limiting

3. **No Notification Preferences**
   - Users cannot choose notification channels
   - No digest/batching options
   - No do-not-disturb settings

4. **No Category System**
   - Cannot subscribe/unsubscribe from notification types
   - No priority levels
   - No grouping

5. **Missing Premium Features**
   - No scheduled notifications
   - No notification templates
   - No analytics/tracking
   - No webhook delivery

---

## Part 2: Proposed Architecture

### 2.1 Service Bus Pattern Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NOTIFICATION SERVICE BUS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌─────────────────┐     ┌───────────────────────┐ │
│  │   PUBLISHER  │────▶│  MESSAGE QUEUE  │────▶│  CHANNEL DISPATCHER   │ │
│  │   (Events)   │     │  (PostgreSQL)   │     │  (Strategy Pattern)   │ │
│  └──────────────┘     └─────────────────┘     └───────────────────────┘ │
│         │                      │                         │              │
│         │                      │                         ▼              │
│         │             ┌────────┴────────┐     ┌───────────────────────┐ │
│         │             │  DEAD LETTER    │     │   DELIVERY CHANNELS   │ │
│         │             │  QUEUE          │     ├───────────────────────┤ │
│         │             └─────────────────┘     │ • In-App (Database)   │ │
│         │                                     │ • Email (Resend)      │ │
│         │                                     │ • SMS (Twilio)        │ │
│         │                                     │ • Push (FCM/APNs)     │ │
│         │                                     │ • Webhook (HTTP)      │ │
│         ▼                                     └───────────────────────┘ │
│  ┌──────────────┐                                        │              │
│  │  PREFERENCES │◀───────────────────────────────────────┘              │
│  │  (User)      │     Channels filtered by user preferences             │
│  └──────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Components

#### 2.2.1 NotificationEvent (Publisher Side)
```typescript
interface NotificationEvent {
  id: string;
  eventType: NotificationEventType;       // 'member.invited', 'donation.received', etc.
  category: NotificationCategory;          // 'system', 'member', 'finance', 'event'
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tenantId: string;
  recipientId: string;                     // User ID
  recipientEmail?: string;                 // For email channel
  recipientPhone?: string;                 // For SMS channel
  payload: Record<string, unknown>;        // Template variables
  channels?: DeliveryChannel[];            // Override default channels
  scheduledFor?: Date;                     // Future delivery
  expiresAt?: Date;                        // TTL
  metadata?: Record<string, unknown>;      // Tracking, correlation IDs
}
```

#### 2.2.2 DeliveryChannel Interface (Strategy Pattern)
```typescript
interface IDeliveryChannel {
  readonly channelType: DeliveryChannelType;
  readonly isAvailable: boolean;

  send(message: NotificationMessage): Promise<DeliveryResult>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  validateRecipient(recipient: RecipientInfo): Promise<boolean>;
}

type DeliveryChannelType = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';

interface DeliveryResult {
  success: boolean;
  messageId?: string;
  providerMessageId?: string;
  error?: string;
  retryable?: boolean;
}
```

#### 2.2.3 Message Queue (PostgreSQL-based)
```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY,
  notification_event JSONB NOT NULL,
  channel DeliveryChannelType NOT NULL,
  status QueueStatus DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead'))
);

CREATE INDEX idx_queue_pending ON notification_queue (next_attempt_at)
  WHERE status = 'pending';
```

### 2.3 Feature Code Gating

Each notification capability is controlled via a **feature code** in the `feature_catalog` table, consistent with the metadata XML pattern used throughout StewardTrack. Features are checked using the `hasFeatureAccess()` function from `src/lib/metadata/evaluation.ts` or the `LicenseGate` from `src/lib/access-gate/strategies.ts`.

#### 2.3.1 Notification Feature Codes

| Feature Code | Name | Category | Tier | Description |
|--------------|------|----------|------|-------------|
| `notifications-inapp` | In-App Notifications | notifications | essential | Basic in-app notification bell and center |
| `notifications-email` | Email Notifications | notifications | essential | Email delivery channel for notifications |
| `notifications-sms` | SMS Notifications | notifications | professional | SMS/text message delivery via Twilio |
| `notifications-push` | Push Notifications | notifications | professional | Mobile/web push notifications via FCM |
| `notifications-scheduled` | Scheduled Notifications | notifications | enterprise | Schedule notifications for future delivery |
| `notifications-webhooks` | Webhook Delivery | notifications | enterprise | HTTP webhook delivery to external systems |
| `notifications-templates` | Custom Templates | notifications | enterprise | Tenant-customizable notification templates |
| `notifications-analytics` | Notification Analytics | notifications | premium | Delivery metrics, open rates, engagement |
| `notifications-priority` | Priority Routing | notifications | premium | Urgent/high priority bypass and routing |
| `notifications-digest` | Digest & Batching | notifications | professional | Batch notifications into digests |

#### 2.3.2 Feature Code Usage Pattern

**In Service Layer (using LicenseGate):**
```typescript
import { LicenseGate } from '@/lib/access-gate/strategies';

async function sendSmsNotification(userId: string, tenantId: string, message: NotificationMessage) {
  const gate = new LicenseGate('notifications-sms');
  const result = await gate.check(userId, tenantId);

  if (!result.allowed) {
    // Feature not available - fall back to in-app only
    return this.sendInAppNotification(userId, tenantId, message);
  }

  // Proceed with SMS delivery
  return this.smsChannel.send(message);
}
```

**In Metadata XML (for UI gating):**
```xml
<component id="sms-settings" type="NotificationSmsSettings">
  <featureCode>notifications-sms</featureCode>
  <props>
    <prop name="title" kind="static" value="SMS Notifications" />
  </props>
</component>
```

**In React Components (using ProtectedSection):**
```tsx
import { ProtectedSection } from '@/components/access-gate/ProtectedSection';

<ProtectedSection featureCode="notifications-sms">
  <SmsNotificationSettings />
</ProtectedSection>
```

#### 2.3.3 Feature Catalog Entries (Migration)

```sql
-- Insert notification feature codes into feature_catalog
INSERT INTO feature_catalog (code, name, category, description, tier, phase, is_active, is_delegatable)
VALUES
  ('notifications-inapp', 'In-App Notifications', 'notifications',
   'Basic notification bell with unread count and notification center', 'essential', 'ga', true, false),

  ('notifications-email', 'Email Notifications', 'notifications',
   'Email delivery channel for important notifications', 'essential', 'ga', true, false),

  ('notifications-sms', 'SMS Notifications', 'notifications',
   'SMS/text message delivery via Twilio integration', 'professional', 'ga', true, true),

  ('notifications-push', 'Push Notifications', 'notifications',
   'Mobile and web push notifications via Firebase Cloud Messaging', 'professional', 'ga', true, true),

  ('notifications-digest', 'Digest & Batching', 'notifications',
   'Batch notifications into hourly, daily, or weekly digests', 'professional', 'ga', true, true),

  ('notifications-scheduled', 'Scheduled Notifications', 'notifications',
   'Schedule notifications for future delivery with recurring support', 'enterprise', 'ga', true, true),

  ('notifications-webhooks', 'Webhook Delivery', 'notifications',
   'HTTP webhook delivery to external systems with retry logic', 'enterprise', 'ga', true, true),

  ('notifications-templates', 'Custom Templates', 'notifications',
   'Tenant-customizable notification templates with variables', 'enterprise', 'ga', true, true),

  ('notifications-analytics', 'Notification Analytics', 'notifications',
   'Delivery metrics, open rates, click tracking, and engagement dashboard', 'premium', 'ga', true, true),

  ('notifications-priority', 'Priority Routing', 'notifications',
   'Urgent and high-priority notification bypass and smart routing', 'premium', 'ga', true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier;
```

#### 2.3.4 License Feature Bundle Assignments

Each product offering (Essential, Professional, Enterprise, Premium) includes specific notification features via `license_feature_bundles`:

| Product Offering | Included Feature Codes |
|------------------|------------------------|
| Essential | `notifications-inapp`, `notifications-email` |
| Professional | All Essential + `notifications-sms`, `notifications-push`, `notifications-digest` |
| Enterprise | All Professional + `notifications-scheduled`, `notifications-webhooks`, `notifications-templates` |
| Premium | All Enterprise + `notifications-analytics`, `notifications-priority` |

#### 2.3.5 Channel Dispatcher Feature Check

The `ChannelDispatcher` checks feature codes before attempting delivery:

```typescript
@injectable()
export class ChannelDispatcher {
  constructor(
    @inject(TYPES.RbacFeatureService) private featureService: RbacFeatureService,
  ) {}

  async dispatch(event: NotificationEvent, channels: DeliveryChannelType[]): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];

    for (const channelType of channels) {
      const featureCode = this.getFeatureCodeForChannel(channelType);

      // Check if tenant has access to this channel
      const hasAccess = await this.featureService.hasFeatureAccess(
        featureCode,
        event.tenantId
      );

      if (!hasAccess) {
        results.push({
          channel: channelType,
          status: 'skipped',
          reason: `Feature ${featureCode} not available for tenant`,
        });
        continue;
      }

      // Dispatch to channel
      const channel = this.resolveChannel(channelType);
      const result = await channel.send(event);
      results.push({ channel: channelType, ...result });
    }

    return results;
  }

  private getFeatureCodeForChannel(channel: DeliveryChannelType): string {
    const mapping: Record<DeliveryChannelType, string> = {
      'in_app': 'notifications-inapp',
      'email': 'notifications-email',
      'sms': 'notifications-sms',
      'push': 'notifications-push',
      'webhook': 'notifications-webhooks',
    };
    return mapping[channel];
  }
}

#### 2.3.6 Feature Permissions (RBAC)

Each notification feature has associated permissions for fine-grained access control. These are stored in `feature_permissions` table:

```sql
-- Permissions for notifications-inapp feature
INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:view', 'View Notifications', 'notifications', 'view', true
FROM feature_catalog fc WHERE fc.code = 'notifications-inapp';

INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:dismiss', 'Dismiss Notifications', 'notifications', 'dismiss', false
FROM feature_catalog fc WHERE fc.code = 'notifications-inapp';

-- Permissions for notifications-templates feature
INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:templates:view', 'View Templates', 'notifications', 'view', true
FROM feature_catalog fc WHERE fc.code = 'notifications-templates';

INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:templates:edit', 'Edit Templates', 'notifications', 'edit', false
FROM feature_catalog fc WHERE fc.code = 'notifications-templates';

-- Permissions for notifications-analytics feature
INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:analytics:view', 'View Analytics', 'notifications', 'view', true
FROM feature_catalog fc WHERE fc.code = 'notifications-analytics';

INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:analytics:export', 'Export Analytics', 'notifications', 'export', false
FROM feature_catalog fc WHERE fc.code = 'notifications-analytics';

-- Admin permissions for queue management
INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:admin:queue', 'Manage Queue', 'notifications', 'admin', false
FROM feature_catalog fc WHERE fc.code = 'notifications-inapp';

INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action, is_required)
SELECT fc.id, 'notifications:admin:broadcast', 'Send Broadcast', 'notifications', 'admin', false
FROM feature_catalog fc WHERE fc.code = 'notifications-inapp';
```

**Permission Hierarchy:**
| Permission Code | Description | Default Roles |
|----------------|-------------|---------------|
| `notifications:view` | View own notifications | all authenticated |
| `notifications:dismiss` | Mark as read, delete own | all authenticated |
| `notifications:templates:view` | View notification templates | staff, admin |
| `notifications:templates:edit` | Create/edit templates | admin |
| `notifications:analytics:view` | View delivery analytics | staff, admin |
| `notifications:analytics:export` | Export analytics data | admin |
| `notifications:admin:queue` | View/manage notification queue | admin |
| `notifications:admin:broadcast` | Send broadcast notifications | admin |

---

## Part 3: Implementation Plan

### Phase 1: Foundation (Database & Core Infrastructure)

#### Step 1.1: Fix Database Schema
Create migration to add missing columns and fix RLS policies:
- Add `expires_at TIMESTAMPTZ` column
- Add `metadata JSONB` column
- Add `category TEXT` column
- Add `priority TEXT` column
- Fix RLS policies to use `user_id = auth.uid()`

#### Step 1.2: Create Notification Queue Table
Create `notification_queue` table for message bus:
- Queue status tracking
- Retry logic support
- Dead letter handling
- Scheduled delivery support

#### Step 1.3: Create User Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  tenant_id UUID NOT NULL REFERENCES tenants,
  category TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT, -- 'immediate', 'hourly', 'daily', 'weekly'
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, tenant_id, category, channel)
);
```

#### Step 1.4: Create Notification Templates Table
```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants, -- NULL for system templates
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT, -- For email
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, event_type, channel)
);
```

### Phase 2: Service Layer

#### Step 2.1: Create Core Services

**NotificationBusService** (Orchestrator)
```
src/services/notification/NotificationBusService.ts
- publish(event: NotificationEvent): Promise<void>
- processQueue(): Promise<void>
- retryFailed(): Promise<void>
```

**NotificationPreferenceService**
```
src/services/notification/NotificationPreferenceService.ts
- getUserPreferences(userId, tenantId): Promise<NotificationPreference[]>
- updatePreference(preference): Promise<void>
- shouldDeliver(userId, category, channel): Promise<boolean>
```

**NotificationTemplateService**
```
src/services/notification/NotificationTemplateService.ts
- getTemplate(eventType, channel, tenantId): Promise<NotificationTemplate>
- renderTemplate(template, variables): Promise<string>
```

#### Step 2.2: Create Delivery Channel Implementations

**InAppChannel** (extends existing adapter)
```
src/services/notification/channels/InAppChannel.ts
- Stores to notifications table
- Triggers realtime subscription
```

**EmailChannel** (wraps existing edge function)
```
src/services/notification/channels/EmailChannel.ts
- Calls email-service edge function
- Tracks delivery status
- Supports templates
```

**SmsChannel** (new - Twilio integration)
```
src/services/notification/channels/SmsChannel.ts
- Twilio SDK integration
- Phone number validation
- Rate limiting
```

**PushChannel** (new - FCM/APNs)
```
src/services/notification/channels/PushChannel.ts
- Firebase Cloud Messaging
- Device token management
```

**WebhookChannel** (new)
```
src/services/notification/channels/WebhookChannel.ts
- HTTP POST to configured endpoints
- Signature verification
- Retry with exponential backoff
```

#### Step 2.3: Create Channel Dispatcher
```
src/services/notification/ChannelDispatcher.ts
- Resolves channels based on event and preferences
- Dispatches to appropriate channel implementation
- Handles failures and retries
```

### Phase 3: API Layer

#### Step 3.1: In-App Notification Endpoints
```
POST   /api/notifications                    - Create notification (internal)
GET    /api/notifications                    - List user notifications
GET    /api/notifications/unread-count       - Get unread count
PATCH  /api/notifications/[id]/read          - Mark as read
POST   /api/notifications/mark-all-read      - Mark all as read
DELETE /api/notifications/[id]               - Delete notification
```

#### Step 3.2: Preference Endpoints
```
GET    /api/notification-preferences         - Get user preferences
PUT    /api/notification-preferences         - Update preferences
POST   /api/notification-preferences/reset   - Reset to defaults
```

#### Step 3.3: Admin Endpoints
```
GET    /api/admin/notifications/queue        - View queue status
POST   /api/admin/notifications/retry        - Retry failed notifications
GET    /api/admin/notifications/analytics    - Delivery analytics
```

### Phase 4: UI Components

#### Step 4.1: Notification Bell Component
```
src/components/notifications/NotificationBell.tsx
- Unread count badge
- Dropdown trigger
- Realtime count updates
```

#### Step 4.2: Notification Center
```
src/components/notifications/NotificationCenter.tsx
- Notification list with virtual scrolling
- Group by date/category
- Mark as read on view
- Action buttons (redirect, modal)
- Empty state
```

#### Step 4.3: Notification Item
```
src/components/notifications/NotificationItem.tsx
- Icon by type/category
- Title, message, timestamp
- Read/unread styling
- Action handling
```

#### Step 4.4: Notification Preferences UI
```
src/app/admin/settings/notifications/page.tsx
- Channel toggles per category
- Digest frequency settings
- Quiet hours configuration
```

### Phase 5: Event Publishing Integration

#### Step 5.1: Define Standard Event Types
```typescript
enum NotificationEventType {
  // Member Events
  MEMBER_INVITED = 'member.invited',
  MEMBER_JOINED = 'member.joined',
  MEMBER_UPDATED = 'member.updated',

  // Finance Events
  DONATION_RECEIVED = 'donation.received',
  PLEDGE_REMINDER = 'pledge.reminder',
  BUDGET_ALERT = 'budget.alert',

  // Event Events
  EVENT_REMINDER = 'event.reminder',
  EVENT_CANCELLED = 'event.cancelled',

  // RBAC Events
  ROLE_ASSIGNED = 'role.assigned',
  PERMISSION_CHANGED = 'permission.changed',
  DELEGATION_EXPIRING = 'delegation.expiring',

  // System Events
  LICENSE_EXPIRING = 'license.expiring',
  SYSTEM_MAINTENANCE = 'system.maintenance',
}
```

#### Step 5.2: Integrate with Existing Services
Add notification publishing to existing services:
- `MemberService` → publish on member create/update
- `DonationService` → publish on donation received
- `RbacDelegationService` → publish on role assigned
- `LicenseMonitoringService` → publish on license alerts

### Phase 6: Premium Features

#### Step 6.1: Scheduled Notifications
- Database scheduler via pg_cron or Supabase scheduled functions
- UI for scheduling notifications
- Recurring notification support

#### Step 6.2: Notification Analytics
- Delivery success rates by channel
- Open/click tracking for emails
- User engagement metrics
- Dashboard widgets

#### Step 6.3: Advanced Templates
- Handlebars/Liquid template engine
- Template editor UI
- Preview functionality
- Version history

---

## Part 4: File Structure

```
src/
├── services/
│   └── notification/
│       ├── NotificationBusService.ts        # Main orchestrator
│       ├── NotificationPreferenceService.ts # User preferences
│       ├── NotificationTemplateService.ts   # Template rendering
│       ├── NotificationQueueService.ts      # Queue management
│       ├── ChannelDispatcher.ts             # Channel routing
│       └── channels/
│           ├── IDeliveryChannel.ts          # Interface
│           ├── InAppChannel.ts              # Database notifications
│           ├── EmailChannel.ts              # Resend integration
│           ├── SmsChannel.ts                # Twilio integration
│           ├── PushChannel.ts               # FCM/APNs
│           └── WebhookChannel.ts            # HTTP webhooks
├── repositories/
│   └── notification/
│       ├── notification.repository.ts       # (existing, enhanced)
│       ├── notificationQueue.repository.ts  # Queue operations
│       └── notificationPreference.repository.ts
├── adapters/
│   └── notification/
│       ├── notification.adapter.ts          # (existing, enhanced)
│       ├── notificationQueue.adapter.ts
│       └── notificationPreference.adapter.ts
├── models/
│   └── notification/
│       ├── notification.model.ts            # (existing, enhanced)
│       ├── notificationEvent.model.ts       # Event payload
│       ├── notificationQueue.model.ts       # Queue item
│       └── notificationPreference.model.ts  # User prefs
├── components/
│   └── notifications/
│       ├── NotificationBell.tsx             # Header bell
│       ├── NotificationCenter.tsx           # Dropdown panel
│       ├── NotificationItem.tsx             # Single notification
│       ├── NotificationList.tsx             # List with virtualization
│       └── NotificationPreferencesForm.tsx  # Settings form
├── app/
│   └── api/
│       └── notifications/
│           ├── route.ts                     # GET (list), POST (create)
│           ├── unread-count/route.ts        # GET count
│           ├── mark-all-read/route.ts       # POST mark all
│           └── [id]/
│               ├── route.ts                 # GET, DELETE
│               └── read/route.ts            # PATCH mark read
└── hooks/
    └── useNotifications.ts                  # Client-side hook

supabase/
├── migrations/
│   ├── YYYYMMDD_fix_notifications_schema.sql
│   ├── YYYYMMDD_create_notification_queue.sql
│   ├── YYYYMMDD_create_notification_preferences.sql
│   └── YYYYMMDD_create_notification_templates.sql
└── functions/
    └── notification-processor/              # Edge function for queue processing
        └── index.ts
```

---

## Part 5: Edge Cases and Error Handling

### 5.1 Delivery Failures
- **Email bounce**: Mark email as invalid, fall back to in-app
- **SMS failure**: Retry with exponential backoff, max 3 attempts
- **Push token invalid**: Remove device, notify via other channels
- **Webhook timeout**: Retry with backoff, move to dead letter after max attempts

### 5.2 Rate Limiting
- Per-channel rate limits (email: 100/min, SMS: 10/min)
- Per-user quiet hours enforcement
- Tenant-level quotas based on license tier

### 5.3 Data Consistency
- Idempotent message processing (dedup by event ID)
- Transaction boundaries for queue operations
- Audit trail for all notifications

### 5.4 Realtime Fallback
- WebSocket connection loss: Poll fallback
- Realtime subscription failure: HTTP polling
- Connection recovery: Delta sync

---

## Part 6: Dependencies

### New NPM Packages
```json
{
  "@supabase/realtime-js": "^2.x",  // Already included via supabase-js
  "twilio": "^5.x",                 // SMS (optional, Enterprise+)
  "firebase-admin": "^12.x",        // Push notifications (optional)
  "handlebars": "^4.x"              // Template rendering
}
```

### Environment Variables
```env
# SMS (Twilio) - Enterprise/Premium
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Push (Firebase) - Professional+
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

---

## Part 7: Migration Strategy

### 7.1 Backward Compatibility
- Existing `notifications` table remains unchanged initially
- New columns added as nullable first
- Existing notification adapter continues to work
- Gradual migration of consuming code

### 7.2 Feature Code Activation

Feature codes are activated per tenant via `tenant_feature_grants` table. During rollout:

1. **Phase A - Core Features** (All tiers):
   - Grant `notifications-inapp` to all tenants
   - Grant `notifications-email` to all tenants

2. **Phase B - Professional Features**:
   - Grant `notifications-sms` to Professional+ tenants
   - Grant `notifications-push` to Professional+ tenants
   - Grant `notifications-digest` to Professional+ tenants

3. **Phase C - Enterprise Features**:
   - Grant `notifications-scheduled` to Enterprise+ tenants
   - Grant `notifications-webhooks` to Enterprise+ tenants
   - Grant `notifications-templates` to Enterprise+ tenants

4. **Phase D - Premium Features**:
   - Grant `notifications-analytics` to Premium tenants
   - Grant `notifications-priority` to Premium tenants

**Automatic Feature Granting:**

New feature codes are automatically granted based on `license_feature_bundles` when:
- A tenant upgrades their plan
- A new tenant registers
- The `LicenseFeatureService.syncTenantFeatures()` is called

### 7.3 Rollout Plan
1. Deploy database migrations
2. Deploy new services (disabled)
3. Enable in-app channel only
4. Migrate existing notification creation to use bus
5. Enable email channel
6. Roll out UI components
7. Enable premium channels by license tier

---

## Appendix A: Notification Categories

| Category | Description | Default Channels |
|----------|-------------|------------------|
| `system` | System alerts, maintenance | in_app |
| `security` | Login alerts, permission changes | in_app, email |
| `member` | Member-related notifications | in_app, email |
| `finance` | Donations, pledges, budgets | in_app, email |
| `event` | Event reminders, updates | in_app, email, push |
| `communication` | Messages, announcements | in_app, push |

---

## Appendix B: Realtime Subscription Flow

```
1. User logs in
   ↓
2. NotificationBell mounts
   ↓
3. useNotifications hook subscribes to Supabase Realtime
   ↓
4. Supabase channel: postgres_changes on notifications table
   ↓
5. Filter: user_id = current user
   ↓
6. On INSERT: increment unread count, add to list
   ↓
7. On UPDATE (is_read): decrement count if newly read
   ↓
8. Component cleanup: unsubscribe on unmount
```

---

## Conclusion

This implementation plan provides a robust, extensible notification system using a Service Bus pattern. The architecture supports:

- **Multi-channel delivery** (in-app, email, SMS, push, webhook)
- **User preferences** for notification control
- **Feature code gating** consistent with StewardTrack's metadata-driven architecture
- **Reliability** through queue-based processing with retry logic
- **Scalability** via PostgreSQL-based message queue
- **Real-time updates** using Supabase Realtime
- **RBAC integration** with granular permissions per notification capability

### Key Feature Codes Summary

| Feature Code | Tier | Channels/Capabilities |
|--------------|------|----------------------|
| `notifications-inapp` | Essential | Bell icon, notification center, realtime updates |
| `notifications-email` | Essential | Email delivery via Resend |
| `notifications-sms` | Professional | SMS via Twilio |
| `notifications-push` | Professional | Push via Firebase |
| `notifications-digest` | Professional | Batched notifications |
| `notifications-scheduled` | Enterprise | Future delivery scheduling |
| `notifications-webhooks` | Enterprise | HTTP webhook delivery |
| `notifications-templates` | Enterprise | Custom template editor |
| `notifications-analytics` | Premium | Delivery metrics & dashboards |
| `notifications-priority` | Premium | Priority routing & bypass |

The phased approach allows incremental delivery while maintaining backward compatibility with existing functionality. Feature gating ensures premium capabilities are properly monetized while providing core notification functionality to all tenants.
