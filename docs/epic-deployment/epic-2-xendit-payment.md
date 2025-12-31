# Epic 2: Xendit Payment Integration

**Release:** Beta - March 2026
**Timeline:** Week 2 (January 13-19, 2026)
**Duration:** 1 week (accelerated with Claude AI)
**Priority:** P0 (Blocking - Required for Product Launch)
**Epic Owner:** Backend Team + Claude AI Assistance
**Dependencies:** Epic 1 (JWT Authentication)

## Epic Overview

Integrate Xendit payment gateway to support Philippine payment methods (GCash, PayMaya, Bank Transfer, Over-the-Counter) for StewardTrack subscription payments. This enables tenants to upgrade their plans, manage billing, and process recurring subscription payments.

## Architecture

### Payment Flow

```
Marketing Website (stewardtrack.com)
    │
    ├─> User selects plan (Essential/Professional/Enterprise/Premium)
    │
    └─> POST /api/payments/create-invoice (app.stewardtrack.com)
         ├─> Creates Xendit invoice
         ├─> Returns payment URL
         │
         └─> User redirected to Xendit checkout page
              ├─> GCash
              ├─> PayMaya
              ├─> Bank Transfer
              └─> Over-the-Counter (7-Eleven, etc.)

Xendit processes payment
    │
    └─> Webhook: POST /api/webhooks/xendit
         ├─> Verifies webhook signature
         ├─> Updates payment record
         ├─> Activates/upgrades license
         └─> Grants feature access
```

### Xendit Payment Methods Supported

1. **E-Wallets:**
   - GCash (most popular in Philippines)
   - PayMaya
   - GrabPay

2. **Bank Transfer:**
   - BPI
   - BDO
   - UnionBank
   - Others

3. **Over-the-Counter:**
   - 7-Eleven
   - Cebuana Lhuillier
   - MLhuillier

4. **Cards:**
   - Visa
   - Mastercard

---

## User Stories

### Story 2.1: Xendit Service Setup

**As a** system administrator
**I want** Xendit API integrated into the application
**So that** we can process payments for subscriptions

**Priority:** P0
**Story Points:** 5

#### Acceptance Criteria

- [ ] Xendit API credentials configured in environment variables
- [ ] XenditService class created with invoice and webhook methods
- [ ] API key validation on service initialization
- [ ] Test mode vs production mode support
- [ ] Error handling for Xendit API failures
- [ ] Logging for all payment operations

#### Implementation

##### Step 1: Install Xendit SDK

```bash
npm install xendit-node
npm install --save-dev @types/xendit-node
```

##### Step 2: Environment Variables

**File:** `.env.local`

```env
# Xendit Configuration
XENDIT_SECRET_KEY=xnd_development_your_secret_key_here
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token_here
XENDIT_PUBLIC_KEY=xnd_public_development_your_public_key_here

# Payment Configuration
PAYMENT_SUCCESS_URL=https://app.stewardtrack.com/admin/billing/success
PAYMENT_FAILURE_URL=https://app.stewardtrack.com/admin/billing/failed
PAYMENT_CURRENCY=PHP
```

##### Step 3: Create XenditService

**File:** `src/services/XenditService.ts`

