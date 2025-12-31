# Xendit Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will get Xendit payment processing up and running quickly.

---

## Step 1: Install Dependencies (Already Included)

All necessary code is already in place. No npm packages needed (using native fetch API).

---

## Step 2: Apply Database Migration

```bash
# Start local Supabase (if not already running)
npx supabase start

# Apply the Xendit payment tables migration
npx supabase db push
```

This creates:
- `subscription_payments` table
- `payment_methods` table
- `billing_events` table
- Updates `tenants` table with payment fields

---

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Xendit API Credentials (Development)
XENDIT_SECRET_KEY=xnd_development_xxxxxxxxxxxxxxxxxxxxx
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token_here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Where to Get These Values:

1. **Get Xendit Account:**
   - Sign up at: https://dashboard.xendit.co/register
   - For testing, use **test mode** (development keys)

2. **Get Secret Key:**
   - Dashboard → Settings → Developers → API Keys
   - Copy **Secret Key** (starts with `xnd_development_`)

3. **Get Webhook Token:**
   - Dashboard → Settings → Developers → Webhooks
   - Create new webhook: `http://localhost:3000/api/webhooks/xendit`
   - Select events: **invoice.paid**, **invoice.expired**
   - Copy the **Verification Token**

---

## Step 4: Test the Integration

### Test 1: Check Services are Configured

```bash
# Start development server
npm run dev

# Test webhook endpoint
curl http://localhost:3000/api/webhooks/xendit
# Should return: {"status":"ok","message":"Xendit webhook endpoint is active"}
```

### Test 2: Create Test Payment

```bash
# Get a test offering ID from database
npx supabase db execute "SELECT id, code, name, base_price FROM product_offerings LIMIT 1;"

# Create test invoice (replace with actual IDs)
curl -X POST http://localhost:3000/api/checkout/create-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-test-tenant-id",
    "offeringId": "professional-monthly-offering-id",
    "payerEmail": "test@example.com",
    "payerName": "Test User"
  }'

# Should return invoice_url you can visit in browser
```

### Test 3: Complete Registration Flow

1. Go to http://localhost:3000/signup
2. Select a paid plan (e.g., Professional)
3. Fill registration form
4. Get redirected to checkout page
5. See Xendit payment page redirect
6. Complete test payment (use Xendit test credentials)
7. Get redirected to success page
8. Check database for payment record

---

## Step 5: Test Webhooks (Local Development)

### Option A: Use ngrok for Local Testing

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok (in separate terminal)
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Update Xendit webhook URL to: https://abc123.ngrok.io/api/webhooks/xendit
```

### Option B: Use Xendit Webhook Simulator

1. Go to Xendit Dashboard → Webhooks
2. Click "Send Test Event"
3. Select "invoice.paid" event
4. Check your local logs and database

---

## Step 6: Verify Everything Works

### Check Database Records

```sql
-- Check payment records
SELECT * FROM subscription_payments ORDER BY created_at DESC LIMIT 5;

-- Check webhook events
SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 5;

-- Check tenant subscription status
SELECT
  church_name,
  subscription_status,
  subscription_tier,
  payment_status,
  last_payment_date,
  next_billing_date
FROM tenants
ORDER BY created_at DESC
LIMIT 5;
```

### Test Payment Flows

✅ **Trial Registration:** No payment required, features activated immediately
✅ **Paid Registration:** Payment required before activation
✅ **Payment Success:** Subscription activated, features granted
✅ **Payment Failure:** Subscription remains pending, retry available
✅ **Webhook Processing:** Payment status updates automatically

---

## 🎯 Production Deployment Checklist

Before going live:

- [ ] Switch to **production** Xendit API key (`xnd_production_...`)
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure production webhook URL in Xendit
- [ ] Test production webhook connectivity
- [ ] Apply migration to production database
- [ ] Test complete payment flow in production
- [ ] Setup monitoring for failed payments
- [ ] Configure email notifications
- [ ] Document support procedures

---

## 📚 File Locations

**Services:**
- `src/services/XenditService.ts` - Xendit API wrapper
- `src/services/PaymentService.ts` - Payment management
- `src/services/PaymentSubscriptionService.ts` - Subscription lifecycle

**API Routes:**
- `src/app/api/checkout/create-invoice/route.ts` - Create payment
- `src/app/api/checkout/verify-payment/route.ts` - Verify payment
- `src/app/api/webhooks/xendit/route.ts` - Webhook handler

**UI Pages:**
- `src/app/(public)/signup/checkout/page.tsx` - Payment redirect
- `src/app/(public)/signup/success/page.tsx` - Success page
- `src/app/(public)/signup/failed/page.tsx` - Failure page

**Configuration:**
- `src/lib/types.ts` - Added payment service types
- `src/lib/container.ts` - DI bindings

**Database:**
- `supabase/migrations/20251222000001_add_xendit_payment_tables.sql`

---

## 🐛 Common Issues

### "Payment gateway not configured"

Check `.env` file has `XENDIT_SECRET_KEY`

### "Invalid verification token"

Check `XENDIT_WEBHOOK_VERIFICATION_TOKEN` matches Xendit dashboard

### Payment not updating

Check webhook is configured and accessible

### Invoice expires immediately

Increase `invoice_duration` in XenditService (default: 24 hours)

---

## 💡 Next Steps

1. **Test thoroughly** in development
2. **Customize UI** - Update checkout/success/failed pages
3. **Setup emails** - Payment confirmations, failure notifications
4. **Add billing dashboard** - Create UI for payment history
5. **Monitor webhooks** - Setup alerting for failed webhook processing
6. **Add analytics** - Track payment metrics and conversion rates

---

## 📖 Full Documentation

For detailed documentation, see [XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md)

**Includes:**
- Complete architecture overview
- Service method reference
- Webhook processing details
- Testing strategies
- Production deployment guide
- Troubleshooting guide

---

## 🆘 Need Help?

1. Check [XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md)
2. Review Xendit docs: https://developers.xendit.co/
3. Check database logs in `billing_events` table
4. Review webhook logs in Xendit Dashboard

---

**Quick Start Guide Version:** 1.0.0
**Last Updated:** 2025-12-22
