# Payment UI Test Guide

## Quick Test Instructions

### Prerequisites

1. **Environment Variables** - Make sure these are set in your `.env`:
   ```env
   XENDIT_SECRET_KEY=xnd_development_xxxxxxxxxxxxxxxxxxxxx
   XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. **Database Migration Applied**:
   ```bash
   npx supabase db push
   ```

3. **Development Server Running**:
   ```bash
   npm run dev
   ```

---

## Testing the Payment UI

### Step 1: Navigate to Registration Page

1. Go to: **http://localhost:3000/signup**
2. Select any **paid plan** (e.g., Professional - Monthly)
3. Click "Get Started" button

### Step 2: Fill Registration Form

On the registration page, fill in:
- Church Name: `Test Church`
- First Name: `John`
- Last Name: `Doe`
- Email: `test@example.com`
- Password: `password123`
- Confirm Password: `password123`

### Step 3: Click Test Payment Button

Instead of clicking "Create Account", click the **orange button**:

**🧪 Test Payment UI (Skip Registration)**

This will:
- ✅ Skip account creation
- ✅ Use hardcoded tenant ID: `07153c37-200a-44a7-8d24-c5a3639bcdb5`
- ✅ Redirect directly to checkout page with your form data

### Step 4: Watch the Payment Flow

You'll be redirected through:

1. **Checkout Page** (`/signup/checkout`)
   - Shows "Processing Payment" spinner
   - Creates Xendit invoice via API
   - Auto-redirects to Xendit payment page (2 seconds)

2. **Xendit Payment Page** (External)
   - Xendit's payment interface
   - Choose payment method (Card, GCash, etc.)
   - Complete test payment

3. **Success/Failed Page** (`/signup/success` or `/signup/failed`)
   - Verifies payment status
   - Shows payment details
   - Redirects to next step

---

## Testing Different Scenarios

### Scenario 1: Successful Payment

1. Follow steps above
2. On Xendit page, use **test payment credentials**
3. Complete payment
4. Should redirect to `/signup/success`
5. Verify payment in database:
   ```sql
   SELECT * FROM subscription_payments
   WHERE tenant_id = '07153c37-200a-44a7-8d24-c5a3639bcdb5'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### Scenario 2: Payment Expiration

1. Follow steps above
2. Wait for invoice to expire (or close Xendit page)
3. Should redirect to `/signup/failed`
4. Click "Try Payment Again" to retry

### Scenario 3: Test Webhook

After successful payment, check webhook processing:

```sql
-- Check billing events
SELECT
  event_type,
  processed,
  processing_error,
  created_at
FROM billing_events
WHERE tenant_id = '07153c37-200a-44a7-8d24-c5a3639bcdb5'
ORDER BY created_at DESC
LIMIT 5;

-- Check tenant payment status
SELECT
  subscription_status,
  payment_status,
  last_payment_date,
  next_billing_date
FROM tenants
WHERE id = '07153c37-200a-44a7-8d24-c5a3639bcdb5';
```

---

## Xendit Test Credentials

### Test Credit Card (Successful Payment)
```
Card Number: 4000 0000 0000 0002
Expiry: 12/25
CVV: 123
```

### Test Credit Card (Failed Payment)
```
Card Number: 4000 0000 0000 0044
Expiry: 12/25
CVV: 123
```

### Test E-Wallet
- Select **GCash** or **PayMaya**
- Use Xendit test environment credentials
- Follow simulation flow

---

## API Endpoints to Test

### 1. Create Invoice
```bash
curl -X POST http://localhost:3000/api/checkout/create-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "07153c37-200a-44a7-8d24-c5a3639bcdb5",
    "offeringId": "your-offering-id",
    "payerEmail": "test@example.com",
    "payerName": "John Doe"
  }'
```

