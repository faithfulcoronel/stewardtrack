# Implementation Plan: Hybrid Pricing Model for Philippines Market

**Document Version:** 1.0
**Date:** January 2026
**Status:** Planning

---

## Executive Summary

This document provides a comprehensive, phased implementation plan for launching StewardTrack's hybrid pricing model in the Philippines market. Each phase is **shippable** and delivers incremental value. The plan is based on analysis of the existing codebase and builds upon established infrastructure.

---

## Current State Analysis

### What Already Exists

Based on codebase analysis, the following infrastructure is **already implemented**:

#### Licensing & Subscription System
| Component | Status | Location |
|-----------|--------|----------|
| Product Offerings (tiers) | ✅ Complete | `product_offerings` table |
| Multi-currency pricing (PHP, USD) | ✅ Complete | `product_offering_prices` table |
| Feature bundles | ✅ Complete | `license_feature_bundles` table |
| Tenant feature grants | ✅ Complete | `tenant_feature_grants` table |
| License provisioning | ✅ Complete | `LicensingService.ts` |
| License validation | ✅ Complete | `LicenseValidationService.ts` |
| License monitoring | ✅ Complete | `LicenseMonitoringService.ts` |

#### Payment Infrastructure
| Component | Status | Location |
|-----------|--------|----------|
| Xendit API integration | ✅ Complete | `XenditService.ts` |
| Invoice creation | ✅ Complete | `PaymentService.ts` |
| Webhook handling | ✅ Complete | `/api/webhooks/xendit/route.ts` |
| Subscription lifecycle | ✅ Complete | `PaymentSubscriptionService.ts` |
| Payment methods storage | ✅ Complete | `payment_methods` table |
| Multi-currency support | ✅ Complete | `currency.enums.ts` |

#### Basic Quota System
| Component | Status | Location |
|-----------|--------|----------|
| Tier limits definition | ✅ Basic | `SubscriptionService.ts` |
| Member count tracking | ✅ Complete | `subscription.adapter.ts` |
| Transaction count tracking | ✅ Complete | `subscription.adapter.ts` |

**Current Tier Limits (in `SubscriptionService.ts`):**
```typescript
const TIER_LIMITS = {
  free: { members: 25, transactions: 1000 },
  basic: { members: 100, transactions: 5000 },
  advanced: { members: 250, transactions: 10000 },
  premium: { members: 1000, transactions: 50000 },
  enterprise: { members: -1, transactions: -1 }, // unlimited
};
```

#### Notification System
| Component | Status | Location |
|-----------|--------|----------|
| In-app notifications | ✅ Complete | `NotificationService.ts` |
| Email (Resend) | ✅ Complete | `EmailChannel.ts` |
| SMS (Twilio) | ✅ Complete | `SmsChannel.ts` |
| Push (Firebase) | ✅ Complete | `PushChannel.ts` |
| 60+ email templates | ✅ Complete | `apps/web/src/emails/templates/` |

#### Donation/Giving System
| Component | Status | Location |
|-----------|--------|----------|
| Financial transactions | ✅ Complete | `income_expense_transactions` table |
| Double-entry ledger | ✅ Complete | `financial_transactions` table |
| Fund management | ✅ Complete | `funds` table |
| Member giving profiles | ✅ Complete | `member_giving_profiles` table |
| Donation import | ✅ Complete | `DonationImportService.ts` |

### What Needs to Be Built

| Component | Priority | Phase |
|-----------|----------|-------|
| Philippine tier structure (Filipino names) | High | 1 |
| SMS/Email quota tracking & enforcement | High | 1 |
| Storage quota tracking | Medium | 2 |
| Admin users quota tracking | Medium | 2 |
| Quota enforcement middleware | High | 1 |
| Billing dashboard UI | High | 2 |
| Online giving via Xendit | High | 3 |
| Disbursement to church bank accounts | High | 3 |
| GCash/PayMaya UI flows | High | 3 |
| Filipino language interface | Medium | 4 |
| Recurring donations | Medium | 4 |
| Giving analytics dashboard | Low | 5 |

---

## Phase 1: Foundation - Quota Infrastructure

**Duration:** 2-3 weeks
**Goal:** Establish quota tracking and enforcement for the hybrid model
**Shippable Outcome:** Quota limits enforced across all tiers

### Epic 1.1: Update Tier Structure for Philippines

#### User Story 1.1.1: Define Philippine Tier Configuration
**As a** product owner
**I want** tier configurations that match the Philippine market pricing
**So that** churches see locally relevant pricing and limits

**Acceptance Criteria:**
- [ ] New tier codes: `mananampalataya` (free), `lingkod`, `katiwala`, `tagapangasiwa`
- [ ] Limits defined: members, transactions, SMS, email, storage, admin users
- [ ] PHP pricing: ₱0, ₱499, ₱1,299, ₱2,999
- [ ] Annual pricing with discount

