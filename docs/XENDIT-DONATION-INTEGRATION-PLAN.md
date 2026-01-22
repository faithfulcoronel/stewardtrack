# Xendit Donation Integration Plan

## Secure Online Giving & Financial Source Integration

**Version:** 2.1
**Date:** January 2026
**Status:** Implementation In Progress (Phases 1-5 Mostly Complete)

---

## Executive Summary

This document outlines the secure integration of online donations/giving functionality into StewardTrack using Xendit as the payment processor. Following security best practices, **Xendit will act as the secure vault for all sensitive financial data** (bank account details, card numbers, e-wallet credentials). StewardTrack will only store reference tokens and non-sensitive metadata.

### Key Principles

1. **Xendit as the Vault** - All sensitive financial data (PANs, bank account numbers, CVVs) stored exclusively by Xendit
2. **Tokenization** - StewardTrack stores only Xendit-issued tokens (`payment_token_id`, `customer_id`, `linked_account_token_id`)
3. **Defense in Depth** - Multiple security layers (RLS, field-level encryption for metadata, HTTPS-only, webhook verification)
4. **Multi-Tenant Isolation** - All donation data scoped to tenant with RLS enforcement
5. **Audit Trail** - Complete logging of all financial transactions
6. **Financial System Integration** - All confirmed donations automatically recorded as income transactions in the financial module
7. **Secure Disbursements** - Bank account details for payouts managed in Xendit Dashboard only; StewardTrack stores channel references
8. **Automated Processing** - Recurring charges and disbursements processed via secure Vercel Cron jobs with CRON_SECRET validation

---

## Architecture Overview

### Security Model: Xendit as Vault

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STEWARDTRACK (Your App)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Stores ONLY:                                      │   │
│  │  • xendit_customer_id (reference)                                    │   │
│  │  • payment_token_id (reference)                                      │   │
│  │  • linked_account_token_id (reference)                               │   │
│  │  • Transaction metadata (amounts, dates, fund designations)          │   │
│  │  • Masked display values (****1234) - for UI only                    │   │
│  │  • Encrypted PII (donor name, email) - using existing encryption     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS + API Keys
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            XENDIT (Payment Vault)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Stores SECURELY:                                  │   │
│  │  • Full card numbers (PAN)                                           │   │
│  │  • Bank account numbers & routing details                            │   │
│  │  • E-wallet credentials                                              │   │
│  │  • CVV (never stored, used only for transaction)                     │   │
│  │  • Customer payment preferences                                      │   │
│  │  • PCI-DSS Level 1 Compliant Infrastructure                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Donation Transaction

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│  Donor   │────▶│ StewardTrack │────▶│   Xendit    │────▶│   Bank/    │
│  (Web)   │     │   Frontend   │     │   Gateway   │     │  Provider  │
└──────────┘     └──────────────┘     └─────────────┘     └────────────┘
     │                  │                    │                   │
     │ 1. Select        │                    │                   │
     │    amount/fund   │                    │                   │
     │─────────────────▶│                    │                   │
     │                  │ 2. Create payment  │                   │
     │                  │    request         │                   │
     │                  │───────────────────▶│                   │
     │                  │                    │ 3. Process        │
     │                  │                    │    payment        │
     │                  │                    │──────────────────▶│
     │                  │                    │◀──────────────────│
     │                  │ 4. Webhook:        │                   │
     │                  │    payment_token_id│                   │
     │                  │◀───────────────────│                   │
     │ 5. Confirmation  │                    │                   │
     │◀─────────────────│                    │                   │
     │                  │                    │                   │
```

### Data Flow: Automated Disbursements (Payouts to Tenant Bank)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DISBURSEMENT/PAYOUT FLOW                              │
│                                                                              │
│   ┌─────────────┐     ┌────────────────┐     ┌─────────────┐                │
│   │   Vercel    │────▶│ StewardTrack   │────▶│   Xendit    │───▶ Tenant    │
│   │   Cron Job  │     │ Disbursement   │     │  Payout API │    Bank Acct   │
│   │ (3 AM UTC)  │     │ Service        │     │             │                │
│   └─────────────┘     └────────────────┘     └─────────────┘                │
│         │                    │                     │                         │
│         │ 1. Trigger         │                     │                         │
│         │    daily/weekly/   │                     │                         │
│         │    monthly         │                     │                         │
│         │───────────────────▶│                     │                         │
│         │                    │ 2. Aggregate        │                         │
│         │                    │    donations for    │                         │
│         │                    │    disbursement     │                         │
│         │                    │    period           │                         │
│         │                    │                     │                         │
│         │                    │ 3. Create payout    │                         │
│         │                    │    via channel ref  │                         │
│         │                    │───────────────────▶│                         │
│         │                    │                     │ 4. Process payout      │
│         │                    │                     │    to bank account     │
│         │                    │                     │    (stored in Xendit)  │
│         │                    │◀───────────────────│                         │
│         │                    │ 5. Update status    │                         │
│         │                    │    (succeeded/      │                         │
│         │                    │     failed)         │                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

**Security Model:**
┌─────────────────────────────────────────────────────────────────────────────┐
│ StewardTrack stores:               │ Xendit stores:                        │
│ ─────────────────────────────────  │ ────────────────────────────────────  │
│ • xendit_channel_code (e.g. PH_BPI)│ • XenPlatform sub-account balances    │
│ • bank_account_holder_name         │ • Bank routing/SWIFT codes            │
│ • bank_account_number_encrypted    │ • Payout channel configurations       │
│   (AES-256 encrypted)              │ • Transaction history                 │
│ • disbursement_schedule            │ • PCI-DSS compliant infrastructure    │
│ • disbursement_minimum_amount      │                                       │
│ • is_donation_destination          │                                       │
│ • Disbursement amounts/dates       │                                       │
│ • Status tracking                  │                                       │
└─────────────────────────────────────────────────────────────────────────────┘

**XenPlatform Integration (v2.1):**
- Each tenant can have a Xendit "Owned Sub-account" for isolated donation balances
- Donations are routed to sub-accounts using `for-user-id` header
- Disbursements withdraw from sub-account balance to tenant's configured bank
- Bank account numbers are encrypted in StewardTrack using EncryptionService
```

---

## Database Schema Design

### New Tables

#### 1. `donations` - Individual Donation Records

```sql
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Donor Information (references, not raw data)
    member_id UUID REFERENCES members(id),           -- Optional: linked church member
    xendit_customer_id VARCHAR(100),                 -- Xendit customer reference

    -- Donor PII (encrypted using existing EncryptionService)
    donor_name_encrypted TEXT,                       -- Encrypted donor name
    donor_email_encrypted TEXT,                      -- Encrypted email
    donor_phone_encrypted TEXT,                      -- Encrypted phone (optional)

    -- Donation Details
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PHP',
    category_id UUID REFERENCES categories(id),      -- Giving type: Tithes, Offering, Missions, etc.
    fund_id UUID REFERENCES funds(id),               -- Designated fund (where money goes)
    campaign_id UUID REFERENCES campaigns(id),       -- Optional campaign

    -- Payment Information (references only)
    xendit_payment_request_id VARCHAR(100),          -- Xendit payment request ID
    xendit_payment_id VARCHAR(100),                  -- Xendit payment ID
    payment_method_type VARCHAR(50),                 -- 'card', 'ewallet', 'bank_transfer', 'direct_debit'
    payment_channel VARCHAR(50),                     -- 'gcash', 'paymaya', 'bpi', etc.
    payment_method_masked VARCHAR(20),               -- '****1234' for display

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending, paid, failed, refunded
    paid_at TIMESTAMPTZ,

    -- Recurring Donation Setup
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(20),                 -- weekly, monthly, annually
    recurring_payment_token_id VARCHAR(100),         -- Xendit token for recurring
    recurring_next_date DATE,
    recurring_end_date DATE,

    -- Metadata
    notes TEXT,
    anonymous BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'online',             -- online, kiosk, import, manual

    -- Financial Transaction Link (for accounting integration)
    financial_transaction_header_id UUID REFERENCES financial_transaction_headers(id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_donations_tenant ON donations(tenant_id);
CREATE INDEX idx_donations_member ON donations(member_id);
CREATE INDEX idx_donations_category ON donations(category_id);
CREATE INDEX idx_donations_fund ON donations(fund_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_paid_at ON donations(paid_at);
CREATE INDEX idx_donations_xendit_payment ON donations(xendit_payment_id);
CREATE INDEX idx_donations_financial_header ON donations(financial_transaction_header_id);

-- RLS Policies
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own donations"
    ON donations FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenants can insert own donations"
    ON donations FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1));
```