```typescript
import { injectable } from 'inversify';
import Xendit from 'xendit-node';

export interface CreateInvoiceParams {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  items?: {
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }[];
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
}

export interface XenditInvoice {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED';
  merchant_name: string;
  amount: number;
  payer_email: string;
  description: string;
  invoice_url: string;
  expiry_date: string;
  created: string;
  updated: string;
  currency: string;
  payment_method?: string;
  paid_amount?: number;
  paid_at?: string;
}

@injectable()
export class XenditService {
  private xendit: Xendit;
  private isTestMode: boolean;

  constructor() {
    const secretKey = process.env.XENDIT_SECRET_KEY;

    if (!secretKey) {
      throw new Error('XENDIT_SECRET_KEY is not configured');
    }

    this.isTestMode = secretKey.includes('development');
    this.xendit = new Xendit({
      secretKey
    });

    console.log(`XenditService initialized in ${this.isTestMode ? 'TEST' : 'PRODUCTION'} mode`);
  }

  /**
   * Create a Xendit invoice for subscription payment
   */
  async createInvoice(params: CreateInvoiceParams): Promise<XenditInvoice> {
    try {
      const { Invoice } = this.xendit;

      const invoiceData = {
        externalID: params.externalId,
        amount: params.amount,
        payerEmail: params.payerEmail,
        description: params.description,
        currency: process.env.PAYMENT_CURRENCY || 'PHP',
        successRedirectURL: params.successRedirectUrl || process.env.PAYMENT_SUCCESS_URL,
        failureRedirectURL: params.failureRedirectUrl || process.env.PAYMENT_FAILURE_URL,
        items: params.items,
        invoiceDuration: 86400, // 24 hours
        shouldSendEmail: true,
        reminderTime: 1 // Send reminder 1 day before expiry
      };

      const invoice = await Invoice.createInvoice(invoiceData);

      console.log('Xendit invoice created:', {
        id: invoice.id,
        externalId: invoice.external_id,
        amount: invoice.amount,
        status: invoice.status
      });

      return invoice as XenditInvoice;
    } catch (error) {
      console.error('Failed to create Xendit invoice:', error);
      throw new Error(`XENDIT_INVOICE_CREATION_FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<XenditInvoice> {
    try {
      const { Invoice } = this.xendit;
      const invoice = await Invoice.getInvoice({ invoiceID: invoiceId });
      return invoice as XenditInvoice;
    } catch (error) {
      console.error('Failed to get Xendit invoice:', error);
      throw new Error(`XENDIT_GET_INVOICE_FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook callback token
   */
  verifyWebhookToken(callbackToken: string): boolean {
    const expectedToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN;

    if (!expectedToken) {
      console.warn('XENDIT_WEBHOOK_VERIFICATION_TOKEN not configured');
      return false;
    }

    return callbackToken === expectedToken;
  }

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods(): string[] {
    return [
      'GCASH',
      'PAYMAYA',
      'GRABPAY',
      'BPI',
      'BDO',
      'UNIONBANK',
      'SEVEN_ELEVEN',
      'CEBUANA',
      'MLHUILLIER',
      'CREDIT_CARD'
    ];
  }
}
```

##### Step 4: Update DI Container

**File:** `src/lib/types.ts`

```typescript
export const TYPES = {
  // ... existing types
  XenditService: Symbol.for('XenditService'),
};
```

**File:** `src/lib/container.ts`

```typescript
import { XenditService } from '@/services/XenditService';

container.bind<XenditService>(TYPES.XenditService).to(XenditService).inSingletonScope();
```

---

### Story 2.2: Database Schema for Payments

**As a** system administrator
**I want** database tables to track payment transactions
**So that** we can maintain payment history and reconcile subscriptions

**Priority:** P0
**Story Points:** 3

#### Acceptance Criteria

- [ ] `payments` table created to store transaction records
- [ ] `subscriptions` table created to track tenant subscriptions
- [ ] `payment_methods` table for saved payment preferences
- [ ] Foreign keys link to tenants and licenses
- [ ] Indexes on frequently queried columns
- [ ] RLS policies for tenant isolation

#### Implementation

**File:** `supabase/migrations/20250128000001_create_payments_tables.sql`

```sql
-- =====================================================
-- PAYMENTS TABLE
-- Stores all payment transactions
-- =====================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Xendit invoice details
  xendit_invoice_id TEXT UNIQUE NOT NULL,
  external_id TEXT UNIQUE NOT NULL,

  -- Payment details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'settled', 'expired', 'failed')),
  payment_method TEXT,

  -- Payer information
  payer_email TEXT NOT NULL,

  -- Invoice metadata
  description TEXT,
  invoice_url TEXT,
  expiry_date TIMESTAMPTZ,

  -- Payment completion
  paid_amount DECIMAL(12, 2),
  paid_at TIMESTAMPTZ,

  -- Subscription linking
  subscription_id UUID REFERENCES subscriptions(id),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_xendit_invoice_id ON payments(xendit_invoice_id);
CREATE INDEX idx_payments_external_id ON payments(external_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_payments" ON payments
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_insert_payments" ON payments
  FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_update_payments" ON payments
  FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- Tracks tenant subscription lifecycle
-- =====================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Plan details
  plan_name TEXT NOT NULL CHECK (plan_name IN ('essential', 'professional', 'enterprise', 'premium')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),

  -- Pricing
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',

  -- Status
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),

  -- Subscription period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,

  -- License linking
  license_id UUID REFERENCES licenses(id),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, plan_name)
);

-- Indexes
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_subscriptions" ON subscriptions
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_insert_subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_update_subscriptions" ON subscriptions
  FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- =====================================================
-- PAYMENT METHODS TABLE (Optional - for saved payment preferences)
-- =====================================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Payment method type
  type TEXT NOT NULL CHECK (type IN ('gcash', 'paymaya', 'bank_transfer', 'credit_card', 'otc')),

  -- Method details (encrypted sensitive data)
  details JSONB DEFAULT '{}',

  -- Default flag
  is_default BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);

-- RLS Policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_payment_methods" ON payment_methods
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_insert_payment_methods" ON payment_methods
  FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_update_payment_methods" ON payment_methods
  FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_delete_payment_methods" ON payment_methods
  FOR DELETE USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- =====================================================
-- TRIGGER: Update updated_at timestamps
-- =====================================================
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Story 2.3: Payment Service

**As a** backend developer
**I want** a PaymentService to handle subscription payments
**So that** I can create invoices and manage payment lifecycle

**Priority:** P0
**Story Points:** 8

#### Acceptance Criteria

- [ ] PaymentService created with DI
- [ ] `createSubscriptionInvoice()` generates Xendit invoice
- [ ] `updatePaymentStatus()` updates payment record
- [ ] `activateSubscription()` grants license features
- [ ] Integration with LicensingService
- [ ] Audit logging for all payment operations

#### Implementation

**File:** `src/repositories/payment.repository.ts`

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface Payment {
  id: string;
  tenant_id: string;
  xendit_invoice_id: string;
  external_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'settled' | 'expired' | 'failed';
  payment_method?: string;
  payer_email: string;
  description?: string;
  invoice_url?: string;
  expiry_date?: string;
  paid_amount?: number;
  paid_at?: string;
  subscription_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentDto {
  tenant_id: string;
  xendit_invoice_id: string;
  external_id: string;
  amount: number;
  currency: string;
  status: string;
  payer_email: string;
  description?: string;
  invoice_url?: string;
  expiry_date?: string;
  subscription_id?: string;
  metadata?: Record<string, any>;
}

@injectable()
export class PaymentRepository {
  async create(data: CreatePaymentDto): Promise<Payment> {
    const supabase = getSupabaseServerClient();

    const { data: payment, error } = await supabase
      .from('payments')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    return payment;
  }

  async findById(id: string): Promise<Payment | null> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async findByXenditInvoiceId(xenditInvoiceId: string): Promise<Payment | null> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('xendit_invoice_id', xenditInvoiceId)
      .single();

    if (error) return null;
    return data;
  }

  async findByExternalId(externalId: string): Promise<Payment | null> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (error) return null;
    return data;
  }

  async findAllByTenant(tenantId: string): Promise<Payment[]> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }

    return data || [];
  }

  async updateStatus(
    id: string,
    status: string,
    paidAmount?: number,
    paidAt?: string,
    paymentMethod?: string
  ): Promise<Payment> {
    const supabase = getSupabaseServerClient();

    const updateData: any = { status };
    if (paidAmount !== undefined) updateData.paid_amount = paidAmount;
    if (paidAt !== undefined) updateData.paid_at = paidAt;
    if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update payment: ${error.message}`);
    }

    return data;
  }
}
```

**File:** `src/services/PaymentService.ts`

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { XenditService } from './XenditService';
import type { PaymentRepository } from '@/repositories/payment.repository';
import type { LicensingService } from './LicensingService';

export interface CreateSubscriptionInvoiceParams {
  tenantId: string;
  planName: 'essential' | 'professional' | 'enterprise' | 'premium';
  billingCycle: 'monthly' | 'annual';
  payerEmail: string;
}

const PLAN_PRICING = {
  essential: { monthly: 999, annual: 9990 },
  professional: { monthly: 2999, annual: 29990 },
  enterprise: { monthly: 7999, annual: 79990 },
  premium: { monthly: 14999, annual: 149990 }
};

@injectable()
export class PaymentService {
  constructor(
    @inject(TYPES.XenditService)
    private xenditService: XenditService,

    @inject(TYPES.PaymentRepository)
    private paymentRepository: PaymentRepository,

    @inject(TYPES.LicensingService)
    private licensingService: LicensingService
  ) {}

  /**
   * Create a subscription payment invoice
   */
  async createSubscriptionInvoice(params: CreateSubscriptionInvoiceParams): Promise<{
    paymentId: string;
    invoiceUrl: string;
    amount: number;
  }> {
    const { tenantId, planName, billingCycle, payerEmail } = params;

    // Get pricing
    const amount = PLAN_PRICING[planName][billingCycle];

    // Generate unique external ID
    const externalId = `SUB-${tenantId.substring(0, 8)}-${Date.now()}`;

    // Create Xendit invoice
    const invoice = await this.xenditService.createInvoice({
      externalId,
      amount,
      payerEmail,
      description: `StewardTrack ${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan (${billingCycle})`,
      items: [
        {
          name: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan`,
          quantity: 1,
          price: amount,
          category: billingCycle === 'monthly' ? 'Monthly Subscription' : 'Annual Subscription'
        }
      ]
    });

    // Create payment record
    const payment = await this.paymentRepository.create({
      tenant_id: tenantId,
      xendit_invoice_id: invoice.id,
      external_id: externalId,
      amount,
      currency: 'PHP',
      status: 'pending',
      payer_email: payerEmail,
      description: `${planName} plan - ${billingCycle} billing`,
      invoice_url: invoice.invoice_url,
      expiry_date: invoice.expiry_date,
      metadata: {
        plan_name: planName,
        billing_cycle: billingCycle
      }
    });

    console.log('Subscription invoice created:', {
      paymentId: payment.id,
      xenditInvoiceId: invoice.id,
      amount
    });

    return {
      paymentId: payment.id,
      invoiceUrl: invoice.invoice_url,
      amount
    };
  }

  /**
   * Update payment status from webhook
   */
  async updatePaymentStatus(xenditInvoiceId: string, webhookData: any): Promise<void> {
    // Find payment record
    const payment = await this.paymentRepository.findByXenditInvoiceId(xenditInvoiceId);

    if (!payment) {
      throw new Error(`Payment not found for Xendit invoice: ${xenditInvoiceId}`);
    }

    // Map Xendit status to our status
    const status = this.mapXenditStatus(webhookData.status);

    // Update payment record
    await this.paymentRepository.updateStatus(
      payment.id,
      status,
      webhookData.paid_amount,
      webhookData.paid_at,
      webhookData.payment_method
    );

    console.log('Payment status updated:', {
      paymentId: payment.id,
      status,
      paidAmount: webhookData.paid_amount
    });

    // If paid, activate subscription
    if (status === 'paid' || status === 'settled') {
      await this.activateSubscription(payment);
    }
  }

  /**
   * Activate subscription after successful payment
   */
  private async activateSubscription(payment: any): Promise<void> {
    const planName = payment.metadata?.plan_name;
    const billingCycle = payment.metadata?.billing_cycle;

    if (!planName) {
      console.error('Missing plan_name in payment metadata');
      return;
    }

    // Calculate subscription period
    const periodStart = new Date();
    const periodEnd = new Date();
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Upgrade license and grant features
    await this.licensingService.upgradeLicense(payment.tenant_id, planName);

    console.log('Subscription activated:', {
      tenantId: payment.tenant_id,
      planName,
      periodStart,
      periodEnd
    });
  }

  /**
   * Map Xendit status to internal status
   */
  private mapXenditStatus(xenditStatus: string): 'pending' | 'paid' | 'settled' | 'expired' | 'failed' {
    const statusMap: Record<string, any> = {
      'PENDING': 'pending',
      'PAID': 'paid',
      'SETTLED': 'settled',
      'EXPIRED': 'expired'
    };

    return statusMap[xenditStatus] || 'failed';
  }

  /**
   * Get payment history for tenant
   */
  async getPaymentHistory(tenantId: string): Promise<any[]> {
    return await this.paymentRepository.findAllByTenant(tenantId);
  }
}
```

##### Update DI Container

**File:** `src/lib/types.ts`

```typescript
export const TYPES = {
  // ... existing
  PaymentService: Symbol.for('PaymentService'),
  PaymentRepository: Symbol.for('PaymentRepository'),
};
```

**File:** `src/lib/container.ts`

```typescript
import { PaymentService } from '@/services/PaymentService';
import { PaymentRepository } from '@/repositories/payment.repository';