**Technical Tasks:**
1. Create migration `20260116XXXXXX_add_philippine_tiers.sql`:
   ```sql
   -- Add new tier codes to product_offerings
   -- Insert Philippine product offerings with PHP pricing
   -- Map features to each tier
   ```

2. Update `SubscriptionService.ts` to include new limits:
   ```typescript
   const TIER_LIMITS = {
     mananampalataya: {
       members: 25,
       transactions: 50,
       sms: 25,
       email: 100,
       storage_mb: 500,
       admin_users: 2
     },
     lingkod: {
       members: 100,
       transactions: 300,
       sms: 150,
       email: 1000,
       storage_mb: 5120, // 5GB
       admin_users: 5
     },
     katiwala: {
       members: 500,
       transactions: 2000,
       sms: 750,
       email: 5000,
       storage_mb: 25600, // 25GB
       admin_users: 15
     },
     tagapangasiwa: {
       members: -1, // unlimited
       transactions: -1,
       sms: 2500,
       email: 25000,
       storage_mb: 102400, // 100GB
       admin_users: -1
     },
   };
   ```

**Files to Modify:**
- `supabase/migrations/` - New migration
- `apps/web/src/services/SubscriptionService.ts`
- `apps/web/src/adapters/subscription.adapter.ts`

---

#### User Story 1.1.2: Create Quota Usage Tracking Tables
**As a** system administrator
**I want** to track quota usage per tenant
**So that** I can enforce limits and provide usage visibility

**Acceptance Criteria:**
- [ ] Table tracks: SMS sent, emails sent, storage used, admin user count
- [ ] Monthly reset for SMS/email counters
- [ ] Real-time storage tracking
- [ ] RLS policies for tenant isolation

**Technical Tasks:**
1. Create migration for `tenant_quota_usage` table:
   ```sql
   CREATE TABLE tenant_quota_usage (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     period_start DATE NOT NULL, -- First day of month
     period_end DATE NOT NULL,   -- Last day of month

     -- Monthly quotas (reset each period)
     sms_sent INTEGER DEFAULT 0,
     sms_limit INTEGER NOT NULL,
     emails_sent INTEGER DEFAULT 0,
     email_limit INTEGER NOT NULL,
     transactions_count INTEGER DEFAULT 0,
     transactions_limit INTEGER NOT NULL,

     -- Cumulative quotas (don't reset)
     storage_used_mb DECIMAL(10,2) DEFAULT 0,
     storage_limit_mb INTEGER NOT NULL,

     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now(),

     UNIQUE(tenant_id, period_start)
   );
   ```

2. Create function to initialize monthly quota:
   ```sql
   CREATE OR REPLACE FUNCTION initialize_tenant_quota_period(
     p_tenant_id UUID,
     p_tier TEXT
   ) RETURNS UUID AS $$
   -- Initialize quota for current month based on tier
   $$ LANGUAGE plpgsql;
   ```

**Files to Create:**
- `supabase/migrations/20260116XXXXXX_create_tenant_quota_usage.sql`
- `apps/web/src/models/tenantQuotaUsage.model.ts`
- `apps/web/src/adapters/tenantQuotaUsage.adapter.ts`
- `apps/web/src/repositories/tenantQuotaUsage.repository.ts`

---

### Epic 1.2: Quota Enforcement Service

#### User Story 1.2.1: Create Quota Service
**As a** developer
**I want** a centralized quota service
**So that** all operations can check and update quotas consistently

**Acceptance Criteria:**
- [ ] Check if quota allows operation (SMS, email, member add, transaction)
- [ ] Increment usage counters atomically
- [ ] Return remaining quota
- [ ] Handle tier upgrades (recalculate limits)

**Technical Tasks:**
1. Create `QuotaService.ts`:
   ```typescript
   @injectable()
   export class QuotaService {
     async canSendSms(tenantId: string, count: number = 1): Promise<QuotaCheckResult>;
     async canSendEmail(tenantId: string, count: number = 1): Promise<QuotaCheckResult>;
     async canAddMember(tenantId: string): Promise<QuotaCheckResult>;
     async canAddTransaction(tenantId: string): Promise<QuotaCheckResult>;
     async canAddAdminUser(tenantId: string): Promise<QuotaCheckResult>;
     async canUploadFile(tenantId: string, fileSizeMb: number): Promise<QuotaCheckResult>;

     async incrementSmsUsage(tenantId: string, count: number): Promise<void>;
     async incrementEmailUsage(tenantId: string, count: number): Promise<void>;
     async incrementStorageUsage(tenantId: string, sizeMb: number): Promise<void>;

     async getQuotaStatus(tenantId: string): Promise<QuotaStatus>;
     async getUsageSummary(tenantId: string): Promise<UsageSummary>;
   }

   interface QuotaCheckResult {
     allowed: boolean;
     currentUsage: number;
     limit: number;
     remaining: number;
     message?: string;
   }
   ```