#### 2. `donor_payment_methods` - Saved Payment Methods (Tokens Only)

```sql
CREATE TABLE donor_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    member_id UUID REFERENCES members(id),
    xendit_customer_id VARCHAR(100) NOT NULL,

    -- Xendit Token References (NO actual payment data)
    xendit_payment_token_id VARCHAR(100),            -- For cards/e-wallets
    xendit_linked_account_token_id VARCHAR(100),     -- For direct debit
    xendit_payment_method_id VARCHAR(100),           -- Xendit payment method ID

    -- Display Information (masked, for UI only)
    payment_type VARCHAR(50) NOT NULL,               -- card, ewallet, bank_transfer, direct_debit
    channel_code VARCHAR(50),                        -- GCASH, BPI, BDO, etc.
    display_name VARCHAR(100),                       -- "GCash - 0917****890"
    masked_account VARCHAR(20),                      -- "****1234"

    -- Preferences
    is_default BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(50),                            -- User-defined name

    -- Status
    status VARCHAR(20) DEFAULT 'active',             -- active, expired, revoked
    expires_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(xendit_payment_token_id),
    UNIQUE(xendit_linked_account_token_id)
);

-- Indexes
CREATE INDEX idx_donor_payment_methods_tenant ON donor_payment_methods(tenant_id);
CREATE INDEX idx_donor_payment_methods_member ON donor_payment_methods(member_id);
CREATE INDEX idx_donor_payment_methods_customer ON donor_payment_methods(xendit_customer_id);

-- RLS
ALTER TABLE donor_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own payment methods"
    ON donor_payment_methods FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1));
```

#### 3. `donation_webhooks` - Webhook Event Log (Audit Trail)

```sql
CREATE TABLE donation_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),

    -- Webhook Details
    xendit_webhook_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,                -- payment.paid, payment.failed, etc.

    -- Related Records
    donation_id UUID REFERENCES donations(id),
    xendit_payment_id VARCHAR(100),

    -- Payload (sanitized - no sensitive data)
    payload_sanitized JSONB,                         -- Webhook payload with PII removed

    -- Processing
    status VARCHAR(20) DEFAULT 'received',           -- received, processed, failed
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Audit
    received_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(xendit_webhook_id)
);

-- Index
CREATE INDEX idx_donation_webhooks_payment ON donation_webhooks(xendit_payment_id);
CREATE INDEX idx_donation_webhooks_donation ON donation_webhooks(donation_id);
```

#### 4. `campaigns` - Giving Campaigns (Optional)

```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    name VARCHAR(200) NOT NULL,
    description TEXT,
    goal_amount DECIMAL(15, 2),
    fund_id UUID REFERENCES funds(id),

    start_date DATE NOT NULL,
    end_date DATE,

    status VARCHAR(20) DEFAULT 'active',             -- draft, active, completed, cancelled

    -- Progress (calculated)
    total_raised DECIMAL(15, 2) DEFAULT 0,
    donor_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Service Architecture

### New Services

Following the existing InversifyJS patterns in `apps/web/src/services/`:

#### 1. `DonationService.ts` - Core Donation Operations

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';

export interface CreateDonationDto {
  memberId?: string;
  amount: number;
  currency?: string;
  categoryId: string;     // Required: Tithes, Offering, Missions, etc.
  fundId?: string;        // Optional: Designated fund
  campaignId?: string;
  donorName?: string;
  donorEmail: string;
  donorPhone?: string;
  paymentMethodType: 'card' | 'ewallet' | 'bank_transfer' | 'direct_debit';
  channelCode?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'annually';
  anonymous?: boolean;
  notes?: string;
  // For saved payment methods
  savedPaymentMethodId?: string;
  // For new payment methods
  savePaymentMethod?: boolean;
}

@injectable()
export class DonationService {
  constructor(
    @inject(TYPES.IDonationRepository) private donationRepo: IDonationRepository,
    @inject(TYPES.IDonorPaymentMethodRepository) private paymentMethodRepo: IDonorPaymentMethodRepository,
    @inject(TYPES.XenditService) private xenditService: XenditService,
    @inject(TYPES.XenditCustomerService) private xenditCustomerService: XenditCustomerService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService,
  ) {}

  /**
   * Create a one-time or recurring donation
   * Returns a Xendit payment URL for the donor to complete payment
   */
  async createDonation(dto: CreateDonationDto, tenantId: string): Promise<DonationResult> {
    // 1. Get or create Xendit customer
    const xenditCustomer = await this.xenditCustomerService.getOrCreateCustomer({
      referenceId: dto.memberId || `guest-${Date.now()}`,
      email: dto.donorEmail,
      givenNames: dto.donorName,
    });

    // 2. Encrypt PII before storage
    const encryptedName = dto.donorName
      ? await this.encryptionService.encrypt(dto.donorName, 'donations', 'donor_name_encrypted')
      : null;
    const encryptedEmail = await this.encryptionService.encrypt(dto.donorEmail, 'donations', 'donor_email_encrypted');

    // 3. Create donation record (pending)
    const donation = await this.donationRepo.create({
      tenantId,
      memberId: dto.memberId,
      xenditCustomerId: xenditCustomer.id,
      donorNameEncrypted: encryptedName,
      donorEmailEncrypted: encryptedEmail,
      amount: dto.amount,
      currency: dto.currency || 'PHP',
      categoryId: dto.categoryId,       // User-selected: Tithes, Offering, etc.
      fundId: dto.fundId,
      campaignId: dto.campaignId,
      isRecurring: dto.isRecurring,
      recurringFrequency: dto.recurringFrequency,
      anonymous: dto.anonymous,
      status: 'pending',
    });

    // 4. Create Xendit payment request
    const captureMethod = dto.savePaymentMethod || dto.isRecurring ? 'PAY_AND_SAVE' : 'PAY';

    const paymentRequest = await this.xenditService.createPaymentRequest({
      referenceId: donation.id,
      customerId: xenditCustomer.id,
      amount: dto.amount,
      currency: dto.currency || 'PHP',
      captureMethod,
      paymentMethodType: dto.paymentMethodType,
      channelCode: dto.channelCode,
      metadata: {
        tenant_id: tenantId,
        donation_id: donation.id,
        category_id: dto.categoryId,
        fund_id: dto.fundId,
        campaign_id: dto.campaignId,
      },
    });

    // 5. Update donation with Xendit references
    await this.donationRepo.update(donation.id, {
      xenditPaymentRequestId: paymentRequest.id,
    });

    return {
      donationId: donation.id,
      paymentUrl: paymentRequest.actions?.find(a => a.action === 'AUTH')?.url,
      expiresAt: paymentRequest.expiresAt,
    };
  }

  /**
   * Process webhook from Xendit when payment completes
   */
  async handlePaymentWebhook(webhookPayload: XenditWebhookPayload): Promise<void> {
    // Implementation details in webhook section
  }
}
```

#### 2. `XenditCustomerService.ts` - Customer Management

```typescript
@injectable()
export class XenditCustomerService {
  /**
   * Get or create a Xendit customer
   * Customer ID is stored in StewardTrack; actual customer data in Xendit
   */
  async getOrCreateCustomer(params: {
    referenceId: string;
    email: string;
    givenNames?: string;
    surname?: string;
    phoneNumber?: string;
  }): Promise<XenditCustomer> {
    // Check if customer exists by reference
    const existing = await this.xenditService.getCustomerByReference(params.referenceId);
    if (existing) return existing;

    // Create new customer in Xendit
    return await this.xenditService.createCustomer({
      reference_id: params.referenceId,
      type: 'INDIVIDUAL',
      email: params.email,
      given_names: params.givenNames,
      surname: params.surname,
      mobile_number: params.phoneNumber,
    });
  }
}
```