container.bind<PaymentService>(TYPES.PaymentService).to(PaymentService).inRequestScope();
container.bind<PaymentRepository>(TYPES.PaymentRepository).to(PaymentRepository).inRequestScope();
```

---

### Story 2.4: Create Invoice API

**As a** tenant administrator
**I want** to initiate a subscription payment
**So that** I can upgrade my plan

**Priority:** P0
**Story Points:** 3

#### Acceptance Criteria

- [ ] POST `/api/payments/create-invoice` endpoint creates Xendit invoice
- [ ] Validates plan and billing cycle
- [ ] Returns invoice URL for redirect
- [ ] Requires authentication
- [ ] Records payment in database

#### API Specification

**Endpoint:** `POST /api/payments/create-invoice`

**Request Body:**
```json
{
  "planName": "professional",
  "billingCycle": "monthly"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-uuid-here",
    "invoiceUrl": "https://checkout.xendit.co/web/invoice-id-here",
    "amount": 2999,
    "currency": "PHP",
    "expiresAt": "2025-01-29T12:00:00Z"
  }
}
```

#### Implementation

**File:** `src/app/api/payments/create-invoice/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PaymentService } from '@/services/PaymentService';
import { getAuthContext } from '@/lib/server/auth-context';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  planName: z.enum(['essential', 'professional', 'enterprise', 'premium']),
  billingCycle: z.enum(['monthly', 'annual'])
});