2. Register in DI container

**Files to Create:**
- `apps/web/src/services/QuotaService.ts`
- `apps/web/src/models/quota.model.ts`

**Files to Modify:**
- `apps/web/src/lib/types.ts` - Add TYPES.QuotaService
- `apps/web/src/lib/container.ts` - Bind QuotaService

---

#### User Story 1.2.2: Integrate Quota Checks into Notification Channels
**As a** church administrator
**I want** SMS/email sending to respect my tier limits
**So that** I don't exceed my quota unexpectedly

**Acceptance Criteria:**
- [ ] SMS channel checks quota before sending
- [ ] Email channel checks quota before sending
- [ ] Graceful error when quota exceeded
- [ ] Usage incremented after successful send

**Technical Tasks:**
1. Modify `SmsChannel.ts`:
   ```typescript
   async send(event: NotificationEvent): Promise<DeliveryResult> {
     const quotaCheck = await this.quotaService.canSendSms(event.tenantId);
     if (!quotaCheck.allowed) {
       return {
         success: false,
         error: `SMS quota exceeded. ${quotaCheck.remaining} of ${quotaCheck.limit} remaining.`
       };
     }

     // ... existing send logic ...

     await this.quotaService.incrementSmsUsage(event.tenantId, 1);
     return { success: true };
   }
   ```

2. Modify `EmailChannel.ts` similarly

**Files to Modify:**
- `apps/web/src/services/notification/channels/SmsChannel.ts`
- `apps/web/src/services/notification/channels/EmailChannel.ts`

---

#### User Story 1.2.3: Integrate Quota Checks into Member Operations
**As a** church administrator
**I want** member creation to respect my tier limits
**So that** I know when I need to upgrade

**Acceptance Criteria:**
- [ ] Member creation blocked when limit reached
- [ ] Clear error message with upgrade prompt
- [ ] Soft limit warning at 80% and 90%

**Technical Tasks:**
1. Create quota middleware for member operations
2. Integrate into `MemberService.ts` create method

**Files to Modify:**
- `apps/web/src/services/MemberService.ts`

---

### Epic 1.3: Quota Status API & UI Components

#### User Story 1.3.1: Create Quota Status API
**As a** frontend developer
**I want** an API to retrieve quota status
**So that** I can display usage information to users

**Acceptance Criteria:**
- [ ] GET endpoint returns all quota metrics
- [ ] Includes percentage used
- [ ] Includes upgrade recommendations

**Technical Tasks:**
1. Create API route `/api/subscription/quota`:
   ```typescript
   // GET /api/subscription/quota
   export async function GET(request: NextRequest) {
     const quotaService = container.get<QuotaService>(TYPES.QuotaService);
     const status = await quotaService.getQuotaStatus();
     return NextResponse.json(status);
   }
   ```

**Files to Create:**
- `apps/web/src/app/api/subscription/quota/route.ts`

---

#### User Story 1.3.2: Create Quota Usage Display Component
**As a** church administrator
**I want** to see my current quota usage
**So that** I can monitor my consumption

**Acceptance Criteria:**
- [ ] Shows usage bars for each quota type
- [ ] Color coding: green (<70%), yellow (70-90%), red (>90%)
- [ ] Shows remaining counts
- [ ] Upgrade CTA when approaching limits

**Technical Tasks:**
1. Create `QuotaUsageCard.tsx` component
2. Create `useQuotaStatus` hook

**Files to Create:**
- `apps/web/src/components/admin/subscription/QuotaUsageCard.tsx`
- `apps/web/src/hooks/useQuotaStatus.ts`

---

### Phase 1 Deliverables Summary

| Deliverable | Type | Status |
|-------------|------|--------|
| Philippine tier configuration | Migration | To Build |
| `tenant_quota_usage` table | Migration | To Build |
| `QuotaService.ts` | Service | To Build |
| SMS/Email quota integration | Enhancement | To Build |
| Member quota enforcement | Enhancement | To Build |
| Quota status API | API | To Build |
| Quota usage UI component | Component | To Build |

---

## Phase 2: Billing & Subscription Management UI

**Duration:** 2-3 weeks
**Goal:** Complete billing dashboard for subscription management
**Shippable Outcome:** Churches can view/manage their subscription

### Epic 2.1: Billing Dashboard

#### User Story 2.1.1: Create Subscription Overview Page
**As a** church administrator
**I want** to see my current subscription status
**So that** I understand my plan and usage