#### 3. `DonorPaymentMethodService.ts` - Saved Payment Methods

```typescript
@injectable()
export class DonorPaymentMethodService {
  /**
   * Save a payment method from Xendit token
   * Only stores token reference, not actual payment data
   */
  async savePaymentMethod(
    tenantId: string,
    memberId: string,
    xenditPaymentToken: string,
    paymentDetails: {
      type: string;
      channelCode: string;
      maskedAccount: string;
      displayName: string;
    }
  ): Promise<DonorPaymentMethod> {
    return await this.paymentMethodRepo.create({
      tenantId,
      memberId,
      xenditPaymentTokenId: xenditPaymentToken,
      paymentType: paymentDetails.type,
      channelCode: paymentDetails.channelCode,
      maskedAccount: paymentDetails.maskedAccount,
      displayName: paymentDetails.displayName,
      status: 'active',
    });
  }

  /**
   * List saved payment methods for a donor
   */
  async listPaymentMethods(memberId: string, tenantId: string): Promise<DonorPaymentMethod[]> {
    return await this.paymentMethodRepo.findByMember(memberId, tenantId);
  }

  /**
   * Remove a saved payment method
   * Also unbinds from Xendit
   */
  async removePaymentMethod(paymentMethodId: string, tenantId: string): Promise<void> {
    const method = await this.paymentMethodRepo.findById(paymentMethodId, tenantId);

    // Unbind from Xendit
    if (method.xenditPaymentTokenId) {
      await this.xenditService.expirePaymentToken(method.xenditPaymentTokenId);
    }

    // Mark as revoked in our database
    await this.paymentMethodRepo.update(paymentMethodId, { status: 'revoked' });
  }
}
```

### Extend Existing XenditService

Add new methods to the existing `XenditService.ts`:

```typescript
// Add to XenditService.ts

/**
 * Create a Xendit customer
 */
async createCustomer(params: CreateCustomerParams): Promise<XenditCustomer> {
  return this.request<XenditCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'API-VERSION': '2020-05-19',
    },
  });
}

/**
 * Create a payment request (Payments API v3)
 */
async createPaymentRequest(params: CreatePaymentRequestParams): Promise<XenditPaymentRequest> {
  return this.request<XenditPaymentRequest>('/v3/payment_requests', {
    method: 'POST',
    body: JSON.stringify({
      reference_id: params.referenceId,
      customer_id: params.customerId,
      amount: params.amount,
      currency: params.currency,
      capture_method: params.captureMethod, // 'PAY' or 'PAY_AND_SAVE'
      payment_method: {
        type: params.paymentMethodType,
        reusability: params.captureMethod === 'PAY_AND_SAVE' ? 'MULTIPLE_USE' : 'ONE_TIME_USE',
        ...(params.channelCode && {
          [params.paymentMethodType.toLowerCase()]: {
            channel_code: params.channelCode,
          },
        }),
      },
      metadata: params.metadata,
    }),
  });
}

/**
 * Charge a saved payment token
 */
async chargePaymentToken(params: {
  paymentTokenId: string;
  amount: number;
  currency: string;
  referenceId: string;
  metadata?: Record<string, any>;
}): Promise<XenditPaymentRequest> {
  return this.request<XenditPaymentRequest>('/v3/payment_requests', {
    method: 'POST',
    body: JSON.stringify({
      reference_id: params.referenceId,
      amount: params.amount,
      currency: params.currency,
      payment_method_id: params.paymentTokenId,
      metadata: params.metadata,
    }),
  });
}

/**
 * Expire/unbind a payment token
 */
async expirePaymentToken(paymentTokenId: string): Promise<void> {
  await this.request(`/v3/payment_tokens/${paymentTokenId}/expire`, {
    method: 'POST',
  });
}

/**
 * Initialize direct debit linked account
 */
async initializeLinkedAccount(params: {
  customerId: string;
  channelCode: string;  // BPI, BDO, UNIONBANK, etc.
  successRedirectUrl: string;
  failureRedirectUrl: string;
}): Promise<XenditLinkedAccountInit> {
  return this.request<XenditLinkedAccountInit>('/linked_account_tokens/auth', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: params.customerId,
      channel_code: params.channelCode,
      properties: {
        success_redirect_url: params.successRedirectUrl,
        failure_redirect_url: params.failureRedirectUrl,
      },
    }),
  });
}
```

---

## API Endpoints

### Public Donation Endpoints

```
POST   /api/donations                    - Create new donation
GET    /api/donations/:id                - Get donation status
POST   /api/donations/:id/cancel         - Cancel pending donation
```

### Recurring Donation Endpoints ✅ IMPLEMENTED

```
GET    /api/donations/recurring          - List recurring donations for current member
POST   /api/donations/recurring          - Setup recurring donation
GET    /api/donations/recurring/:id      - Get recurring donation details
PUT    /api/donations/recurring/:id      - Update recurring donation (amount, frequency, method)
POST   /api/donations/recurring/:id/pause   - Pause recurring donation
POST   /api/donations/recurring/:id/resume  - Resume paused donation
POST   /api/donations/recurring/:id/cancel  - Cancel recurring donation
GET    /api/donations/recurring/:id/history - Get charge history for recurring donation
```

### Disbursement/Payout Endpoints ✅ IMPLEMENTED

```
GET    /api/disbursements                - List disbursements for tenant
POST   /api/disbursements                - Create new disbursement (manual)
GET    /api/disbursements/:id            - Get disbursement details
POST   /api/disbursements/:id            - Process disbursement (trigger payout)
GET    /api/disbursements/summary        - Dashboard summary stats
GET    /api/disbursements/sources        - List payout-enabled financial sources
```

### Cron Job Endpoints ✅ IMPLEMENTED

```
POST   /api/cron/recurring-donations     - Process recurring charges (daily 2 AM UTC)
POST   /api/cron/disbursements           - Process scheduled payouts (daily 3 AM UTC)
GET    /api/cron/disbursements?health=true - Health check for disbursement cron
```

### Member Payment Method Endpoints

```
GET    /api/members/me/payment-methods           - List saved payment methods
POST   /api/members/me/payment-methods           - Add new payment method
DELETE /api/members/me/payment-methods/:id       - Remove payment method
PUT    /api/members/me/payment-methods/:id/default - Set as default
```

### Admin Donation Endpoints

```
GET    /api/admin/donations                      - List all donations (paginated)
GET    /api/admin/donations/summary              - Dashboard summary stats
GET    /api/admin/donations/export               - Export donations (CSV/Excel)
POST   /api/admin/donations/refund/:id           - Process refund
```

### Webhook Endpoint

```
POST   /api/webhooks/xendit/donations            - Xendit webhook receiver
```

---

## Webhook Handling

### Webhook Security

```typescript
// apps/web/src/app/api/webhooks/xendit/donations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';

export async function POST(request: NextRequest) {
  // 1. Verify webhook signature
  const callbackToken = request.headers.get('x-callback-token');
  const xenditService = container.get<XenditService>(TYPES.XenditService);

  if (!xenditService.verifyWebhookSignature(callbackToken || '')) {
    console.error('[Webhook] Invalid callback token');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse payload
  const payload = await request.json();

  // 3. Log webhook (sanitized)
  const webhookService = container.get<DonationWebhookService>(TYPES.DonationWebhookService);
  await webhookService.logWebhook({
    xenditWebhookId: payload.id,
    eventType: payload.event,
    xenditPaymentId: payload.data?.id,
    payloadSanitized: sanitizeWebhookPayload(payload),
  });

  // 4. Process based on event type
  const donationService = container.get<DonationService>(TYPES.DonationService);

  try {
    switch (payload.event) {
      case 'payment.succeeded':
        await donationService.handlePaymentSuccess(payload.data);
        break;
      case 'payment.failed':
        await donationService.handlePaymentFailure(payload.data);
        break;
      case 'payment_method.activated':
        await donationService.handlePaymentMethodSaved(payload.data);
        break;
      // ... other events
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// Sanitize webhook payload before logging (remove sensitive data)
function sanitizeWebhookPayload(payload: any): any {
  const sanitized = { ...payload };

  // Remove any accidentally included sensitive data
  if (sanitized.data) {
    delete sanitized.data.card_number;
    delete sanitized.data.account_number;
    delete sanitized.data.cvv;
    // Mask email
    if (sanitized.data.customer?.email) {
      sanitized.data.customer.email = maskEmail(sanitized.data.customer.email);
    }
  }

  return sanitized;
}
```