Expected response:
```json
{
  "success": true,
  "invoice_url": "https://checkout.xendit.co/web/...",
  "invoice_id": "64e8c0c7f7d3f90001234567",
  "payment_id": "uuid",
  "amount": 9900,
  "currency": "PHP",
  "expires_at": "2025-12-23T00:00:00Z"
}
```

### 2. Verify Payment
```bash
curl http://localhost:3000/api/checkout/verify-payment?external_id=SUB-07153c37-200a-44a7-8d24-c5a3639bcdb5-1703234567
```

### 3. Test Webhook Health
```bash
curl http://localhost:3000/api/webhooks/xendit
```

Expected response:
```json
{
  "status": "ok",
  "message": "Xendit webhook endpoint is active",
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

---

## Debugging

### Check Logs

**Browser Console:**
- Check for API errors
- Verify redirect URLs

**Server Console:**
- Watch for invoice creation logs
- Check webhook processing logs

**Database:**
```sql
-- Check payment records
SELECT
  id,
  status,
  amount,
  currency,
  invoice_url,
  created_at
FROM subscription_payments
WHERE tenant_id = '07153c37-200a-44a7-8d24-c5a3639bcdb5'
ORDER BY created_at DESC;

-- Check billing events
SELECT
  event_type,
  processed,
  payload::jsonb->'status' as payment_status,
  created_at
FROM billing_events
WHERE tenant_id = '07153c37-200a-44a7-8d24-c5a3639bcdb5'
ORDER BY created_at DESC;
```

### Common Issues

**"Payment gateway not configured"**
- Check `XENDIT_SECRET_KEY` in `.env`
- Restart dev server after adding env vars

**"Failed to create payment invoice"**
- Check offering ID exists in database
- Verify Xendit API key is valid
- Check server console for detailed error

**Invoice URL not loading**
- Check internet connection
- Verify Xendit test mode is enabled
- Try opening invoice URL in incognito mode

**Payment status not updating**
- Check webhook configuration in Xendit dashboard
- Use ngrok for local webhook testing
- Check `billing_events` table for processing errors

---

## What to Test

### UI Flow
- ✅ Checkout page loads
- ✅ Loading spinner appears
- ✅ Auto-redirect to Xendit (2 seconds)
- ✅ Manual redirect button works
- ✅ Success page displays after payment
- ✅ Payment details shown correctly
- ✅ Failed page displays on error
- ✅ Retry payment button works

### Data Integrity
- ✅ Payment record created with correct amount
- ✅ Tenant ID matches hardcoded value
- ✅ Invoice URL is valid and accessible
- ✅ Offering ID is correctly linked
- ✅ Payment status updates via webhook
- ✅ Billing events are logged

### Error Handling
- ✅ Invalid offering ID shows error
- ✅ Missing required fields shows error
- ✅ Expired invoice handled gracefully
- ✅ Failed payment shows appropriate message
- ✅ Webhook errors logged to database

---

## Cleanup After Testing

To remove test payment records:

```sql
-- Delete test payments
DELETE FROM subscription_payments
WHERE tenant_id = '07153c37-200a-44a7-8d24-c5a3639bcdb5';

-- Delete test billing events
DELETE FROM billing_events
WHERE tenant_id = '07153c37-200a-44a7-8d24-c5a3639bcdb5';

-- Reset tenant payment status (optional)
UPDATE tenants
SET
  payment_status = 'pending',
  last_payment_date = NULL,
  next_billing_date = NULL,
  payment_failed_count = 0
WHERE id = '07153c37-200a-44a7-8d24-c5a3639bcdb5';
```

---

## Next Steps After Testing

1. ✅ Verify all payment flows work correctly
2. ✅ Test with different payment methods (card, e-wallet, etc.)
3. ✅ Test webhook processing with ngrok
4. ✅ Review payment records in database
5. ⚠️ **REMOVE TEST BUTTON** before production deployment
6. ⚠️ Switch to production Xendit keys for live deployment

---

---

**Test Guide Version:** 1.0.0
**Last Updated:** 2025-12-22