**Acceptance Criteria:**
- [ ] Shows current tier name and price
- [ ] Shows billing cycle and next payment date
- [ ] Shows payment method on file
- [ ] Shows quota usage summary
- [ ] Shows recent payment history

**Technical Tasks:**
1. Create billing dashboard page at `/admin/settings/billing`
2. Create metadata XML blueprint
3. Create service handlers

**Files to Create:**
- `apps/web/src/app/admin/settings/billing/page.tsx`
- `apps/web/metadata/authoring/blueprints/admin-settings/billing.xml`
- `apps/web/src/lib/metadata/services/admin-settings-billing.ts`
- `apps/web/src/components/admin/billing/SubscriptionOverview.tsx`
- `apps/web/src/components/admin/billing/PaymentHistory.tsx`
- `apps/web/src/components/admin/billing/PaymentMethodCard.tsx`

---

#### User Story 2.1.2: Create Plan Comparison View
**As a** church administrator
**I want** to compare available plans
**So that** I can choose the right tier for my church

**Acceptance Criteria:**
- [ ] Shows all tiers side by side
- [ ] Highlights current tier
- [ ] Shows feature differences
- [ ] Shows quota differences
- [ ] Shows pricing (monthly and annual)

**Technical Tasks:**
1. Create `PlanComparisonTable.tsx` component
2. Use existing `LicensingService.getPublicProductOfferings()`

**Files to Create:**
- `apps/web/src/components/admin/billing/PlanComparisonTable.tsx`

---

#### User Story 2.1.3: Create Upgrade/Downgrade Flow
**As a** church administrator
**I want** to upgrade or downgrade my plan
**So that** I can adjust my subscription as my church grows