### Webhook Event Handling

```typescript
// In DonationService.ts

async handlePaymentSuccess(paymentData: XenditPaymentData): Promise<void> {
  const donationId = paymentData.reference_id;

  // 1. Update donation status
  await this.donationRepo.update(donationId, {
    status: 'paid',
    paidAt: new Date(),
    xenditPaymentId: paymentData.id,
    paymentMethodType: paymentData.payment_method?.type,
    paymentChannel: paymentData.payment_method?.channel_code,
    paymentMethodMasked: paymentData.payment_method?.card?.masked_card_number
      || paymentData.payment_method?.ewallet?.account_mobile_number?.slice(-4),
  });

  // 2. If PAY_AND_SAVE, store payment token reference
  if (paymentData.payment_token_id) {
    const donation = await this.donationRepo.findById(donationId);

    await this.paymentMethodService.savePaymentMethod(
      donation.tenantId,
      donation.memberId,
      paymentData.payment_token_id,
      {
        type: paymentData.payment_method.type,
        channelCode: paymentData.payment_method.channel_code,
        maskedAccount: paymentData.payment_method.card?.masked_card_number || '****',
        displayName: this.buildPaymentMethodDisplayName(paymentData.payment_method),
      }
    );
  }

  // 3. Update campaign totals if applicable
  if (donation.campaignId) {
    await this.campaignService.updateTotals(donation.campaignId);
  }

  // 4. Update member giving profile
  if (donation.memberId) {
    await this.memberGivingService.recordDonation(donation);
  }

  // 5. Send confirmation email (via notification service)
  await this.notificationService.sendDonationConfirmation(donation);
}
```

---

## Financial Transaction Integration

When a donation payment is confirmed via webhook, the system automatically records it as an **income transaction** in the financial module. This ensures all donations appear in financial reports, fund balances, and accounting records.

### Architecture: Donation → Financial Transaction Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────────────┐
│  Xendit Webhook │────▶│ DonationService │────▶│ IncomeExpenseTransactionSvc  │
│  (payment.paid) │     │ handlePayment() │     │ create()                     │
└─────────────────┘     └─────────────────┘     └──────────────────────────────┘
                                                            │
                                                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE RECORDS CREATED                              │
│                                                                              │
│  ┌─────────────────────────────┐    ┌──────────────────────────────────┐    │
│  │ financial_transaction_header│    │ income_expense_transactions      │    │
│  │ ─────────────────────────── │    │ ────────────────────────────────  │    │
│  │ transaction_number: AUTO    │◄───│ header_id: (FK)                  │    │
│  │ transaction_date: paid_at   │    │ transaction_type: 'income'       │    │
│  │ description: "Online..."    │    │ amount: donation.amount          │    │
│  │ source_id: Online Giving    │    │ category_id: Donations category  │    │
│  │ status: 'posted'            │    │ fund_id: donation.fund_id        │    │
│  └─────────────────────────────┘    │ source_id: Online Giving         │    │
│                                     │ account_id: member account (opt) │    │
│  ┌─────────────────────────────┐    └──────────────────────────────────┘    │
│  │ financial_transactions (GL) │                                            │
│  │ ─────────────────────────── │    Double-entry accounting:               │
│  │ DEBIT:  Asset (Bank/Online) │    - Debit: Asset account (money in)      │
│  │ CREDIT: Revenue (Donations) │    - Credit: Revenue account (income)     │
│  └─────────────────────────────┘                                            │
│                                                                              │
│  ┌─────────────────────────────┐                                            │
│  │ donations                   │                                            │
│  │ ─────────────────────────── │                                            │
│  │ financial_transaction_      │◄── Link back to financial header          │
│  │   header_id: (FK)           │    for audit trail                        │
│  └─────────────────────────────┘                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Required Setup: Financial Source & Categories

Before donations can be recorded as financial transactions, each tenant needs:

#### 1. Financial Source: "Online Giving" (or "Xendit")

This represents where the money comes from (the payment gateway).

```sql
-- Create during tenant onboarding or feature activation
INSERT INTO financial_sources (
    tenant_id,
    name,
    description,
    source_type,
    coa_id,           -- Links to Asset account in Chart of Accounts
    is_active
) VALUES (
    :tenant_id,
    'Online Giving',
    'Xendit payment gateway for online donations',
    'online',         -- source_type enum
    :asset_coa_id,    -- e.g., "Online Payments Clearing" asset account
    true
);
```

#### 2. Income Categories (User-Selectable)

Categories represent the **type of giving** selected by the donor. Each category links to a Revenue account in the Chart of Accounts.

```sql
-- Example categories for a typical church
-- These should already exist in the categories table

-- Tithes
INSERT INTO categories (tenant_id, code, name, chart_of_account_id, is_active)
VALUES (:tenant_id, 'TITHES', 'Tithes', :tithes_revenue_coa_id, true);

-- General Offerings
INSERT INTO categories (tenant_id, code, name, chart_of_account_id, is_active)
VALUES (:tenant_id, 'OFFERING', 'Offerings', :offering_revenue_coa_id, true);

-- Missions
INSERT INTO categories (tenant_id, code, name, chart_of_account_id, is_active)
VALUES (:tenant_id, 'MISSIONS', 'Missions', :missions_revenue_coa_id, true);

-- Building Fund Offering
INSERT INTO categories (tenant_id, code, name, chart_of_account_id, is_active)
VALUES (:tenant_id, 'BUILDING', 'Building Fund Offering', :building_revenue_coa_id, true);

-- Love Offering
INSERT INTO categories (tenant_id, code, name, chart_of_account_id, is_active)
VALUES (:tenant_id, 'LOVE_OFFERING', 'Love Offering', :love_offering_coa_id, true);

-- Special Offering
INSERT INTO categories (tenant_id, code, name, chart_of_account_id, is_active)
VALUES (:tenant_id, 'SPECIAL', 'Special Offering', :special_revenue_coa_id, true);
```

**Category vs Fund:**
- **Category** = Type of giving (Tithes, Offering, Missions) → Links to Revenue account
- **Fund** = Where the money is designated (General Fund, Building Fund) → Budget tracking

#### 3. Funds (Already Exists)

Donations are designated to funds (General Fund, Building Fund, etc.) which already exist in the `funds` table. The donor may select both a category AND a fund.

### DonationService: Recording Financial Transaction

Update the `handlePaymentSuccess` method to record the financial transaction:

```typescript
// In DonationService.ts

@injectable()
export class DonationService {
  constructor(
    @inject(TYPES.IDonationRepository) private donationRepo: IDonationRepository,
    @inject(TYPES.IncomeExpenseTransactionService) private transactionService: IncomeExpenseTransactionService,
    @inject(TYPES.IFinancialSourceRepository) private sourceRepo: IFinancialSourceRepository,
    @inject(TYPES.ICategoryRepository) private categoryRepo: ICategoryRepository,
    // ... other dependencies
  ) {}

  async handlePaymentSuccess(paymentData: XenditPaymentData): Promise<void> {
    const donationId = paymentData.reference_id;
    const donation = await this.donationRepo.findById(donationId);

    // 1. Update donation status
    await this.donationRepo.update(donationId, {
      status: 'paid',
      paidAt: new Date(),
      xenditPaymentId: paymentData.id,
      paymentMethodType: paymentData.payment_method?.type,
      paymentChannel: paymentData.payment_method?.channel_code,
      paymentMethodMasked: this.getMaskedAccount(paymentData.payment_method),
    });

    // 2. Record financial transaction
    const financialHeader = await this.recordFinancialTransaction(donation, paymentData);

    // 3. Link financial transaction to donation
    await this.donationRepo.update(donationId, {
      financialTransactionHeaderId: financialHeader.id,
    });

    // 4. If PAY_AND_SAVE, store payment token reference
    if (paymentData.payment_token_id && donation.memberId) {
      await this.savePaymentMethod(donation, paymentData);
    }

    // 5. Update campaign totals if applicable
    if (donation.campaignId) {
      await this.campaignService.updateTotals(donation.campaignId);
    }

    // 6. Update member giving profile
    if (donation.memberId) {
      await this.memberGivingService.recordDonation(donation);
    }

    // 7. Send confirmation email
    await this.notificationService.sendDonationConfirmation(donation);
  }

  /**
   * Record donation as income transaction in financial module
   * Uses the donor-selected category (Tithes, Offering, etc.)
   */
  private async recordFinancialTransaction(
    donation: Donation,
    paymentData: XenditPaymentData
  ): Promise<FinancialTransactionHeader> {
    // Get the "Online Giving" source for this tenant
    const onlineGivingSource = await this.sourceRepo.findByName(
      donation.tenantId,
      'Online Giving'
    );
    if (!onlineGivingSource) {
      throw new Error('Online Giving financial source not configured for tenant');
    }

    // Get the donor-selected category (Tithes, Offering, Missions, etc.)
    const selectedCategory = await this.categoryRepo.findById(
      donation.categoryId,
      donation.tenantId
    );
    if (!selectedCategory) {
      throw new Error(`Category ${donation.categoryId} not found for tenant`);
    }

    // Build description with category name
    const donorDisplay = donation.anonymous
      ? 'Anonymous Donor'
      : await this.getDecryptedDonorName(donation);
    const paymentMethodDisplay = this.formatPaymentMethod(paymentData.payment_method);
    const fundDisplay = donation.fundId
      ? await this.getFundName(donation.fundId)
      : 'General Fund';

    const description = `Online ${selectedCategory.name} - ${donorDisplay} via ${paymentMethodDisplay}`;

    // Create the income transaction using donor-selected category
    const header = await this.transactionService.create(
      {
        tenantId: donation.tenantId,
        transactionDate: donation.paidAt || new Date(),
        description,
        reference: `XENDIT-${paymentData.id}`,  // Xendit payment ID as reference
        sourceId: onlineGivingSource.id,
        status: 'posted',  // Auto-post online donations
        createdBy: null,   // System-generated (webhook)
      },
      [
        {
          transactionType: 'income',
          amount: donation.amount,
          categoryId: donation.categoryId,  // ← Donor-selected category
          fundId: donation.fundId,
          sourceId: onlineGivingSource.id,
          accountId: donation.memberId ? await this.getMemberAccountId(donation.memberId) : null,
          description: `${selectedCategory.name} - ${donation.currency} ${donation.amount.toFixed(2)} - ${fundDisplay}`,
        },
      ]
    );

    console.log(
      `[DonationService] Recorded financial transaction ${header.transactionNumber} ` +
      `for donation ${donation.id} (${selectedCategory.name})`
    );

    return header;
  }

  /**
   * Get member's account ID for linking donations to member accounts
   */
  private async getMemberAccountId(memberId: string): Promise<string | null> {
    // If your system tracks member accounts in the accounts table
    const memberAccount = await this.accountRepo.findByMemberId(memberId);
    return memberAccount?.id || null;
  }

  private formatPaymentMethod(paymentMethod: any): string {
    if (!paymentMethod) return 'Unknown';
    const type = paymentMethod.type?.toLowerCase() || 'payment';
    const channel = paymentMethod.channel_code || paymentMethod.ewallet_type || '';
    return channel ? `${channel} (${type})` : type;
  }
}
```

### Accounting Entries Generated

When a donation is recorded, the system creates proper double-entry accounting using the **donor-selected category**:

**Example: ₱1,000 Tithes to General Fund via GCash**

| Account | Type | Debit | Credit |
|---------|------|-------|--------|
| Online Payments Clearing (Asset) | Asset | ₱1,000 | |
| Tithes (Revenue) | Revenue | | ₱1,000 |

**Example: ₱5,000 Building Fund Offering to Building Fund via Bank Transfer**

| Account | Type | Debit | Credit |
|---------|------|-------|--------|
| Online Payments Clearing (Asset) | Asset | ₱5,000 | |
| Building Fund Offering (Revenue) | Revenue | | ₱5,000 |

**Category & Fund Assignment:**
- The transaction line uses `category_id` = donor's selected category (Tithes, Offering, etc.)
- The transaction line uses `fund_id` = donor's selected fund (General Fund, Building Fund, etc.)
- This ensures donations appear correctly in:
  - **Income reports** by category (Tithes vs Offerings vs Missions)
  - **Fund reports** by designation (General Fund vs Building Fund)

### Viewing Donations in Financial Transactions

After integration, donations will appear in:

1. **Transaction Entry List** (`/admin/finance/transactions/entry`)
   - Searchable by description, reference (Xendit payment ID), date
   - Filterable by source (Online Giving), fund, category

2. **Fund Reports**
   - Donations increase the designated fund's balance
   - Visible in fund summary reports

3. **Income Reports**
   - Appears under Donations category in income statements
   - Aggregated in monthly/yearly income reports

4. **Member Giving Reports** (if linked to member)
   - Associated with member's account for giving statements
   - Appears in member's giving history

### Configuration Service

Create a service to manage tenant-specific donation configuration:

```typescript
// DonationConfigService.ts

@injectable()
export class DonationConfigService {
  /**
   * Ensure tenant has required financial setup for donations
   * Called during feature activation
   */
  async ensureFinancialSetup(tenantId: string): Promise<DonationConfig> {
    // 1. Ensure "Online Giving" source exists
    let source = await this.sourceRepo.findByName(tenantId, 'Online Giving');
    if (!source) {
      // Get or create appropriate asset account
      const assetCoa = await this.coaService.findOrCreateAccount(tenantId, {
        code: '1050',
        name: 'Online Payments Clearing',
        accountType: 'asset',
      });

      source = await this.sourceRepo.create({
        tenantId,
        name: 'Online Giving',
        description: 'Xendit payment gateway for online donations',
        sourceType: 'online',
        coaId: assetCoa.id,
        isActive: true,
      });
    }

    // 2. Ensure basic giving categories exist (tenant can add more)
    await this.ensureDefaultCategories(tenantId);

    // 3. Return config
    return {
      sourceId: source.id,
      defaultFundId: await this.getDefaultFund(tenantId),
    };
  }

  /**
   * Create default giving categories if they don't exist
   * Tenant can customize these via admin settings
   */
  private async ensureDefaultCategories(tenantId: string): Promise<void> {
    const defaultCategories = [
      { code: 'TITHES', name: 'Tithes', coaCode: '4010', coaName: 'Tithes' },
      { code: 'OFFERING', name: 'Offering', coaCode: '4020', coaName: 'General Offerings' },
      { code: 'MISSIONS', name: 'Missions', coaCode: '4030', coaName: 'Missions Offerings' },
      { code: 'BUILDING', name: 'Building Fund', coaCode: '4040', coaName: 'Building Fund Offerings' },
    ];

    for (const cat of defaultCategories) {
      const existing = await this.categoryRepo.findByCode(tenantId, cat.code);
      if (!existing) {
        const revenueCoa = await this.coaService.findOrCreateAccount(tenantId, {
          code: cat.coaCode,
          name: cat.coaName,
          accountType: 'revenue',
        });

        await this.categoryRepo.create({
          tenantId,
          code: cat.code,
          name: cat.name,
          chartOfAccountId: revenueCoa.id,
          isActive: true,
        });
      }
    }
  }

  /**
   * Get active giving categories for donor selection
   */
  async getGivingCategories(tenantId: string): Promise<Category[]> {
    return await this.categoryRepo.findActive(tenantId, {
      // Filter to income/giving categories only
      type: 'income',
    });
  }

  private async getDefaultFund(tenantId: string): Promise<string | null> {
    const generalFund = await this.fundRepo.findByCode(tenantId, 'GENERAL');
    return generalFund?.id || null;
  }
}
```

### Refund Handling

When a donation is refunded, create a reversal transaction:

```typescript
async processRefund(donationId: string, reason: string): Promise<void> {
  const donation = await this.donationRepo.findById(donationId);

  if (donation.status !== 'paid') {
    throw new Error('Can only refund paid donations');
  }

  // 1. Process refund via Xendit
  await this.xenditService.refundPayment(donation.xenditPaymentId, {
    amount: donation.amount,
    reason,
  });

  // 2. Update donation status
  await this.donationRepo.update(donationId, {
    status: 'refunded',
    refundedAt: new Date(),
    refundReason: reason,
  });

  // 3. Create reversal financial transaction
  const config = await this.configService.ensureFinancialSetup(donation.tenantId);

  await this.transactionService.create(
    {
      tenantId: donation.tenantId,
      transactionDate: new Date(),
      description: `Refund - Donation ${donationId.slice(0, 8)}`,
      reference: `REFUND-${donation.xenditPaymentId}`,
      sourceId: config.sourceId,
      status: 'posted',
    },
    [
      {
        transactionType: 'refund',  // or 'reversal'
        amount: donation.amount,
        categoryId: config.categoryId,
        fundId: donation.fundId,
        sourceId: config.sourceId,
        description: `Refund: ${reason}`,
      },
    ]
  );
}
```

---

## Frontend Components

### Giving Portal (Member-Facing)

Create metadata-driven pages following the existing XML blueprint pattern:

```xml
<!-- apps/web/metadata/authoring/blueprints/member-portal/giving.xml -->
<PageDefinition>
  <Meta>
    <Id>member-portal.giving</Id>
    <Title>Give Online</Title>
  </Meta>

  <Regions>
    <Region id="hero">
      <Component id="giving-hero" type="HeroSection">
        <Props>
          <Prop name="variant" kind="static">simple</Prop>
          <Prop name="headline" kind="static">Support Our Ministry</Prop>
        </Props>
      </Component>
    </Region>

    <Region id="giving-form">
      <Component id="donation-form" type="DonationForm">
        <Props>
          <Prop name="categories" kind="binding" contract="categoriesData.categories"/>
          <Prop name="funds" kind="binding" contract="fundsData.funds"/>
          <Prop name="campaigns" kind="binding" contract="campaignsData.campaigns"/>
          <Prop name="savedPaymentMethods" kind="binding" contract="paymentMethodsData.methods"/>
        </Props>
      </Component>
    </Region>
  </Regions>

  <DataSources>
    <!-- Giving categories: Tithes, Offering, Missions, etc. -->
    <DataSource id="categoriesData" kind="service">
      <Config>
        <Handler>member-portal.giving.categories</Handler>
      </Config>
    </DataSource>
    <DataSource id="fundsData" kind="service">
      <Config>
        <Handler>member-portal.giving.funds</Handler>
      </Config>
    </DataSource>
    <DataSource id="campaignsData" kind="service">
      <Config>
        <Handler>member-portal.giving.campaigns</Handler>
      </Config>
    </DataSource>
    <DataSource id="paymentMethodsData" kind="service">
      <Config>
        <Handler>member-portal.giving.payment-methods</Handler>
      </Config>
    </DataSource>
  </DataSources>
</PageDefinition>
```

### DonationForm Component

```typescript
// apps/web/src/components/dynamic/member/DonationForm.tsx

interface Category {
  id: string;
  code: string;
  name: string;  // "Tithes", "Offering", "Missions", etc.
}

interface DonationFormProps {
  categories: Category[];           // Giving types (Tithes, Offering, etc.)
  funds: Fund[];                    // Fund designations
  campaigns: Campaign[];
  savedPaymentMethods: PaymentMethod[];
}

export function DonationForm({
  categories,
  funds,
  campaigns,
  savedPaymentMethods
}: DonationFormProps) {
  const [amount, setAmount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');  // Required
  const [selectedFund, setSelectedFund] = useState<string>('');          // Optional
  const [paymentMethod, setPaymentMethod] = useState<'new' | string>('new');
  const [saveMethod, setSaveMethod] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      alert('Please select a giving type (Tithes, Offering, etc.)');
      return;
    }

    const response = await fetch('/api/donations', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        categoryId: selectedCategory,  // Required: Tithes, Offering, etc.
        fundId: selectedFund || null,   // Optional: Fund designation
        savedPaymentMethodId: paymentMethod !== 'new' ? paymentMethod : undefined,
        savePaymentMethod: paymentMethod === 'new' && saveMethod,
        isRecurring,
        recurringFrequency: isRecurring ? 'monthly' : undefined,
      }),
    });

    const { paymentUrl } = await response.json();

    // Redirect to Xendit payment page
    window.location.href = paymentUrl;
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Amount selection */}
      <AmountSelector value={amount} onChange={setAmount} />

      {/* Giving Type (Category) - REQUIRED */}
      <CategorySelector
        categories={categories}
        value={selectedCategory}
        onChange={setSelectedCategory}
        label="What type of giving is this?"
        required
      />
      {/* Example options: Tithes, Offering, Missions, Building Fund, Love Offering */}

      {/* Fund designation - OPTIONAL */}
      <FundSelector
        funds={funds}
        value={selectedFund}
        onChange={setSelectedFund}
        label="Designate to a specific fund (optional)"
      />

      {/* Payment method selection */}
      {savedPaymentMethods.length > 0 && (
        <PaymentMethodSelector
          methods={savedPaymentMethods}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
      )}

      {/* Save payment method option */}
      {paymentMethod === 'new' && (
        <Checkbox
          checked={saveMethod}
          onChange={setSaveMethod}
          label="Save this payment method for future donations"
        />
      )}

      {/* Recurring option */}
      <Checkbox
        checked={isRecurring}
        onChange={setIsRecurring}
        label="Make this a recurring monthly donation"
      />

      <Button type="submit" disabled={!selectedCategory || amount <= 0}>
        Continue to Payment
      </Button>
    </form>
  );
}
```

### Admin Donations Dashboard

```xml
<!-- apps/web/metadata/authoring/blueprints/admin-finance/donations-list.xml -->
<PageDefinition>
  <Meta>
    <Id>admin-finance.donations-list</Id>
    <Title>Donations</Title>
  </Meta>

  <Regions>
    <Region id="hero">
      <Component id="donations-hero" type="HeroSection">
        <Props>
          <Prop name="variant" kind="static">stats-panel</Prop>
          <Prop name="headline" kind="binding" contract="heroData.headline"/>
          <Prop name="metrics" kind="binding" contract="heroData.metrics"/>
        </Props>
      </Component>
    </Region>

    <Region id="donations-grid">
      <Component id="donations-table" type="AdminDataGridSection">
        <Props>
          <Prop name="rows" kind="binding" contract="donationsData.donations"/>
          <Prop name="columns" kind="binding" contract="donationsData.columns"/>
        </Props>
      </Component>
    </Region>
  </Regions>
</PageDefinition>
```

---

## Security Considerations

### What StewardTrack Stores vs What Xendit Stores

| Data Type | StewardTrack | Xendit |
|-----------|--------------|--------|
| Full card number (PAN) | **NO** | YES |
| Bank account number | **NO** | YES |
| CVV/CVC | **NO** | NO (never stored) |
| E-wallet credentials | **NO** | YES |
| Payment token ID | YES (reference) | YES (source) |
| Customer ID | YES (reference) | YES (source) |
| Masked card (****1234) | YES (display) | YES |
| Donor name | YES (encrypted) | YES |
| Donor email | YES (encrypted) | YES |
| Transaction amounts | YES | YES |
| Fund designations | YES | NO |

### Encryption Configuration

Add donation fields to the existing encryption config:

```typescript
// In apps/web/src/utils/encryptionUtils.ts

// Add to getFieldEncryptionConfig()
donations: {
  donor_name_encrypted: { required: false },
  donor_email_encrypted: { required: true },
  donor_phone_encrypted: { required: false },
  notes: { required: false },
},
```

### Environment Variables

```env
# Xendit Configuration
XENDIT_SECRET_KEY=xnd_production_...           # Server-side only
XENDIT_PUBLIC_KEY=xnd_public_production_...     # Client-side (for Xendit.js)
XENDIT_WEBHOOK_VERIFICATION_TOKEN=...           # Webhook signature verification

# Donation Configuration
DONATION_SUCCESS_URL=https://app.example.com/giving/success
DONATION_FAILURE_URL=https://app.example.com/giving/failed
DONATION_MINIMUM_AMOUNT=100                     # Minimum donation in PHP

# Cron Job Configuration (Required for Vercel Cron)
CRON_SECRET=your-secure-cron-secret             # Auth token for cron endpoints
```