export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user context
    const authContext = await getAuthContext();

    // 2. Validate request body
    const body = await request.json();
    const { planName, billingCycle } = createInvoiceSchema.parse(body);

    // 3. Get PaymentService
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);

    // 4. Create invoice
    const result = await paymentService.createSubscriptionInvoice({
      tenantId: authContext.tenantId,
      planName,
      billingCycle,
      payerEmail: authContext.email
    });

    // 5. Return invoice URL
    return NextResponse.json({
      success: true,
      data: {
        paymentId: result.paymentId,
        invoiceUrl: result.invoiceUrl,
        amount: result.amount,
        currency: 'PHP'
      }
    });
  } catch (error) {
    console.error('Create invoice error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVOICE_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create invoice'
        }
      },
      { status: 500 }
    );
  }
}
```

---

### Story 2.5: Xendit Webhook Handler

**As a** system administrator
**I want** webhook notifications from Xendit
**So that** payment status updates are processed automatically

**Priority:** P0
**Story Points:** 5

#### Acceptance Criteria

- [ ] POST `/api/webhooks/xendit` endpoint receives webhook callbacks
- [ ] Verifies webhook signature/token
- [ ] Updates payment status in database
- [ ] Activates subscription on successful payment
- [ ] Grants license features
- [ ] Handles all Xendit event types (invoice.paid, invoice.expired, etc.)
- [ ] Idempotent processing (handles duplicate webhooks)

#### Implementation

**File:** `src/app/api/webhooks/xendit/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { XenditService } from '@/services/XenditService';
import type { PaymentService } from '@/services/PaymentService';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook token
    const callbackToken = request.headers.get('x-callback-token');

    if (!callbackToken) {
      console.error('Missing webhook callback token');
      return NextResponse.json(
        { error: 'Missing callback token' },
        { status: 401 }
      );
    }

    const xenditService = container.get<XenditService>(TYPES.XenditService);

    if (!xenditService.verifyWebhookToken(callbackToken)) {
      console.error('Invalid webhook callback token');
      return NextResponse.json(
        { error: 'Invalid callback token' },
        { status: 401 }
      );
    }

    // 2. Parse webhook payload
    const webhookData = await request.json();

    console.log('Xendit webhook received:', {
      id: webhookData.id,
      externalId: webhookData.external_id,
      status: webhookData.status,
      event: webhookData.event
    });

    // 3. Handle based on event type
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);

    switch (webhookData.status) {
      case 'PAID':
      case 'SETTLED':
        await paymentService.updatePaymentStatus(webhookData.id, webhookData);
        console.log('Payment successful:', webhookData.id);
        break;

      case 'EXPIRED':
        await paymentService.updatePaymentStatus(webhookData.id, {
          status: 'EXPIRED'
        });
        console.log('Payment expired:', webhookData.id);
        break;

      default:
        console.log('Unhandled webhook status:', webhookData.status);
    }

    // 4. Return success (important for Xendit to mark webhook as delivered)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Return 200 to prevent Xendit from retrying on application errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed'
      },
      { status: 200 }
    );
  }
}