**Acceptance Criteria:**
- [ ] Shows prorated pricing for mid-cycle changes
- [ ] Confirms feature changes (what's added/removed)
- [ ] Integrates with Xendit for payment
- [ ] Sends confirmation email

**Technical Tasks:**
1. Create upgrade modal component
2. Use existing `PaymentSubscriptionService.changeSubscriptionPlan()`
3. Create confirmation flow

**Files to Create:**
- `apps/web/src/components/admin/billing/UpgradeModal.tsx`
- `apps/web/src/components/admin/billing/FeatureChangePreview.tsx`

**Files to Modify:**
- Use existing `apps/web/src/services/PaymentSubscriptionService.ts`

---

### Epic 2.2: Invoice Management

#### User Story 2.2.1: Create Invoice List View
**As a** church administrator
**I want** to view my invoice history
**So that** I can track my payments and download receipts

**Acceptance Criteria:**
- [ ] Shows list of all invoices
- [ ] Shows status (paid, pending, failed)
- [ ] Download invoice PDF link
- [ ] Filter by date range

**Technical Tasks:**
1. Create invoice list component
2. Use existing `PaymentService.getTenantPayments()`

**Files to Create:**
- `apps/web/src/components/admin/billing/InvoiceList.tsx`

---

#### User Story 2.2.2: Retry Failed Payment
**As a** church administrator
**I want** to retry a failed payment
**So that** I can restore my subscription

**Acceptance Criteria:**
- [ ] Shows retry button for failed payments
- [ ] Redirects to Xendit payment page
- [ ] Updates status after payment

**Technical Tasks:**
1. Create retry payment button
2. Use existing `PaymentService.retryFailedPayment()`

**Files to Modify:**
- `apps/web/src/components/admin/billing/InvoiceList.tsx`

---

### Epic 2.3: Add-On Purchase Flow

#### User Story 2.3.1: Create Add-On Purchase UI
**As a** church administrator
**I want** to purchase additional SMS/email credits
**So that** I can continue communicating without upgrading tiers

**Acceptance Criteria:**
- [ ] Shows available add-on packages
- [ ] Shows current balance
- [ ] One-click purchase flow
- [ ] Credits added immediately after payment

**Technical Tasks:**
1. Create migration for `addon_purchases` table
2. Create `AddOnService.ts`
3. Create add-on purchase UI

**Files to Create:**
- `supabase/migrations/20260116XXXXXX_create_addon_purchases.sql`
- `apps/web/src/services/AddOnService.ts`
- `apps/web/src/components/admin/billing/AddOnPurchase.tsx`

---

### Phase 2 Deliverables Summary

| Deliverable | Type | Status |
|-------------|------|--------|
| Billing dashboard page | Page | To Build |
| Subscription overview component | Component | To Build |
| Payment history component | Component | To Build |
| Plan comparison table | Component | To Build |
| Upgrade/downgrade flow | Feature | To Build |
| Invoice list view | Component | To Build |
| Retry payment flow | Feature | To Build |
| Add-on purchase system | Feature | To Build |

---

## Phase 3: Online Giving Platform

**Duration:** 3-4 weeks
**Goal:** Enable members to give through the app with funds disbursed to churches
**Shippable Outcome:** Complete giving flow from member to church bank account

### Epic 3.1: Xendit Disbursement Integration

#### User Story 3.1.1: Create Church Bank Account Management
**As a** church administrator
**I want** to register my church's bank account
**So that** donations can be disbursed to us

**Acceptance Criteria:**
- [ ] Add bank account with validation
- [ ] Support major Philippine banks (BDO, BPI, Metrobank, etc.)
- [ ] Support e-wallets (GCash, PayMaya)
- [ ] Verify account ownership
- [ ] Set as default disbursement account

**Technical Tasks:**
1. Create migration for `church_bank_accounts` table:
   ```sql
   CREATE TABLE church_bank_accounts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'ewallet')),
     bank_code TEXT, -- For banks (BDO, BPI, etc.)
     ewallet_type TEXT, -- For e-wallets (GCASH, PAYMAYA)
     account_name TEXT NOT NULL,
     account_number TEXT NOT NULL,
     is_verified BOOLEAN DEFAULT false,
     is_default BOOLEAN DEFAULT false,
     verification_status TEXT DEFAULT 'pending',
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Create `ChurchBankAccountService.ts`
3. Create bank account management UI

**Files to Create:**
- `supabase/migrations/20260116XXXXXX_create_church_bank_accounts.sql`
- `apps/web/src/services/ChurchBankAccountService.ts`
- `apps/web/src/components/admin/giving/BankAccountManagement.tsx`

---

#### User Story 3.1.2: Create Disbursement Service
**As a** system
**I want** to disburse collected donations to church bank accounts
**So that** churches receive their funds automatically

**Acceptance Criteria:**
- [ ] Schedule disbursements based on tier (monthly/bi-weekly/weekly/daily)
- [ ] Calculate total donations to disburse
- [ ] Deduct platform fees if applicable
- [ ] Call Xendit disbursement API
- [ ] Track disbursement status
- [ ] Send disbursement notification to church

**Technical Tasks:**
1. Create migration for `disbursements` table:
   ```sql
   CREATE TABLE disbursements (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     bank_account_id UUID NOT NULL REFERENCES church_bank_accounts(id),
     period_start DATE NOT NULL,
     period_end DATE NOT NULL,
     gross_amount DECIMAL(12,2) NOT NULL,
     platform_fee DECIMAL(12,2) DEFAULT 0,
     net_amount DECIMAL(12,2) NOT NULL,
     xendit_disbursement_id TEXT,
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
     disbursed_at TIMESTAMPTZ,
     failure_reason TEXT,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Create `DisbursementService.ts`:
   ```typescript
   @injectable()
   export class DisbursementService {
     async calculateDisbursement(tenantId: string, periodEnd: Date): Promise<DisbursementPreview>;
     async createDisbursement(tenantId: string): Promise<Disbursement>;
     async processDisbursement(disbursementId: string): Promise<void>;
     async getDisbursementHistory(tenantId: string): Promise<Disbursement[]>;
   }
   ```

3. Extend `XenditService.ts` with disbursement methods:
   ```typescript
   async createDisbursement(params: {
     externalId: string;
     amount: number;
     bankCode: string;
     accountNumber: string;
     accountName: string;
     description: string;
   }): Promise<XenditDisbursementResponse>;

   async getDisbursementStatus(disbursementId: string): Promise<XenditDisbursementStatus>;
   ```

**Files to Create:**
- `supabase/migrations/20260116XXXXXX_create_disbursements.sql`
- `apps/web/src/services/DisbursementService.ts`

**Files to Modify:**
- `apps/web/src/services/XenditService.ts` - Add disbursement methods

---

#### User Story 3.1.3: Create Disbursement Webhook Handler
**As a** system
**I want** to receive disbursement status updates from Xendit
**So that** I can update disbursement records accurately

**Acceptance Criteria:**
- [ ] Handle DISBURSEMENT_COMPLETED webhook
- [ ] Handle DISBURSEMENT_FAILED webhook
- [ ] Update disbursement status
- [ ] Notify church of completion/failure

**Technical Tasks:**
1. Extend webhook handler at `/api/webhooks/xendit/route.ts`
2. Add disbursement event processing

**Files to Modify:**
- `apps/web/src/app/api/webhooks/xendit/route.ts`

---

### Epic 3.2: Member Giving Flow

#### User Story 3.2.1: Create Member Giving Page
**As a** church member
**I want** to give a donation through the app
**So that** I can contribute to my church conveniently

**Acceptance Criteria:**
- [ ] Select fund/designation (Tithes, Offering, Missions, etc.)
- [ ] Enter amount
- [ ] Select payment method (GCash, PayMaya, Card, Bank Transfer)
- [ ] Add optional note
- [ ] Confirm and pay via Xendit

**Technical Tasks:**
1. Create giving page at `/give` or `/member/give`
2. Create `MemberGivingService.ts`:
   ```typescript
   @injectable()
   export class MemberGivingService {
     async createDonation(params: {
       memberId: string;
       tenantId: string;
       fundId: string;
       amount: number;
       paymentMethod: string;
       note?: string;
     }): Promise<DonationWithPayment>;

     async getGivingHistory(memberId: string): Promise<Donation[]>;
     async getGivingStatement(memberId: string, year: number): Promise<GivingStatement>;
   }
   ```

3. Create Xendit invoice for donation

**Files to Create:**
- `apps/web/src/app/(member)/give/page.tsx`
- `apps/web/src/services/MemberGivingService.ts`
- `apps/web/src/components/giving/GivingForm.tsx`
- `apps/web/src/components/giving/PaymentMethodSelector.tsx`
- `apps/web/src/components/giving/FundSelector.tsx`

---

#### User Story 3.2.2: Create Donation Webhook Handler
**As a** system
**I want** to process donation payments when completed
**So that** donations are recorded accurately

**Acceptance Criteria:**
- [ ] Handle donation payment completed webhook
- [ ] Create financial transaction record
- [ ] Update member giving profile
- [ ] Send donation receipt email
- [ ] Queue for disbursement

**Technical Tasks:**
1. Create migration for `member_donations` table:
   ```sql
   CREATE TABLE member_donations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     member_id UUID REFERENCES members(id),
     fund_id UUID REFERENCES funds(id),
     amount DECIMAL(12,2) NOT NULL,
     payment_method TEXT NOT NULL,
     xendit_invoice_id TEXT,
     xendit_payment_id TEXT,
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
     paid_at TIMESTAMPTZ,
     note TEXT,
     receipt_number TEXT,
     disbursement_id UUID REFERENCES disbursements(id),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Extend webhook handler for donation payments
3. Create donation receipt email template

**Files to Create:**
- `supabase/migrations/20260116XXXXXX_create_member_donations.sql`
- `apps/web/src/emails/templates/donation/DonationReceipt.tsx`

**Files to Modify:**
- `apps/web/src/app/api/webhooks/xendit/route.ts`

---

#### User Story 3.2.3: Create Giving History for Members
**As a** church member
**I want** to view my giving history
**So that** I can track my contributions

**Acceptance Criteria:**
- [ ] List all donations with date, amount, fund
- [ ] Filter by date range
- [ ] Download annual giving statement (PDF)
- [ ] Show pending/completed status

**Technical Tasks:**
1. Create giving history page
2. Create giving statement PDF generator

**Files to Create:**
- `apps/web/src/app/(member)/giving-history/page.tsx`
- `apps/web/src/components/giving/GivingHistoryList.tsx`
- `apps/web/src/services/GivingStatementService.ts`

---

### Epic 3.3: Church Giving Dashboard

#### User Story 3.3.1: Create Giving Dashboard for Admins
**As a** church administrator
**I want** to view giving analytics
**So that** I can understand our church's giving patterns

**Acceptance Criteria:**
- [ ] Total giving this month/year
- [ ] Giving by fund breakdown
- [ ] Top givers (anonymized option)
- [ ] Giving trends chart
- [ ] Pending disbursement amount

**Technical Tasks:**
1. Create giving dashboard page
2. Create analytics service handlers

**Files to Create:**
- `apps/web/src/app/admin/finance/giving/page.tsx`
- `apps/web/metadata/authoring/blueprints/admin-finance/giving-dashboard.xml`
- `apps/web/src/components/admin/giving/GivingAnalytics.tsx`

---

#### User Story 3.3.2: Create Disbursement History View
**As a** church administrator
**I want** to view disbursement history
**So that** I can track funds received

**Acceptance Criteria:**
- [ ] List all disbursements
- [ ] Show status (pending, completed, failed)
- [ ] Show breakdown of donations in each disbursement
- [ ] Download disbursement report

**Files to Create:**
- `apps/web/src/components/admin/giving/DisbursementHistory.tsx`

---

### Phase 3 Deliverables Summary

| Deliverable | Type | Status |
|-------------|------|--------|
| Church bank account management | Feature | To Build |
| Xendit disbursement integration | Service | To Build |
| Disbursement scheduling | Feature | To Build |
| Member giving page | Page | To Build |
| Payment method selector (GCash/PayMaya/Card) | Component | To Build |
| Donation webhook processing | Enhancement | To Build |
| Donation receipt emails | Template | To Build |
| Member giving history | Page | To Build |
| Giving statement generator | Service | To Build |
| Admin giving dashboard | Page | To Build |
| Disbursement history | Component | To Build |

---

## Phase 4: Localization & Recurring Giving

**Duration:** 2-3 weeks
**Goal:** Filipino language support and recurring donation capability
**Shippable Outcome:** App usable in Filipino with recurring giving enabled

### Epic 4.1: Filipino Localization

#### User Story 4.1.1: Implement i18n Infrastructure
**As a** developer
**I want** internationalization infrastructure
**So that** I can support multiple languages

**Acceptance Criteria:**
- [ ] next-intl or similar i18n library integrated
- [ ] Language detection from browser
- [ ] Language switcher component
- [ ] Translation files structure

**Technical Tasks:**
1. Install and configure `next-intl`
2. Create translation file structure:
   ```
   apps/web/src/locales/
   ├── en/
   │   ├── common.json
   │   ├── giving.json
   │   ├── billing.json
   │   └── ...
   └── fil/ (Filipino)
       ├── common.json
       ├── giving.json
       ├── billing.json
       └── ...
   ```

**Files to Create:**
- `apps/web/src/locales/en/*.json`
- `apps/web/src/locales/fil/*.json`
- `apps/web/src/components/common/LanguageSwitcher.tsx`

**Files to Modify:**
- `apps/web/next.config.ts` - Add i18n config

---

#### User Story 4.1.2: Translate Core UI to Filipino
**As a** Filipino church administrator
**I want** the app interface in Filipino
**So that** I can use it more comfortably

**Acceptance Criteria:**
- [ ] Navigation and menu items translated
- [ ] Form labels and buttons translated
- [ ] Error messages translated
- [ ] Tier names in Filipino (Mananampalataya, Lingkod, etc.)

**Technical Tasks:**
1. Create Filipino translation files
2. Update components to use translation keys

---

### Epic 4.2: Recurring Giving

#### User Story 4.2.1: Create Recurring Giving Setup
**As a** church member
**I want** to set up recurring donations
**So that** I can automate my giving

**Acceptance Criteria:**
- [ ] Select frequency (weekly, bi-weekly, monthly)
- [ ] Select amount and fund
- [ ] Select payment method
- [ ] Set start date
- [ ] View/cancel recurring giving

**Technical Tasks:**
1. Create migration for `recurring_donations` table:
   ```sql
   CREATE TABLE recurring_donations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     member_id UUID NOT NULL REFERENCES members(id),
     fund_id UUID REFERENCES funds(id),
     amount DECIMAL(12,2) NOT NULL,
     frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
     payment_method_id UUID REFERENCES payment_methods(id),
     next_charge_date DATE NOT NULL,
     status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Create `RecurringDonationService.ts`
3. Create recurring donation UI

**Files to Create:**
- `supabase/migrations/20260116XXXXXX_create_recurring_donations.sql`
- `apps/web/src/services/RecurringDonationService.ts`
- `apps/web/src/components/giving/RecurringGivingSetup.tsx`
- `apps/web/src/components/giving/RecurringGivingManagement.tsx`

---

#### User Story 4.2.2: Create Recurring Donation Processor
**As a** system
**I want** to process recurring donations automatically
**So that** members' recurring gifts are collected on schedule

**Acceptance Criteria:**
- [ ] Cron job runs daily
- [ ] Processes donations due today
- [ ] Creates Xendit invoice for each
- [ ] Handles failures gracefully
- [ ] Sends reminder before charge

**Technical Tasks:**
1. Create scheduled function/cron for recurring processing
2. Create reminder email template

**Files to Create:**
- `apps/web/src/services/RecurringDonationProcessor.ts`
- `apps/web/src/emails/templates/donation/RecurringReminder.tsx`

---

### Phase 4 Deliverables Summary

| Deliverable | Type | Status |
|-------------|------|--------|
| i18n infrastructure | Enhancement | To Build |
| Filipino translations | Content | To Build |
| Language switcher | Component | To Build |
| Recurring donations table | Migration | To Build |
| Recurring donation setup UI | Component | To Build |
| Recurring donation processor | Service | To Build |
| Recurring reminder emails | Template | To Build |

---

## Phase 5: Analytics & Optimization

**Duration:** 2 weeks
**Goal:** Advanced analytics and performance optimization
**Shippable Outcome:** Comprehensive dashboards and optimized performance

### Epic 5.1: Giving Analytics

#### User Story 5.1.1: Create Giving Trends Dashboard
**As a** church administrator
**I want** to analyze giving trends
**So that** I can make informed decisions

**Acceptance Criteria:**
- [ ] Year-over-year comparison
- [ ] Giving by day of week
- [ ] Average gift size trends
- [ ] Donor retention metrics

---

#### User Story 5.1.2: Create Fund Performance Analytics
**As a** church administrator
**I want** to see performance by fund
**So that** I can understand where donations are directed

**Acceptance Criteria:**
- [ ] Giving per fund over time
- [ ] Fund goal progress (if goals set)
- [ ] Comparison to previous periods

---

### Epic 5.2: System Optimization

#### User Story 5.2.1: Optimize Database Queries
**As a** developer
**I want** optimized database queries
**So that** the app performs well at scale

**Acceptance Criteria:**
- [ ] Add indexes for common queries
- [ ] Optimize quota check queries
- [ ] Create materialized views for analytics

---

### Phase 5 Deliverables Summary

| Deliverable | Type | Status |
|-------------|------|--------|
| Giving trends dashboard | Page | To Build |
| Fund performance analytics | Feature | To Build |
| Database optimization | Enhancement | To Build |

---

## Implementation Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1** | 2-3 weeks | Quota infrastructure, tier configuration, enforcement |
| **Phase 2** | 2-3 weeks | Billing dashboard, invoice management, add-ons |
| **Phase 3** | 3-4 weeks | Online giving, disbursements, member giving flow |
| **Phase 4** | 2-3 weeks | Filipino localization, recurring giving |
| **Phase 5** | 2 weeks | Analytics, optimization |

**Total Estimated Duration:** 11-15 weeks

---

## Technical Dependencies

### External Services Required
- **Xendit Account** - With disbursement API enabled
- **Twilio Account** - For SMS (already integrated)
- **Resend Account** - For email (already integrated)

### Environment Variables to Add
```env
# Existing (already configured)
XENDIT_SECRET_KEY=...
XENDIT_WEBHOOK_VERIFICATION_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
RESEND_API_KEY=...

# New for disbursements
XENDIT_DISBURSEMENT_CALLBACK_URL=...
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Xendit disbursement API complexity | Start with pooled account model; add sub-accounts later |
| Quota enforcement edge cases | Implement soft limits first; hard enforcement in Phase 2 |
| i18n complexity | Start with key UI elements; expand coverage iteratively |
| Recurring donation failures | Implement retry logic and failure notifications |

---

## Success Metrics

| Metric | Target | Phase |
|--------|--------|-------|
| Quota enforcement accuracy | 100% | Phase 1 |
| Payment success rate | >95% | Phase 2 |
| Disbursement success rate | >99% | Phase 3 |
| Average giving session time | <3 min | Phase 3 |
| Filipino translation coverage | >80% | Phase 4 |

---

## Appendix: File Structure Overview

```
apps/web/src/
├── services/
│   ├── QuotaService.ts                    # Phase 1
│   ├── AddOnService.ts                    # Phase 2
│   ├── ChurchBankAccountService.ts        # Phase 3
│   ├── DisbursementService.ts             # Phase 3
│   ├── MemberGivingService.ts             # Phase 3
│   ├── GivingStatementService.ts          # Phase 3
│   ├── RecurringDonationService.ts        # Phase 4
│   └── RecurringDonationProcessor.ts      # Phase 4
├── components/
│   └── admin/
│       ├── subscription/
│       │   └── QuotaUsageCard.tsx         # Phase 1
│       ├── billing/
│       │   ├── SubscriptionOverview.tsx   # Phase 2
│       │   ├── PaymentHistory.tsx         # Phase 2
│       │   ├── PlanComparisonTable.tsx    # Phase 2
│       │   ├── UpgradeModal.tsx           # Phase 2
│       │   ├── InvoiceList.tsx            # Phase 2
│       │   └── AddOnPurchase.tsx          # Phase 2
│       └── giving/
│           ├── BankAccountManagement.tsx  # Phase 3
│           ├── GivingAnalytics.tsx        # Phase 3
│           └── DisbursementHistory.tsx    # Phase 3
├── app/
│   ├── admin/
│   │   └── settings/
│   │       └── billing/
│   │           └── page.tsx               # Phase 2
│   └── (member)/
│       ├── give/
│       │   └── page.tsx                   # Phase 3
│       └── giving-history/
│           └── page.tsx                   # Phase 3
└── locales/
    ├── en/                                # Phase 4
    └── fil/                               # Phase 4

supabase/migrations/
├── 20260116XXXXXX_add_philippine_tiers.sql           # Phase 1
├── 20260116XXXXXX_create_tenant_quota_usage.sql      # Phase 1
├── 20260116XXXXXX_create_addon_purchases.sql         # Phase 2
├── 20260116XXXXXX_create_church_bank_accounts.sql    # Phase 3
├── 20260116XXXXXX_create_disbursements.sql           # Phase 3
├── 20260116XXXXXX_create_member_donations.sql        # Phase 3
└── 20260116XXXXXX_create_recurring_donations.sql     # Phase 4
```

---

*Document prepared based on StewardTrack codebase analysis*
*Last updated: January 2026*