### Vercel Cron Configuration (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/recurring-donations",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/disbursements",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### HTTPS Requirements

- All API calls to Xendit must be over HTTPS
- Webhook endpoint must be HTTPS
- Donation form pages must be HTTPS
- No sensitive data in URL parameters

---

## Compliance Checklist

### PCI-DSS Considerations

Since Xendit handles all card data:

- [x] **SAQ-A Eligible** - No card data touches StewardTrack servers
- [x] **Tokenization** - Only store Xendit-issued tokens
- [x] **HTTPS** - All communications encrypted in transit
- [x] **Access Control** - RLS policies enforce tenant isolation
- [x] **Audit Logging** - All webhook events logged
- [x] **Key Management** - API keys stored as environment variables

### Data Privacy

- [x] **Encrypted PII** - Donor names/emails encrypted at rest
- [x] **Masked Display** - Only show masked payment info (****1234)
- [x] **Anonymous Giving** - Support for anonymous donations
- [x] **Data Minimization** - Store only necessary information

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2) ✅ COMPLETE
- [x] Database migrations for new tables (donations, donor_payment_methods, campaigns, webhooks)
  - `20260120100007_create_donations_tables.sql`
  - `20260120100008_add_donation_fee_columns.sql`
  - `20260120100009_add_donation_terms_acceptance.sql`
- [x] Extend XenditService with Payments API methods (`XenditService.ts`)
- [x] Create DonationService, DonorPaymentMethodService (`DonationService.ts`, `DonorPaymentMethodService.ts`)
- [x] Create repositories and adapters (`donation.repository.ts`, `donationWebhook.repository.ts`, `donationFeeConfig.repository.ts`)
- [x] Webhook endpoint and handler (`/api/webhooks/donations/route.ts`)
- [x] Basic API endpoints:
  - `POST /api/donations` - Create donation
  - `GET /api/donations/[id]` - Get donation status
  - `POST /api/donations/[id]/refund` - Process refund
  - `GET /api/donations/categories` - List giving categories
  - `GET /api/donations/fees` - Calculate fees
  - `GET/PUT /api/donations/fee-config` - Manage fee configuration
  - `POST /api/public/donations` - Public donation endpoint

### Phase 1.5: Financial Integration (Week 2-3) ✅ COMPLETE
- [x] Integrate DonationService with IncomeExpenseTransactionService (DonationService.ts:42, 409, 598)
- [x] Link donations to financial_transaction_headers via `transactionService.create()`
- [x] Refund handling with reversal transactions (DonationService.ts:537-620)
- [ ] Auto-create "Online Giving" financial source during tenant setup (manual setup required)
- [ ] Auto-create "Donations" income category during tenant setup (manual setup required)
- [ ] Test donations appearing in /admin/finance/transactions/entry

### Phase 2: Donation Flow (Week 3-4) ✅ COMPLETE
- [x] DonationForm component (`components/donation/DonationForm.tsx`)
- [x] DonationSuccess component (`components/donation/DonationSuccess.tsx`)
- [x] DonationTermsDialog component (`components/donation/DonationTermsDialog.tsx`)
- [x] Public donation pages:
  - `/donate/[tenantToken]` - Donation form
  - `/donate/success` - Success confirmation
  - `/donate/failed` - Failed payment page
- [x] Public API endpoints (`/api/public/donations`, `/api/public/donations/fees`, `/api/public/donations/categories`)
- [x] Email notifications (`emails/templates/DonationReceivedEmail.tsx`)

### Phase 3: Payment Methods (Week 5) ✅ COMPLETE
- [x] Saved payment methods management (`DonorPaymentMethodService.ts`, `donorPaymentMethod.repository.ts`)
- [x] API endpoints for payment method management:
  - `GET /api/members/me/payment-methods` - List saved payment methods
  - `DELETE /api/members/me/payment-methods/[id]` - Remove payment method
  - `PUT /api/members/me/payment-methods/[id]/default` - Set as default
- [x] PaymentMethodManager component (`components/donation/PaymentMethodManager.tsx`)
  - List saved payment methods with masked account display
  - Set default payment method
  - Remove payment methods with confirmation
  - Loading and error states
- [x] useSavedPaymentMethods hook (`hooks/useSavedPaymentMethods.ts`)
  - Fetch saved methods for logged-in members
  - Authentication state detection
- [x] DonationForm integration with saved payment methods
  - "Your Saved Methods" section for authenticated members
  - Quick selection of saved payment methods
  - Fee calculation using saved method's payment type
- [ ] Direct debit linked account flow (deferred to Phase 4)

### Phase 4: Recurring Giving (Week 6) ✅ COMPLETE
- [x] Recurring donation setup
  - `RecurringDonationService.ts` - Core recurring donation business logic
  - `recurringDonation.adapter.ts` - Supabase operations for recurring donations
  - `recurringDonation.repository.ts` - Repository pattern wrapper
  - `recurringChargeHistory.adapter.ts` - Charge history tracking
  - `recurringChargeHistory.repository.ts` - Charge history repository
- [x] Scheduled charge processing
  - `/api/cron/recurring-donations/route.ts` - Vercel Cron job (daily at 2 AM UTC)
  - Automatic retry logic with configurable max attempts
  - Failed payment status tracking per charge
- [x] Recurring donation API endpoints:
  - `GET /api/donations/recurring` - List recurring donations
  - `POST /api/donations/recurring` - Create recurring donation
  - `GET /api/donations/recurring/[id]` - Get recurring donation details
  - `PUT /api/donations/recurring/[id]` - Update recurring donation (amount, frequency, payment method)
  - `POST /api/donations/recurring/[id]/pause` - Pause recurring donation
  - `POST /api/donations/recurring/[id]/resume` - Resume recurring donation
  - `POST /api/donations/recurring/[id]/cancel` - Cancel recurring donation
  - `GET /api/donations/recurring/[id]/history` - Get charge history
- [x] Database schema:
  - `20260120100010_recurring_donation_status.sql` - Recurring donation status tracking
  - Added `recurring_status` field (active, paused, cancelled, expired, failed)
  - Added `recurring_failed_attempts` counter
  - Added `recurring_last_charge_at` timestamp
- [x] DI Container integration:
  - `IRecurringDonationAdapter`, `IRecurringDonationRepository`
  - `IRecurringChargeHistoryAdapter`, `IRecurringChargeHistoryRepository`
  - `RecurringDonationService`
- [ ] Recurring donation management UI (deferred to Phase 5)
- [ ] Direct debit linked account flow (deferred to future release)

### Phase 4.5: Automated Disbursements/Payouts (Week 6-7) ✅ COMPLETE
- [x] Database schema for disbursements:
  - `20260120100005_add_disbursement_support.sql` - Complete disbursement schema
  - Extended `financial_sources` with Xendit payout configuration:
    - `xendit_payout_channel_id` - Reference to Xendit payout channel
    - `xendit_payout_channel_type` - Channel type (e.g., PH_BPI, PH_BDO)
    - `disbursement_schedule` - Schedule type (manual, daily, weekly, monthly)
    - `disbursement_minimum_amount` - Minimum amount before auto-disbursement
    - `last_disbursement_at` - Last disbursement timestamp
  - Created `disbursements` table for payout tracking
  - Created `disbursement_donations` junction table for donation-disbursement links
  - RPC functions for disbursement aggregation
- [x] Disbursement model and types (`disbursement.model.ts`):
  - `DisbursementStatus` - pending, processing, succeeded, failed, cancelled
  - `DisbursementSchedule` - manual, daily, weekly, monthly
  - `Disbursement` interface with full financial details
  - `DisbursementResult` for payout results
  - `ProcessDisbursementsResult` for batch processing
- [x] Financial source integration (`financialSource.model.ts`):
  - Extended with Xendit payout channel fields
  - Bank account details stored in Xendit Dashboard (not in StewardTrack)
  - Only stores channel references for security
- [x] Disbursement adapter and repository:
  - `disbursement.adapter.ts` - All Supabase operations
  - `disbursement.repository.ts` - Repository pattern wrapper