// Disable body parsing to access raw body
export const config = {
  api: {
    bodyParser: true
  }
};
```

**Update Middleware to Allow Webhook:**

**File:** `src/middleware.ts`

```typescript
const PUBLIC_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh-token',
  '/api/webhooks/xendit', // Add this
  '/api/health'
];
```

---

### Story 2.6: Billing Dashboard UI

**As a** tenant administrator
**I want** to view my billing history and subscription status
**So that** I can manage my account

**Priority:** P1
**Story Points:** 5

#### Acceptance Criteria

- [ ] `/admin/billing` page displays current subscription
- [ ] Shows payment history with status
- [ ] "Upgrade Plan" button initiates payment flow
- [ ] Displays next billing date
- [ ] Shows active features for current plan

#### Implementation

**File:** `src/app/admin/billing/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method?: string;
}

export default function BillingPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments/history');
      const data = await response.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string, billingCycle: string) => {
    try {
      const response = await fetch('/api/payments/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, billingCycle })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Xendit checkout
        window.location.href = data.data.invoiceUrl;
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Manage your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">Professional Plan</p>
              <p className="text-muted-foreground">Monthly billing - PHP 2,999/month</p>
            </div>
            <Button onClick={() => handleUpgrade('enterprise', 'monthly')}>
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-2">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">PHP {payment.amount.toLocaleString()}</td>
                    <td className="py-2">{payment.payment_method || '-'}</td>
                    <td className="py-2">
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**File:** `src/app/api/payments/history/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PaymentService } from '@/services/PaymentService';
import { getAuthContext } from '@/lib/server/auth-context';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    const paymentService = container.get<PaymentService>(TYPES.PaymentService);
    const payments = await paymentService.getPaymentHistory(authContext.tenantId);

    return NextResponse.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payment history error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch payment history'
        }
      },
      { status: 500 }
    );
  }
}
```

---

## Testing Strategy

### Unit Tests
- [ ] XenditService creates invoices correctly
- [ ] PaymentService handles all payment statuses
- [ ] Webhook signature verification works
- [ ] Payment status mapping is accurate

### Integration Tests
- [ ] Create invoice API returns valid Xendit URL
- [ ] Webhook updates payment status
- [ ] Subscription activation grants features
- [ ] Payment history API returns tenant payments only

### Manual Testing
1. Create subscription invoice from billing page
2. Complete payment on Xendit checkout (use test cards)
3. Verify webhook received and processed
4. Verify license upgraded
5. Verify features granted
6. Test expired invoice handling
7. Test payment history display

### Xendit Test Cards
```
GCash Test: Use any mobile number
Card Success: 4000000000001091
Card Failure: 4000000000000002
```

---

## Xendit Webhook Configuration

**Webhook URL:** `https://app.stewardtrack.com/api/webhooks/xendit`

**Events to Subscribe:**
- Invoice Paid
- Invoice Expired
- Invoice Payment Failed

**Configure in Xendit Dashboard:**
1. Go to Settings → Webhooks
2. Add webhook URL
3. Select invoice events
4. Copy verification token to env vars

---

## Epic Completion Checklist

- [ ] XenditService implemented
- [ ] Payment database tables migrated
- [ ] PaymentService with all methods
- [ ] Create invoice API endpoint
- [ ] Webhook handler implemented
- [ ] Billing dashboard UI
- [ ] Payment history API
- [ ] Webhook verification configured
- [ ] Test mode tested with Xendit sandbox
- [ ] Production credentials configured
- [ ] Webhook URL registered in Xendit
- [ ] Error handling and logging
- [ ] Documentation complete

---

## Next Epic

[Epic 3: SaaS Admin Dashboard](./epic-3-saas-admin-dashboard.md)
