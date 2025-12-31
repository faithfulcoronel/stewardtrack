# Xendit Payment Integration for StewardTrack

This document provides comprehensive documentation for the Xendit payment gateway integration in StewardTrack.

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Database Schema](#database-schema)
4. [Architecture](#architecture)
5. [Services](#services)
6. [API Endpoints](#api-endpoints)
7. [Payment Flow](#payment-flow)
8. [Webhook Integration](#webhook-integration)
9. [Testing](#testing)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)

---

## Overview

StewardTrack uses **Xendit** as the payment gateway for processing subscription payments in the Philippines. Xendit supports multiple payment methods including:

- **Credit/Debit Cards** (Visa, Mastercard, AMEX)
- **E-wallets** (GCash, PayMaya, GrabPay)
- **Bank Transfers** (via Virtual Accounts)
- **Over-the-Counter** (7-Eleven, Cebuana, etc.)
- **QR Codes** (QR Ph)

### Key Features

✅ Multi-payment method support
✅ Automated webhook processing for payment status updates
✅ Subscription lifecycle management (activation, renewal, cancellation)
✅ Prorated billing for plan upgrades/downgrades
✅ Payment retry mechanism for failed transactions
✅ Comprehensive audit trail and event logging
✅ Support for trial subscriptions

---

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```env
# Xendit API Credentials
XENDIT_SECRET_KEY=xnd_development_xxxxxxxxxxxxxxxxxxxxx  # For development
# XENDIT_SECRET_KEY=xnd_production_xxxxxxxxxxxxxxxxxxxxx  # For production

# Webhook Verification Token (from Xendit Dashboard)
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_verification_token_here

# Application URL (for payment redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_APP_URL=https://your-domain.com  # Production

# Existing Supabase Variables (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Getting Xendit Credentials

1. **Sign up for Xendit Account**
   - Go to [https://dashboard.xendit.co/register](https://dashboard.xendit.co/register)
   - Complete business verification (required for production)

2. **Get API Keys**
   - Login to Xendit Dashboard
   - Navigate to **Settings → Developers → API Keys**
   - Copy the **Secret Key** (starts with `xnd_development_` or `xnd_production_`)
   - Add to `.env` as `XENDIT_SECRET_KEY`

3. **Setup Webhook**
   - Go to **Settings → Developers → Webhooks**
   - Add new webhook URL: `https://your-domain.com/api/webhooks/xendit`
   - Select events: **invoice.paid**, **invoice.expired**
   - Copy the **Verification Token**
   - Add to `.env` as `XENDIT_WEBHOOK_VERIFICATION_TOKEN`

---

## Database Schema

### Migration File

Located at: `supabase/migrations/20251222000001_add_xendit_payment_tables.sql`

### New Tables

#### 1. `subscription_payments`

Stores all payment transactions for tenant subscriptions.

**Key Fields:**
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants
- `offering_id` - Foreign key to product_offerings
- `xendit_invoice_id` - Xendit invoice ID (unique)
- `external_id` - Our internal payment reference
- `amount` - Payment amount (DECIMAL)
- `currency` - Currency code (PHP, USD, etc.)
- `status` - Payment status: `pending`, `paid`, `settled`, `expired`, `failed`, `refunded`
- `payment_method` - Method used: `card`, `ewallet`, `virtual_account`, etc.
- `invoice_url` - Xendit payment page URL
- `paid_at` - Payment completion timestamp

#### 2. `payment_methods`

Stores saved payment methods for tenants (optional feature).

**Key Fields:**
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants
- `xendit_payment_method_id` - Xendit payment method ID
- `payment_method_type` - Type: `card`, `ewallet`, `virtual_account`, etc.
- `card_last_four` - Last 4 digits of card (for cards)
- `is_default` - Boolean flag for default payment method

#### 3. `billing_events`

Logs all Xendit webhook events for audit and debugging.

**Key Fields:**
- `id` - UUID primary key
- `event_id` - External ID from payment
- `event_type` - Event type: `invoice.paid`, `invoice.expired`, etc.
- `tenant_id` - Related tenant
- `payment_id` - Related payment
- `payload` - Full webhook payload (JSONB)
- `processed` - Boolean processing status
- `processing_error` - Error message if processing failed

### Updated Tables

#### `tenants` Table Additions

```sql
ALTER TABLE tenants ADD COLUMN:
- xendit_customer_id TEXT
- xendit_subscription_id TEXT
- xendit_payment_method_id TEXT
- payment_status TEXT (pending, paid, failed, processing, refunded, cancelled)
- last_payment_date TIMESTAMPTZ
- next_billing_date TIMESTAMPTZ
- payment_failed_count INTEGER DEFAULT 0
- payment_failure_reason TEXT
```

### Database Functions

#### `update_tenant_payment_status()`

Automatically updates tenant subscription status based on payment events.

```sql
SELECT update_tenant_payment_status(
  p_tenant_id := '00000000-0000-0000-0000-000000000000',
  p_xendit_invoice_id := 'invoice_id',
  p_status := 'paid',
  p_paid_at := NOW()
);
```

#### `get_tenant_payment_summary()`

Returns payment statistics for a tenant.

```sql
SELECT * FROM get_tenant_payment_summary('tenant_id');
```

---

## Architecture

### Service Layer

The implementation follows the existing StewardTrack architecture with:

1. **Dependency Injection** (InversifyJS)
2. **Service-Repository Pattern**
3. **Request Scoping** for all services

```
┌─────────────────────────────────────────────┐
│           API Routes Layer                  │
│  (/api/checkout/*, /api/webhooks/xendit)    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         Payment Services Layer              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  XenditService                      │   │
│  │  - API wrapper for Xendit           │   │
│  │  - Invoice creation & management    │   │
│  │  - Webhook verification             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  PaymentService                     │   │
│  │  - Payment record management        │   │
│  │  - Status updates                   │   │
│  │  - Payment history queries          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  PaymentSubscriptionService         │   │
│  │  - Subscription lifecycle           │   │
│  │  - Activation/suspension            │   │
│  │  - Plan changes & renewals          │   │
│  └─────────────────────────────────────┘   │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      Existing Services Layer                │
│  (LicensingService, RbacService, etc.)      │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│          Database Layer (Supabase)          │
│  (subscription_payments, billing_events,    │
│   payment_methods, tenants)                 │
└─────────────────────────────────────────────┘
```

---

## Services

### 1. XenditService

**Location:** `src/services/XenditService.ts`

Low-level wrapper for Xendit API.

**Key Methods:**
```typescript
// Create payment invoice
createInvoice(params: CreateInvoiceParams): Promise<XenditInvoice>

// Get invoice details
getInvoice(invoiceId: string): Promise<XenditInvoice>

// Expire an invoice
expireInvoice(invoiceId: string): Promise<XenditInvoice>

// Verify webhook signature
verifyWebhookSignature(callbackToken: string): boolean

// Parse webhook event
parseWebhookEvent(payload: any): XenditWebhookEvent
```

**Usage Example:**
```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { XenditService } from '@/services/XenditService';

const xenditService = container.get<XenditService>(TYPES.XenditService);

const invoice = await xenditService.createInvoice({
  external_id: 'SUB-tenant-123-timestamp',
  amount: 9900, // PHP 99.00 (no decimal for PHP)
  payer_email: 'customer@church.com',
  description: 'StewardTrack Professional - Monthly',
  success_redirect_url: 'https://app.com/success',
  failure_redirect_url: 'https://app.com/failed',
});
```

### 2. PaymentService

**Location:** `src/services/PaymentService.ts`

Business logic for payment record management.

**Key Methods:**
```typescript
// Create subscription payment
createSubscriptionPayment(params: CreatePaymentParams): Promise<{ invoice, payment }>

// Get payment by Xendit invoice ID
getPaymentByXenditId(xenditInvoiceId: string): Promise<PaymentRecord | null>

// Update payment status
updatePaymentStatus(xenditInvoiceId: string, status: string, additionalData?: any): Promise<PaymentRecord>

// Get tenant payments
getTenantPayments(tenantId: string, options?: QueryOptions): Promise<PaymentRecord[]>

// Get payment summary
getTenantPaymentSummary(tenantId: string): Promise<PaymentSummary>

// Retry failed payment
retryFailedPayment(failedPaymentId: string): Promise<{ invoice, payment }>
```

### 3. PaymentSubscriptionService

**Location:** `src/services/PaymentSubscriptionService.ts`

Handles subscription lifecycle management.

**Key Methods:**
```typescript
// Get subscription status
getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus>

// Activate subscription after payment
activateSubscription(tenantId: string, offeringId: string, paidAt: Date): Promise<void>

// Suspend subscription (payment failure)
suspendSubscription(tenantId: string, reason: string): Promise<void>

// Cancel subscription
cancelSubscription(tenantId: string, immediate: boolean): Promise<void>

// Change subscription plan
changeSubscriptionPlan(tenantId: string, newOfferingId: string, prorated: boolean): Promise<void>

// Process renewal
processRenewal(tenantId: string): Promise<void>

// Handle payment failure
handlePaymentFailure(tenantId: string, failureReason: string): Promise<void>

// Get subscription health
getSubscriptionHealth(tenantId: string): Promise<{ status, issues, recommendations }>
```

---

## API Endpoints

### 1. Create Invoice

**Endpoint:** `POST /api/checkout/create-invoice`

Creates a Xendit payment invoice for a subscription.

**Request Body:**
```json
{
  "tenantId": "uuid",
  "offeringId": "uuid",
  "payerEmail": "customer@church.com",
  "payerName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "invoice_url": "https://checkout.xendit.co/web/...",
  "invoice_id": "xendit_invoice_id",
  "payment_id": "uuid",
  "amount": 9900,
  "currency": "PHP",
  "expires_at": "2025-12-23T00:00:00Z"
}
```

### 2. Verify Payment

**Endpoint:** `GET /api/checkout/verify-payment?external_id=xxx`

Verifies payment status after redirect from Xendit.

**Query Parameters:**
- `external_id` OR `invoice_id` (required)

**Response:**
```json
{
  "success": true,
  "status": "paid",
  "payment": {
    "id": "uuid",
    "amount": 9900,
    "currency": "PHP",
    "status": "paid",
    "payment_method": "ewallet",
    "paid_at": "2025-12-22T10:30:00Z"
  },
  "subscription": {
    "subscription_status": "active",
    "next_billing_date": "2026-01-22T10:30:00Z"
  }
}
```

### 3. Webhook Handler

**Endpoint:** `POST /api/webhooks/xendit`

Receives payment status updates from Xendit.

**Headers:**
- `X-CALLBACK-TOKEN` - Xendit verification token

**Webhook Events Handled:**
- `invoice.paid` - Payment successful
- `invoice.expired` - Invoice expired without payment
- `invoice.pending` - Invoice created (optional)

**Response:**
```json
{
  "success": true
}
```

---

## Payment Flow

### Registration Flow (Trial)

```
1. User selects TRIAL plan on /signup
   ↓
2. POST /api/auth/register (offering_id = trial)
   → Creates tenant with status 'trialing'
   → Provisions trial features (30 days)
   → NO PAYMENT REQUIRED
   ↓
3. Redirect to /onboarding
   ↓
4. Complete onboarding wizard
   ↓
5. Redirect to /admin (Dashboard)
```

### Registration Flow (Paid Plan)

```
1. User selects PAID plan on /signup (e.g., Professional)
   ↓
2. User fills registration form on /signup/register
   ↓
3. POST /api/auth/register (offering_id = professional)
   → Creates tenant with status 'pending'
   → Does NOT activate features yet
   ↓
4. Redirect to /signup/checkout?tenant_id=xxx&offering_id=xxx&email=xxx&name=xxx
   ↓
5. POST /api/checkout/create-invoice
   → Creates subscription_payments record (status: pending)
   → Creates Xendit invoice
   → Returns invoice_url
   ↓
6. Auto-redirect to Xendit payment page (invoice_url)
   ↓
7. User completes payment on Xendit
   ↓
8a. SUCCESS: Redirect to /signup/success?external_id=xxx
    ↓
    → GET /api/checkout/verify-payment
    → Verifies payment status
    → Shows success message
    → Auto-redirect to /onboarding (3 seconds)

8b. FAILURE: Redirect to /signup/failed?external_id=xxx
    ↓
    → Shows failure message
    → Options: Retry Payment, Contact Support
   ↓
9. BACKGROUND: Xendit webhook fires (invoice.paid or invoice.expired)
   → POST /api/webhooks/xendit
   → Updates payment status in database
   → Activates subscription if paid
   → Provisions features via LicensingService
   → Updates tenant.subscription_status = 'active'
```

### Plan Upgrade Flow

```
1. Tenant admin navigates to /admin/billing
   ↓
2. Clicks "Upgrade Plan" button
   ↓
3. Selects new plan (e.g., Professional → Enterprise)
   ↓
4. POST /api/billing/change-plan
   → Calculates prorated amount
   → Creates new invoice for difference
   ↓
5. Redirect to Xendit payment page
   ↓
6. Payment processed (same as registration flow)
   ↓
7. Webhook updates subscription
   → Revokes old features
   → Provisions new features
   → Updates subscription_offering_id
```

---

## Webhook Integration

### Xendit Dashboard Configuration

1. Login to [Xendit Dashboard](https://dashboard.xendit.co/)
2. Go to **Settings → Developers → Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **URL:** `https://your-domain.com/api/webhooks/xendit`
   - **Events:**
     - ☑ Invoice Paid (`invoice.paid`)
     - ☑ Invoice Expired (`invoice.expired`)
   - **API Version:** Latest
5. Save and copy **Verification Token**
6. Add token to `.env` as `XENDIT_WEBHOOK_VERIFICATION_TOKEN`

### Webhook Payload Example

**Event: invoice.paid**

```json
{
  "id": "64e8c0c7f7d3f90001234567",
  "external_id": "SUB-tenant-123-1703234567",
  "user_id": "your_xendit_user_id",
  "status": "PAID",
  "merchant_name": "StewardTrack",
  "amount": 9900,
  "payer_email": "customer@church.com",
  "description": "StewardTrack Professional - Monthly",
  "paid_amount": 9900,
  "paid_at": "2025-12-22T10:30:00.000Z",
  "payment_method": "EWALLET",
  "payment_channel": "GCASH",
  "currency": "PHP",
  "created": "2025-12-21T10:30:00.000Z",
  "updated": "2025-12-22T10:30:00.000Z"
}
```

### Webhook Processing Logic

```typescript
// 1. Verify signature
if (!xenditService.verifyWebhookSignature(callbackToken)) {
  return 401 Unauthorized
}

// 2. Parse event
const event = xenditService.parseWebhookEvent(payload);

// 3. Get payment record
const payment = await paymentService.getPaymentByXenditId(event.id);

// 4. Log event to billing_events table
await supabase.from('billing_events').insert({...});

// 5. Handle based on status
switch (event.status) {
  case 'PAID':
    // Update payment status
    await paymentService.updatePaymentStatus(event.id, 'paid', {...});

    // Activate subscription
    await subscriptionService.activateSubscription(
      payment.tenant_id,
      payment.offering_id,
      new Date(event.paid_at)
    );

    // Send confirmation email (TODO)
    break;

  case 'EXPIRED':
    // Update payment status
    await paymentService.updatePaymentStatus(event.id, 'expired', {...});

    // Handle payment failure
    await subscriptionService.handlePaymentFailure(
      payment.tenant_id,
      'Invoice expired without payment'
    );

    // Send retry email (TODO)
    break;
}

// 6. Mark event as processed
await supabase.from('billing_events').update({ processed: true });
```

### Testing Webhooks Locally

Use **ngrok** to expose local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Add to Xendit webhook URL: https://abc123.ngrok.io/api/webhooks/xendit
```

Alternatively, use Xendit's **Webhook Simulator** in the dashboard to send test events.

---

## Testing

### 1. Local Development Testing

**Test Xendit Integration:**

```bash
# 1. Start local Supabase
npx supabase start

# 2. Apply migrations
npx supabase db push

# 3. Start dev server
npm run dev

# 4. Test API endpoints
curl -X POST http://localhost:3000/api/checkout/create-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant-id",
    "offeringId": "test-offering-id",
    "payerEmail": "test@example.com",
    "payerName": "Test User"
  }'
```

### 2. Test Payment Flow

1. Register new account with TRIAL plan (skip payment)
2. Register new account with PAID plan:
   - Fill registration form
   - Get redirected to checkout
   - Complete payment on Xendit test page
   - Verify redirect to success page
   - Check database for payment record
   - Verify subscription activated

### 3. Test Webhook Processing

**Manual Webhook Test:**

```bash
# Send test webhook to local server
curl -X POST http://localhost:3000/api/webhooks/xendit \
  -H "Content-Type: application/json" \
  -H "X-CALLBACK-TOKEN: your_verification_token" \
  -d '{
    "id": "test-invoice-id",
    "external_id": "test-external-id",
    "status": "PAID",
    "amount": 9900,
    "payer_email": "test@example.com",
    "payment_method": "EWALLET",
    "payment_channel": "GCASH",
    "paid_at": "2025-12-22T10:30:00.000Z"
  }'
```

### 4. Test Scenarios

- ✅ Trial registration (no payment)
- ✅ Paid plan registration with successful payment
- ✅ Payment failure/expiration
- ✅ Retry failed payment
- ✅ Plan upgrade (Professional → Enterprise)
- ✅ Plan downgrade (Enterprise → Professional)
- ✅ Subscription cancellation
- ✅ Subscription reactivation
- ✅ Payment method changes
- ✅ Webhook event processing
- ✅ Prorated billing calculation

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Switch to Xendit **production** API key
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure webhook URL in Xendit dashboard (production)
- [ ] Apply database migration to production Supabase
- [ ] Test webhook connectivity with production URL
- [ ] Setup monitoring for failed webhooks
- [ ] Configure email notifications for payment events
- [ ] Setup error tracking (Sentry, etc.)
- [ ] Load test payment flow
- [ ] Document support procedures for payment issues

### Environment Variables (Production)

```env
# PRODUCTION XENDIT SETTINGS
XENDIT_SECRET_KEY=xnd_production_your_live_key_here
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_production_token
NEXT_PUBLIC_APP_URL=https://app.stewardtrack.com

# Keep existing Supabase production credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

### Database Migration

```bash
# Apply to production Supabase
npx supabase db push --remote
```

### Webhook Configuration

1. Login to Xendit Dashboard (production account)
2. Go to **Settings → Webhooks**
3. Add production webhook:
   - URL: `https://app.stewardtrack.com/api/webhooks/xendit`
   - Events: `invoice.paid`, `invoice.expired`
4. Test webhook with "Send Test" button
5. Monitor first few real payments closely

---

## Troubleshooting

### Common Issues

#### 1. "Payment gateway not configured"

**Cause:** Missing or invalid `XENDIT_SECRET_KEY`

**Solution:**
```bash
# Check .env file
cat .env | grep XENDIT_SECRET_KEY

# Ensure key is valid (starts with xnd_)
# For development: xnd_development_
# For production: xnd_production_
```

#### 2. "Invalid verification token" (webhook)

**Cause:** Incorrect `XENDIT_WEBHOOK_VERIFICATION_TOKEN`

**Solution:**
1. Go to Xendit Dashboard → Webhooks
2. Copy the exact verification token
3. Update `.env` file
4. Restart server

#### 3. Payment status not updating

**Cause:** Webhook not being received

**Solution:**
1. Check webhook logs in Xendit Dashboard
2. Verify webhook URL is accessible publicly
3. Check `billing_events` table for processing errors
4. Manually trigger webhook from Xendit dashboard

#### 4. "Failed to fetch offering"

**Cause:** Invalid `offeringId` passed to checkout

**Solution:**
```sql
-- Check available offerings
SELECT id, code, name, base_price FROM product_offerings;

-- Ensure offering exists and is active
```

#### 5. Invoice expired immediately

**Cause:** System time mismatch or invoice_duration too short

**Solution:**
```typescript
// In XenditService.createSubscriptionInvoice()
// Increase invoice_duration to 48 hours
invoice_duration: 172800, // 48 hours in seconds
```

### Debugging Tools

**Check Payment Status:**
```sql
-- Get all payments for a tenant
SELECT * FROM subscription_payments
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC;

-- Check billing events
SELECT * FROM billing_events
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC;

-- Check tenant subscription status
SELECT
  subscription_status,
  subscription_tier,
  payment_status,
  last_payment_date,
  next_billing_date,
  payment_failed_count
FROM tenants
WHERE id = 'your-tenant-id';
```

**Check Webhook Logs:**
```sql
-- Find failed webhook processing
SELECT * FROM billing_events
WHERE processed = FALSE
ORDER BY created_at DESC
LIMIT 10;

-- Check specific event
SELECT
  event_type,
  processed,
  processing_error,
  payload::jsonb
FROM billing_events
WHERE event_id = 'your-external-id';
```

### Support Contacts

**Xendit Support:**
- Email: support@xendit.co
- Dashboard: https://dashboard.xendit.co/
- Documentation: https://developers.xendit.co/

**StewardTrack Support:**
- Internal: support@stewardtrack.com

---

## Next Steps / Future Enhancements

- [ ] Implement email notifications for payment events
- [ ] Add billing dashboard UI in `/admin/billing`
- [ ] Support for saved payment methods
- [ ] Implement payment method management UI
- [ ] Add invoice download/PDF generation
- [ ] Setup automated renewal reminders (7 days before)
- [ ] Implement dunning management for failed payments
- [ ] Add analytics dashboard for payment metrics
- [ ] Support for refunds and chargebacks
- [ ] Multi-currency support (USD, SGD, etc.)
- [ ] Implement subscription pause/resume feature
- [ ] Add promo codes and discount management
- [ ] Setup A/B testing for pricing strategies

---

## Appendix

### File Structure

```
stewardtrack/
├── src/
│   ├── services/
│   │   ├── XenditService.ts                 # Xendit API wrapper
│   │   ├── PaymentService.ts                # Payment business logic
│   │   └── PaymentSubscriptionService.ts    # Subscription lifecycle
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── checkout/
│   │   │   │   ├── create-invoice/route.ts  # Create payment invoice
│   │   │   │   └── verify-payment/route.ts  # Verify payment status
│   │   │   │
│   │   │   └── webhooks/
│   │   │       └── xendit/route.ts          # Webhook handler
│   │   │
│   │   └── (public)/
│   │       └── signup/
│   │           ├── checkout/page.tsx        # Payment redirect page
│   │           ├── success/page.tsx         # Payment success page
│   │           └── failed/page.tsx          # Payment failed page
│   │
│   └── lib/
│       ├── types.ts                         # Added payment service types
│       └── container.ts                     # DI container bindings
│
├── supabase/
│   └── migrations/
│       └── 20251222000001_add_xendit_payment_tables.sql
│
├── .env                                     # Environment variables
└── XENDIT_INTEGRATION.md                   # This documentation
```

### Code Examples

**Create Payment Invoice:**
```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { PaymentService } from '@/services/PaymentService';

const paymentService = container.get<PaymentService>(TYPES.PaymentService);

const { invoice, payment } = await paymentService.createSubscriptionPayment({
  tenantId: 'tenant-uuid',
  offeringId: 'offering-uuid',
  offeringName: 'Professional Plan',
  amount: 99.00,
  payerEmail: 'admin@church.com',
  payerName: 'John Doe',
  billingCycle: 'monthly',
  successUrl: 'https://app.com/signup/success',
  failureUrl: 'https://app.com/signup/failed',
});

// Redirect user to: invoice.invoice_url
```

**Check Subscription Status:**
```typescript
import { PaymentSubscriptionService } from '@/services/PaymentSubscriptionService';

const subscriptionService = container.get<PaymentSubscriptionService>(
  TYPES.PaymentSubscriptionService
);

const status = await subscriptionService.getSubscriptionStatus(tenantId);

console.log(status);
// {
//   subscription_status: 'active',
//   subscription_tier: 'professional',
//   next_billing_date: '2026-01-22T00:00:00Z',
//   payment_status: 'paid',
//   ...
// }
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-22
**Author:** Claude Code (AI Assistant)