- [x] DisbursementService (`DisbursementService.ts`):
  - `createDisbursement()` - Create disbursement for a period
  - `processDisbursement()` - Trigger Xendit payout
  - `getTenantsWithScheduledDisbursements()` - Find tenants due for disbursement
  - `processScheduledDisbursementsForTenant()` - Batch process tenant disbursements
  - `getDisbursements()` - List disbursements for tenant
  - `getDisbursement()` - Get single disbursement details
  - `getDisbursementSummary()` - Dashboard summary stats
  - `getPayoutSources()` - List financial sources configured for payouts
- [x] Extended XenditService with Payout API:
  - `createPayout()` - Create Xendit payout
  - `getPayout()` - Get payout status
  - `cancelPayout()` - Cancel pending payout
  - `listPayouts()` - List payouts
  - Full TypeScript interfaces for Xendit Payout API
- [x] Disbursement API endpoints:
  - `GET /api/disbursements` - List disbursements
  - `POST /api/disbursements` - Create new disbursement
  - `GET /api/disbursements/[id]` - Get disbursement details
  - `POST /api/disbursements/[id]` - Process disbursement (trigger payout)
  - `GET /api/disbursements/summary` - Dashboard summary
  - `GET /api/disbursements/sources` - List payout-enabled financial sources
- [x] Scheduled disbursements cron job:
  - `/api/cron/disbursements/route.ts` - Daily at 3 AM UTC
  - Processes daily, weekly (Mondays), monthly (1st of month) schedules
  - CRON_SECRET validation for security
  - Vercel Cron integration with 5-minute max execution time
- [x] DI Container registration:
  - `IDisbursementAdapter`, `IDisbursementRepository`
  - `DisbursementService`

**Security Note (Updated v2.1):** Bank account numbers ARE stored in StewardTrack but are encrypted using AES-256 via `EncryptionService`. This enables in-app payout configuration while maintaining security. The encryption key is tenant-specific.

**Payout Configuration UI (v2.1):** Payout settings are integrated directly into the Financial Source form (`/admin/finance/sources/manage`). When `sourceType` is "Online Payment", additional fields appear:
- Payout bank/wallet (dropdown with Philippine banks)
- Account holder name
- Payout account number (encrypted on save)
- Disbursement schedule (manual/daily/weekly/monthly)
- Minimum disbursement amount
- Mark as donation destination toggle

This integrated approach provides a single form for managing financial sources with their payout configuration, rather than a separate section.

### Phase 5: Admin Features (Week 7-8) 🔄 IN PROGRESS
- [x] Admin donations dashboard:
  - `donations-list.xml` - List page with metrics, filters, and data grid
  - `donations-profile.xml` - Profile page with details and timeline
  - `admin-finance-donations.ts` - Service handlers for all data sources
  - Page routes: `/admin/finance/donations`, `/admin/finance/donations/[donationId]`
- [x] Donation export (CSV/Excel):
  - `/api/donations/export` - Export API endpoint with filtering support
  - Query parameters: `status`, `startDate`, `endDate`, `format` (xlsx/csv)
  - Exports: Donation ID, Date, Status, Donor Name/Email/Phone, Amount, Category, Fund, Campaign, Payment Method, etc.
  - Includes Summary sheet with: Total received, Total fees, Average donation, Status breakdown
  - Decrypts donor PII (name, email, phone) using EncryptionService
  - Export button added to donations list toolbar via AdminDataGridSection actions
- [x] Share Donation Link feature:
  - `DonationLinkShare.tsx` - Dialog component with Link and QR Code tabs
  - Copy to clipboard, Preview, Share (Web Share API), Download QR functionality
  - `/api/donations/share-link` - API to generate public donation URL with tenant token
  - Registered in component registry and added to `donations-list.xml`
- [x] Refund processing (backend: DonationService.processRefund, API: /api/donations/[id]/refund)
- [ ] Campaign management UI (backend: campaign.repository.ts exists)
- [x] Recurring donation management UI:
  - [x] Admin list view of all recurring donations:
    - `donations-recurring-list.xml` - List page with MRR metrics, status breakdown, and data grid
    - Service handlers: `hero`, `summary`, `statusOverview`, `table`
    - Page route: `/admin/finance/donations/recurring`
  - [x] Recurring donation profile/details page:
    - `donations-recurring-profile.xml` - Profile with subscription details, donor info, and charge history
    - Service handlers: `header`, `details`, `chargeHistory`
    - Page route: `/admin/finance/donations/recurring/[donationId]`
  - [x] Pause/resume/cancel action handlers in `admin-finance-donations.ts`
  - [x] Charge history timeline component
  - [ ] Member self-service recurring management (deferred)
- [x] Financial source payout configuration (v2.1):
  - [x] Integrated into Financial Source form (`/admin/finance/sources/manage`)
  - [x] Conditional fields shown when `sourceType` is "Online Payment"
  - [x] Bank channel selection (PH_BDO, PH_BPI, etc.) from `PH_BANK_CHANNELS` constant
  - [x] Account holder name and encrypted account number fields
  - [x] Disbursement schedule and minimum amount configuration
  - [x] "Mark as donation destination" toggle
  - [x] Updated `saveSource` handler to persist payout configuration
  - [x] Updated `admin-finance-sources.ts` service handlers
- [ ] Disbursement management UI:
  - [ ] Admin disbursement dashboard
  - [ ] Manual disbursement creation
  - [ ] Disbursement history and status tracking

**Bug Fixes (Jan 20, 2026):**
- [x] Fixed encryption parameter order in `DonationService.encryptDonorPii` and `getDonationWithDecryptedPii`
  - Correct order: `(value, tenantId, fieldName)`
- [x] Fixed decryption parameter order in `/api/donations/export/route.ts`
- [x] Fixed RLS policy issue for `donation_fee_configs` table
  - Public donation API now uses service role client to create default fee configs
  - `DonationFeeConfigAdapter` updated to use `getSupabaseServiceClient()`
- [x] Added detailed error logging to XenditService for debugging API validation errors

**Updates (Jan 21, 2026):**
- [x] Integrated payout configuration into Financial Source form (removed separate `AdminPayoutConfigSection`)
  - Payout fields now appear conditionally when `sourceType === 'online'`
  - Single submit button saves both source and payout configuration
  - Uses `visibleWhen` conditional field visibility
- [x] Added XenPlatform sub-account support:
  - `XenPlatformService.ts` - Sub-account creation and management
  - `tenants.xendit_sub_account_id` - Stores Xendit sub-account reference
  - `for-user-id` header support in XenditService for sub-account transactions
- [x] Extended `financial_sources` with payout fields:
  - `xendit_channel_code` - Philippine bank channel code (PH_BDO, PH_BPI, etc.)
  - `bank_account_holder_name` - Account holder name
  - `bank_account_number_encrypted` - Encrypted bank account number
  - `is_donation_destination` - Flag for donation payout destination
- [x] Fixed AdminFormSection background color for light/dark mode (`bg-card` instead of `bg-background`)

### Phase 6: Testing & Security (Week 9) ⏳ NOT STARTED
- [ ] End-to-end testing with Xendit sandbox
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation

---

## References

- [Xendit API Documentation](https://docs.xendit.co/)
- [Xendit Payments API](https://developers.xendit.co/api-reference/payments-api/)
- [Xendit XenPlatform Overview](https://docs.xendit.co/docs/xenplatform-overview) - Multi-tenant sub-accounts
- [Xendit XenPlatform Accounts API](https://developers.xendit.co/api-reference/balance-and-transaction/balance/accounts) - Sub-account creation
- [Xendit Tokenization](https://docs.xendit.co/tokenization-with-payments-api/)
- [Xendit Direct Debit](https://docs.xendit.co/direct-debit)
- [Xendit Payout API](https://developers.xendit.co/api-reference/payouts) - For disbursements to bank accounts
- [Xendit Payout Channels](https://docs.xendit.co/payouts/channel-codes) - Supported banks and e-wallets
- [PCI-DSS Compliance Guide](https://www.pcisecuritystandards.org/standards/)
- [Stripe Security Best Practices](https://stripe.com/guides/pci-compliance) (reference for tokenization patterns)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) - Scheduled job configuration
