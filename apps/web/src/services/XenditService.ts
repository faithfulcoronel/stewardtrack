import { injectable } from 'inversify';
import 'reflect-metadata';
import {
  CURRENCY_INFO,
  getCurrencyInfo,
  isXenditSupported,
  PRIMARY_CURRENCY,
  toXenditAmount,
} from '@/enums/currency.enums';

/**
 * Xendit API Service
 *
 * Wrapper service for Xendit payment gateway integration.
 * Handles invoice creation, payment methods, and API communication.
 * Supports multi-currency payments across Southeast Asia and globally.
 *
 * Supported currencies:
 * - PHP (Philippines) - Primary market
 * - IDR (Indonesia)
 * - USD, EUR, GBP, AUD, CAD, JPY (via Global Account)
 *
 * Documentation: https://developers.xendit.co/api-reference/
 */

// Xendit Invoice Types
export interface XenditInvoiceItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface XenditCustomer {
  given_names?: string;
  surname?: string;
  email?: string;
  mobile_number?: string;
  addresses?: Array<{
    city?: string;
    country?: string;
    postal_code?: string;
    state?: string;
    street_line1?: string;
    street_line2?: string;
  }>;
}

export interface XenditFee {
  type: string;
  value: number;
}

export interface CreateInvoiceParams {
  external_id: string;
  amount: number;
  payer_email: string;
  description: string;
  invoice_duration?: number; // in seconds, default 24 hours
  customer?: XenditCustomer;
  customer_notification_preference?: {
    invoice_created?: string[];
    invoice_reminder?: string[];
    invoice_paid?: string[];
    invoice_expired?: string[];
  };
  success_redirect_url?: string;
  failure_redirect_url?: string;
  currency?: string;
  items?: XenditInvoiceItem[];
  fees?: XenditFee[];
  should_send_email?: boolean;
  metadata?: Record<string, any>;
}

export interface XenditInvoice {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED';
  merchant_name: string;
  merchant_profile_picture_url: string;
  amount: number;
  payer_email: string;
  description: string;
  invoice_url: string;
  expiry_date: string;
  available_banks: Array<{
    bank_code: string;
    collection_type: string;
    transfer_amount: number;
    bank_branch: string;
    account_holder_name: string;
    identity_amount: number;
  }>;
  available_retail_outlets: Array<{
    retail_outlet_name: string;
    payment_code: string;
    transfer_amount: number;
  }>;
  available_ewallets: Array<{
    ewallet_type: string;
  }>;
  available_qr_codes: Array<{
    qr_code_type: string;
  }>;
  available_direct_debits: Array<{
    direct_debit_type: string;
  }>;
  available_paylaters: Array<{
    paylater_type: string;
  }>;
  should_exclude_credit_card: boolean;
  should_send_email: boolean;
  created: string;
  updated: string;
  currency: string;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  payment_destination?: string;
  metadata?: Record<string, any>;
}

export interface XenditWebhookEvent {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED';
  amount: number;
  payer_email: string;
  description: string;
  paid_amount?: number;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  payment_destination?: string;
  bank_code?: string;
  retail_outlet_name?: string;
  ewallet_type?: string;
  created: string;
  updated: string;
  currency: string;
  metadata?: Record<string, any>;
}

export interface XenditErrorResponse {
  error_code: string;
  message: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

// ============================================================================
// PAYMENTS API V3 TYPES (for Donations)
// ============================================================================

/**
 * Xendit Customer (Payments API)
 */
export interface XenditCustomerFull {
  id: string;
  reference_id: string;
  type: 'INDIVIDUAL' | 'BUSINESS';
  email: string | null;
  given_names: string | null;
  surname: string | null;
  mobile_number: string | null;
  phone_number: string | null;
  created: string;
  updated: string;
}

export interface CreateCustomerParams {
  reference_id: string;
  type?: 'INDIVIDUAL' | 'BUSINESS';
  email?: string;
  given_names?: string;
  surname?: string;
  mobile_number?: string;
  phone_number?: string;
}

/**
 * Payment Request (Payments API v3)
 */
export type PaymentMethodType = 'CARD' | 'EWALLET' | 'DIRECT_DEBIT' | 'VIRTUAL_ACCOUNT' | 'QR_CODE' | 'OVER_THE_COUNTER';
export type CaptureMethod = 'AUTOMATIC' | 'MANUAL';
export type PaymentReusability = 'ONE_TIME_USE' | 'MULTIPLE_USE';

export interface CreatePaymentRequestParams {
  reference_id: string;
  customer_id?: string;
  amount: number;
  currency: string;
  capture_method?: CaptureMethod;
  payment_method: {
    type: PaymentMethodType;
    reusability: PaymentReusability;
    card?: {
      channel_properties?: {
        success_return_url?: string;
        failure_return_url?: string;
      };
    };
    ewallet?: {
      channel_code: string; // GCASH, PAYMAYA, GRABPAY, etc.
      channel_properties?: {
        success_return_url?: string;
        failure_return_url?: string;
        mobile_number?: string;
      };
    };
    direct_debit?: {
      channel_code: string; // BPI, BDO, UNIONBANK, etc.
      channel_properties?: {
        success_return_url?: string;
        failure_return_url?: string;
        mobile_number?: string;
      };
    };
    virtual_account?: {
      channel_code: string;
      channel_properties?: {
        customer_name?: string;
        expires_at?: string;
      };
    };
    qr_code?: {
      channel_code: string; // QRPH
    };
    over_the_counter?: {
      channel_code: string; // 7ELEVEN, etc.
      channel_properties?: {
        customer_name?: string;
        payment_code?: string;
        expires_at?: string;
      };
    };
  };
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface XenditPaymentRequest {
  id: string;
  reference_id: string;
  business_id: string;
  customer_id: string | null;
  amount: number;
  currency: string;
  status: 'REQUIRES_ACTION' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'AWAITING_CAPTURE';
  capture_method: CaptureMethod;
  payment_method: {
    id: string;
    type: PaymentMethodType;
    reusability: PaymentReusability;
    status: string;
    card?: {
      masked_card_number: string;
      cardholder_name: string | null;
      expiry_month: string;
      expiry_year: string;
    };
    ewallet?: {
      channel_code: string;
      account_mobile_number: string | null;
    };
    direct_debit?: {
      channel_code: string;
      masked_bank_account_number: string | null;
    };
  };
  description: string | null;
  metadata: Record<string, unknown> | null;
  actions?: Array<{
    action: 'AUTH' | 'RESEND_AUTH' | 'CAPTURE';
    url?: string;
    url_type?: 'WEB' | 'MOBILE' | 'DEEPLINK';
    method?: 'GET' | 'POST';
  }>;
  created: string;
  updated: string;
  expires_at: string | null;
}

/**
 * Payment Token (for saved payment methods)
 */
export interface XenditPaymentToken {
  id: string;
  type: PaymentMethodType;
  reusability: PaymentReusability;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'EXPIRED' | 'FAILED';
  customer_id: string | null;
  card?: {
    masked_card_number: string;
    cardholder_name: string | null;
    expiry_month: string;
    expiry_year: string;
  };
  ewallet?: {
    channel_code: string;
    account_mobile_number: string | null;
  };
  direct_debit?: {
    channel_code: string;
    masked_bank_account_number: string | null;
  };
  created: string;
  updated: string;
}

/**
 * Linked Account Token (for Direct Debit)
 */
export interface XenditLinkedAccountInit {
  id: string;
  customer_id: string;
  channel_code: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  authorizer_url: string | null;
  created: string;
}

/**
 * Refund
 */
export interface CreateRefundParams {
  payment_request_id?: string;
  invoice_id?: string;
  reference_id: string;
  amount?: number; // If not provided, full refund
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface XenditRefund {
  id: string;
  payment_request_id: string | null;
  invoice_id: string | null;
  reference_id: string;
  amount: number;
  currency: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  reason: string;
  failure_code: string | null;
  created: string;
  updated: string;
}

// ============================================================================
// PAYOUT/DISBURSEMENT TYPES
// ============================================================================

/**
 * Payout channel type
 * Xendit supports various payout channels depending on the country
 */
export type PayoutChannelType = 'BANK' | 'EWALLET' | 'OTC';

/**
 * Create payout parameters
 * Bank account details are managed in Xendit Dashboard
 */
export interface CreatePayoutParams {
  externalId: string;
  amount: number;
  channelCode: string; // Xendit payout channel code (set up in Xendit Dashboard)
  channelProperties?: Record<string, unknown>;
  currency?: string;
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Xendit payout response
 */
export interface XenditPayout {
  id: string;
  external_id: string;
  amount: number;
  channel_code: string;
  currency: string;
  description: string | null;
  reference_id: string | null;
  status: 'ACCEPTED' | 'PENDING' | 'LOCKED' | 'CANCELLED' | 'REVERSED' | 'SUCCEEDED' | 'FAILED';
  failure_code: string | null;
  estimated_arrival_time: string | null;
  created: string;
  updated: string;
  business_id: string;
}

@injectable()
export class XenditService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly webhookVerificationToken: string;

  constructor() {
    this.apiKey = process.env.XENDIT_SECRET_KEY || '';
    this.webhookVerificationToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || '';

    console.log('[XenditService] Initialized with API Key:', this.apiKey ? '****' + this.apiKey.slice(-4) : 'Not Set');

    // Use test mode URL if test key, production URL otherwise
    this.baseUrl = this.apiKey.startsWith('xnd_development')
      ? 'https://api.xendit.co'
      : 'https://api.xendit.co';

    if (!this.apiKey) {
      console.warn('[XenditService] XENDIT_SECRET_KEY not configured');
    }
  }

  /**
   * Check if Xendit is properly configured
   */
  public isConfigured(): boolean {
    return !!this.apiKey && !!this.webhookVerificationToken;
  }

  /**
   * Get authorization header for Xendit API requests
   */
  private getAuthHeader(): string {
    return `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`;
  }

  /**
   * Make a request to Xendit API
   *
   * @param endpoint API endpoint
   * @param options Fetch options
   * @param forUserId Optional sub-account ID for XenPlatform transactions
   * @param withSplitRule Optional split rule ID for automatic platform fee collection
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    forUserId?: string,
    withSplitRule?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Build headers with optional for-user-id for XenPlatform sub-accounts
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add for-user-id header for sub-account transactions
    if (forUserId) {
      headers['for-user-id'] = forUserId;
    }

    // Add with-split-rule header for automatic platform fee collection
    // When set, Xendit automatically splits the payment according to the rule
    // and sends the platform fee to the platform (StewardTrack) balance
    if (withSplitRule) {
      headers['with-split-rule'] = withSplitRule;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      console.error(`[XenditService] Network error on ${endpoint}:`, networkError);
      throw new Error(`Xendit API Network Error: Unable to connect to payment service. Please try again.`);
    }

    // Handle non-JSON responses (e.g., "Service Unavailable", HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textBody = await response.text();
      console.error(`[XenditService] Non-JSON response on ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        contentType,
        body: textBody.substring(0, 500), // Limit log size
      });

      if (response.status === 503 || textBody.includes('Service Unavailable')) {
        throw new Error('Xendit payment service is temporarily unavailable. Please try again in a few moments.');
      }
      if (response.status === 502 || response.status === 504) {
        throw new Error('Xendit payment service is experiencing connectivity issues. Please try again.');
      }
      if (response.status === 429) {
        throw new Error('Too many requests to payment service. Please wait a moment and try again.');
      }
      throw new Error(`Xendit API Error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error(`[XenditService] JSON parse error on ${endpoint}:`, parseError);
      throw new Error('Xendit API Error: Invalid response from payment service. Please try again.');
    }

    if (!response.ok) {
      const error = data as XenditErrorResponse;
      // Log full error details for debugging
      console.error(`[XenditService] API Error on ${endpoint}:`, JSON.stringify(error, null, 2));
      if (options.body) {
        console.error(`[XenditService] Request body:`, options.body);
      }
      const errorDetails = error.errors ? ` Details: ${JSON.stringify(error.errors)}` : '';
      throw new Error(`Xendit API Error: ${error.error_code} - ${error.message}${errorDetails}`);
    }

    return data as T;
  }

  /**
   * Create a new invoice
   *
   * @param params Invoice creation parameters
   * @returns Created invoice object
   */
  async createInvoice(params: CreateInvoiceParams): Promise<XenditInvoice> {
    const invoiceData = {
      external_id: params.external_id,
      amount: params.amount,
      payer_email: params.payer_email,
      description: params.description,
      invoice_duration: params.invoice_duration || 86400, // 24 hours default
      currency: params.currency || 'PHP',
      should_send_email: params.should_send_email !== undefined ? params.should_send_email : true,
      ...(params.customer && { customer: params.customer }),
      ...(params.customer_notification_preference && {
        customer_notification_preference: params.customer_notification_preference,
      }),
      ...(params.success_redirect_url && { success_redirect_url: params.success_redirect_url }),
      ...(params.failure_redirect_url && { failure_redirect_url: params.failure_redirect_url }),
      ...(params.items && { items: params.items }),
      ...(params.fees && { fees: params.fees }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    return this.request<XenditInvoice>('/v2/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  /**
   * Get an invoice by ID
   *
   * @param invoiceId Xendit invoice ID
   * @returns Invoice object
   */
  async getInvoice(invoiceId: string): Promise<XenditInvoice> {
    return this.request<XenditInvoice>(`/v2/invoices/${invoiceId}`, {
      method: 'GET',
    });
  }

  /**
   * Expire an invoice
   *
   * @param invoiceId Xendit invoice ID
   * @returns Updated invoice object
   */
  async expireInvoice(invoiceId: string): Promise<XenditInvoice> {
    return this.request<XenditInvoice>(`/v2/invoices/${invoiceId}/expire!`, {
      method: 'POST',
    });
  }

  /**
   * Get all invoices (paginated)
   *
   * @param options Query options
   * @returns Array of invoices
   */
  async listInvoices(options?: {
    limit?: number;
    after_id?: string;
    before_id?: string;
    statuses?: Array<'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED'>;
  }): Promise<XenditInvoice[]> {
    const queryParams = new URLSearchParams();

    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.after_id) queryParams.append('after_id', options.after_id);
    if (options?.before_id) queryParams.append('before_id', options.before_id);
    if (options?.statuses) {
      options.statuses.forEach(status => queryParams.append('statuses[]', status));
    }

    const query = queryParams.toString();
    const endpoint = query ? `/v2/invoices?${query}` : '/v2/invoices';

    return this.request<XenditInvoice[]>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Verify webhook signature
   *
   * @param callbackToken Token from X-CALLBACK-TOKEN header
   * @returns True if signature is valid
   */
  verifyWebhookSignature(callbackToken: string): boolean {
    if (!this.webhookVerificationToken) {
      console.warn('[XenditService] Webhook verification token not configured');
      return false;
    }

    return callbackToken === this.webhookVerificationToken;
  }

  /**
   * Parse webhook event payload
   *
   * @param payload Raw webhook payload
   * @returns Parsed webhook event
   */
  parseWebhookEvent(payload: any): XenditWebhookEvent {
    return {
      id: payload.id,
      external_id: payload.external_id,
      user_id: payload.user_id,
      status: payload.status,
      amount: payload.amount,
      payer_email: payload.payer_email,
      description: payload.description,
      paid_amount: payload.paid_amount,
      paid_at: payload.paid_at,
      payment_method: payload.payment_method,
      payment_channel: payload.payment_channel,
      payment_destination: payload.payment_destination,
      bank_code: payload.bank_code,
      retail_outlet_name: payload.retail_outlet_name,
      ewallet_type: payload.ewallet_type,
      created: payload.created,
      updated: payload.updated,
      currency: payload.currency || 'PHP',
      metadata: payload.metadata,
    };
  }

  /**
   * Get available payment methods for an amount
   *
   * @param amount Payment amount
   * @returns Available payment methods configuration
   */
  getAvailablePaymentMethods(amount: number): {
    banks: boolean;
    retailOutlets: boolean;
    ewallets: boolean;
    qrCodes: boolean;
    cards: boolean;
  } {
    // Xendit Philippines typical limits
    return {
      banks: amount >= 100, // Virtual account minimum
      retailOutlets: amount >= 100 && amount <= 50000, // 7-Eleven, etc.
      ewallets: amount >= 100, // GCash, PayMaya, etc.
      qrCodes: amount >= 100, // QR Ph
      cards: amount >= 100, // Credit/Debit cards
    };
  }

  /**
   * Format amount to Xendit format based on currency
   *
   * Xendit requires amounts in the smallest currency unit:
   * - PHP, IDR, JPY, KRW, VND: No decimals (whole numbers)
   * - USD, EUR, GBP, etc.: Cents (multiply by 100)
   *
   * @param amount Amount in currency major units
   * @param currency Currency code
   * @returns Formatted amount for Xendit API
   */
  formatAmount(amount: number, currency: string = PRIMARY_CURRENCY): number {
    return toXenditAmount(amount, currency);
  }

  /**
   * Check if a currency is supported by Xendit
   */
  isCurrencySupported(currency: string): boolean {
    return isXenditSupported(currency);
  }

  /**
   * Get the effective currency for payment
   * Falls back to PHP if the requested currency is not supported
   */
  getEffectiveCurrency(requestedCurrency: string): string {
    if (isXenditSupported(requestedCurrency)) {
      return requestedCurrency;
    }
    // Fallback to primary currency (PHP) for unsupported currencies
    console.warn(
      `[XenditService] Currency ${requestedCurrency} not supported by Xendit, falling back to ${PRIMARY_CURRENCY}`
    );
    return PRIMARY_CURRENCY;
  }

  /**
   * Get available payment methods for an amount in a specific currency
   *
   * @param amount Payment amount
   * @param currency Currency code
   * @returns Available payment methods configuration
   */
  getAvailablePaymentMethodsForCurrency(
    amount: number,
    currency: string
  ): {
    banks: boolean;
    retailOutlets: boolean;
    ewallets: boolean;
    qrCodes: boolean;
    cards: boolean;
    availableMethods: string[];
  } {
    const currencyInfo = getCurrencyInfo(currency);
    const minAmount = currencyInfo?.minAmount ?? 100;

    // Payment method availability varies by currency/region
    if (currency === 'PHP') {
      // Philippines - Full local payment support
      return {
        banks: amount >= minAmount,
        retailOutlets: amount >= minAmount && amount <= 50000,
        ewallets: amount >= minAmount, // GCash, PayMaya, GrabPay
        qrCodes: amount >= minAmount, // QR Ph
        cards: amount >= minAmount,
        availableMethods: ['bank_transfer', 'retail_outlet', 'ewallet', 'qr_code', 'card'],
      };
    } else if (currency === 'IDR') {
      // Indonesia - Full local payment support
      return {
        banks: amount >= minAmount,
        retailOutlets: amount >= minAmount && amount <= 5000000,
        ewallets: amount >= minAmount, // OVO, DANA, LinkAja, ShopeePay
        qrCodes: amount >= minAmount, // QRIS
        cards: amount >= minAmount,
        availableMethods: ['bank_transfer', 'retail_outlet', 'ewallet', 'qr_code', 'card'],
      };
    } else {
      // Global currencies - Cards only via Global Account
      return {
        banks: false,
        retailOutlets: false,
        ewallets: false,
        qrCodes: false,
        cards: amount >= minAmount,
        availableMethods: ['card'],
      };
    }
  }

  /**
   * Create invoice for subscription payment with multi-currency support
   *
   * @param params Subscription payment parameters
   * @returns Created invoice
   */
  async createSubscriptionInvoice(params: {
    tenantId: string;
    externalId:string;
    offeringId: string;
    offeringName: string;
    amount: number;
    currency?: string;
    payerEmail: string;
    payerName: string;
    billingCycle: 'monthly' | 'annual' | 'lifetime';
    successUrl: string;
    failureUrl: string;
    /** Original amount in customer's preferred currency (for tracking) */
    originalAmount?: number;
    /** Original currency requested by customer */
    originalCurrency?: string;
    /** Discount information if a discount was applied */
    discount?: {
      discount_id: string;
      discount_code?: string;
      discount_name: string;
      discount_type: 'coupon' | 'automatic';
      calculation_type: 'percentage' | 'fixed_amount';
      discount_value: number;
      discount_amount: number;
      original_price: number;
      /** Number of billing cycles the discount applies (e.g., 3 for "first 3 months") */
      duration_billing_cycles?: number | null;
    };
  }): Promise<XenditInvoice> {
    const externalId = params.externalId || `SUB-${params.tenantId}-${Date.now()}`;
    const cycleLabel = params.billingCycle === 'monthly' ? 'Monthly' : params.billingCycle === 'annual' ? 'Annual' : 'Lifetime';

    // Build description with discount info if applicable
    let description = `${params.offeringName} - ${cycleLabel} Subscription`;
    if (params.discount) {
      const discountLabel = params.discount.calculation_type === 'percentage'
        ? `${params.discount.discount_value}% OFF`
        : `${params.discount.discount_amount} OFF`;
      description += ` (${discountLabel} applied)`;
    }

    // Determine effective currency (fallback to PHP if not supported)
    const requestedCurrency = params.currency || PRIMARY_CURRENCY;
    const effectiveCurrency = this.getEffectiveCurrency(requestedCurrency);

    const names = params.payerName.split(' ');
    const givenNames = names.slice(0, -1).join(' ') || params.payerName;
    const surname = names.length > 1 ? names[names.length - 1] : '';

    // Format amount for Xendit based on effective currency
    const formattedAmount = this.formatAmount(params.amount, effectiveCurrency);

    return this.createInvoice({
      external_id: externalId,
      amount: formattedAmount,
      payer_email: params.payerEmail,
      description,
      invoice_duration: 86400, // 24 hours
      currency: effectiveCurrency,
      customer: {
        given_names: givenNames,
        surname: surname,
        email: params.payerEmail,
      },
      customer_notification_preference: {
        invoice_created: ['email'],
        invoice_reminder: ['email'],
        invoice_paid: ['email'],
        invoice_expired: ['email'],
      },
      success_redirect_url: params.successUrl,
      failure_redirect_url: params.failureUrl,
      items: [
        {
          name: params.offeringName,
          quantity: 1,
          price: formattedAmount,
          category: 'Subscription',
        },
      ],
      should_send_email: true,
      metadata: {
        tenant_id: params.tenantId,
        offering_id: params.offeringId,
        billing_cycle: params.billingCycle,
        payment_type: 'subscription',
        // Track original currency info for reporting
        original_currency: params.originalCurrency || requestedCurrency,
        original_amount: params.originalAmount || params.amount,
        effective_currency: effectiveCurrency,
        // Discount information for tracking
        ...(params.discount && {
          discount_id: params.discount.discount_id,
          discount_code: params.discount.discount_code,
          discount_name: params.discount.discount_name,
          discount_type: params.discount.discount_type,
          discount_calculation_type: params.discount.calculation_type,
          discount_value: params.discount.discount_value,
          discount_amount: params.discount.discount_amount,
          original_price: params.discount.original_price,
          discount_duration_billing_cycles: params.discount.duration_billing_cycles,
        }),
      },
    });
  }

  /**
   * Get supported currencies for display in UI
   */
  getSupportedCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return Object.entries(CURRENCY_INFO)
      .filter(([_, info]) => info.xenditSupported)
      .map(([code, info]) => ({
        code,
        name: info.name,
        symbol: info.symbol,
      }));
  }

  // ============================================================================
  // PAYMENTS API V3 METHODS (for Donations)
  // ============================================================================

  /**
   * Create a Xendit customer
   * Used to associate payment methods and donations with a customer
   *
   * @param params Customer creation parameters
   * @returns Created customer object
   */
  async createCustomer(params: CreateCustomerParams): Promise<XenditCustomerFull> {
    const customerType = params.type || 'INDIVIDUAL';

    // Build request body according to Xendit API 2020-10-31 format
    // For INDIVIDUAL type, names must be inside individual_detail object
    const requestBody: Record<string, unknown> = {
      reference_id: params.reference_id,
      type: customerType,
    };

    // Add individual_detail for INDIVIDUAL customers (required by Xendit)
    if (customerType === 'INDIVIDUAL') {
      // Use provided name or default to "Anonymous Donor" for guests
      const givenNames = params.given_names?.trim() || 'Anonymous';
      const surname = params.surname?.trim() || 'Donor';

      requestBody.individual_detail = {
        given_names: givenNames,
        surname: surname,
      };
    }

    // Add optional fields at top level
    if (params.email) {
      requestBody.email = params.email;
    }
    if (params.mobile_number) {
      requestBody.mobile_number = params.mobile_number;
    }
    if (params.phone_number) {
      requestBody.phone_number = params.phone_number;
    }

    return this.request<XenditCustomerFull>('/customers', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'API-VERSION': '2020-10-31',
      },
    });
  }

  /**
   * Get a Xendit customer by reference ID
   *
   * @param referenceId The reference ID used when creating the customer
   * @returns Customer object or null if not found
   */
  async getCustomerByReference(referenceId: string): Promise<XenditCustomerFull | null> {
    try {
      const response = await this.request<{ data: XenditCustomerFull[] }>(
        `/customers?reference_id=${encodeURIComponent(referenceId)}`,
        {
          method: 'GET',
          headers: {
            'API-VERSION': '2020-10-31',
          },
        }
      );
      return response.data?.[0] || null;
    } catch {
      console.warn('[XenditService] Customer not found:', referenceId);
      return null;
    }
  }

  /**
   * Get a Xendit customer by ID
   *
   * @param customerId Xendit customer ID
   * @returns Customer object
   */
  async getCustomer(customerId: string): Promise<XenditCustomerFull> {
    return this.request<XenditCustomerFull>(`/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'API-VERSION': '2020-10-31',
      },
    });
  }

  /**
   * Create a payment request (Payments API v3)
   * Used for one-time donations or PAY_AND_SAVE flow
   *
   * @param params Payment request parameters
   * @returns Created payment request with action URL
   */
  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<XenditPaymentRequest> {
    const requestBody = {
      reference_id: params.reference_id,
      amount: params.amount,
      currency: params.currency,
      capture_method: params.capture_method || 'AUTOMATIC',
      payment_method: params.payment_method,
      ...(params.customer_id && { customer_id: params.customer_id }),
      ...(params.description && { description: params.description }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    return this.request<XenditPaymentRequest>('/payment_requests', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Get a payment request by ID
   *
   * @param paymentRequestId Xendit payment request ID
   * @returns Payment request object
   */
  async getPaymentRequest(paymentRequestId: string): Promise<XenditPaymentRequest> {
    return this.request<XenditPaymentRequest>(`/payment_requests/${paymentRequestId}`, {
      method: 'GET',
    });
  }

  /**
   * Charge a saved payment token (for recurring donations or saved methods)
   *
   * @param params Charge parameters
   * @returns Payment request object
   */
  async chargePaymentMethod(params: {
    paymentMethodId: string;
    amount: number;
    currency: string;
    referenceId: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<XenditPaymentRequest> {
    return this.request<XenditPaymentRequest>('/payment_requests', {
      method: 'POST',
      body: JSON.stringify({
        reference_id: params.referenceId,
        amount: params.amount,
        currency: params.currency,
        payment_method_id: params.paymentMethodId,
        ...(params.customerId && { customer_id: params.customerId }),
        ...(params.description && { description: params.description }),
        ...(params.metadata && { metadata: params.metadata }),
      }),
    });
  }

  /**
   * Get a payment token/method by ID
   *
   * @param paymentMethodId Xendit payment method ID
   * @returns Payment token object
   */
  async getPaymentMethod(paymentMethodId: string): Promise<XenditPaymentToken> {
    return this.request<XenditPaymentToken>(`/v2/payment_methods/${paymentMethodId}`, {
      method: 'GET',
    });
  }

  /**
   * Expire/deactivate a payment token
   * Used when a user removes a saved payment method
   *
   * @param paymentMethodId Xendit payment method ID
   */
  async expirePaymentMethod(paymentMethodId: string): Promise<XenditPaymentToken> {
    return this.request<XenditPaymentToken>(`/v2/payment_methods/${paymentMethodId}/expire`, {
      method: 'POST',
    });
  }

  /**
   * List payment methods for a customer
   *
   * @param customerId Xendit customer ID
   * @returns Array of payment tokens
   */
  async listPaymentMethods(customerId: string): Promise<XenditPaymentToken[]> {
    const response = await this.request<{ data: XenditPaymentToken[] }>(
      `/v2/payment_methods?customer_id=${encodeURIComponent(customerId)}`,
      {
        method: 'GET',
      }
    );
    return response.data || [];
  }

  /**
   * Initialize direct debit linked account
   * Used for bank account linking (BPI, BDO, etc.)
   *
   * @param params Linked account parameters
   * @returns Linked account initialization with authorizer URL
   */
  async initializeLinkedAccount(params: {
    customerId: string;
    channelCode: string;
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

  /**
   * Create a refund for a payment
   * For XenPlatform sub-account payments, pass forUserId to refund from sub-account
   *
   * @param params Refund parameters
   * @param forUserId Optional sub-account ID for XenPlatform refunds
   * @returns Refund object
   */
  async createRefund(params: CreateRefundParams, forUserId?: string): Promise<XenditRefund> {
    return this.request<XenditRefund>(
      '/refunds',
      {
        method: 'POST',
        body: JSON.stringify({
          payment_request_id: params.payment_request_id,
          invoice_id: params.invoice_id,
          reference_id: params.reference_id,
          amount: params.amount,
          reason: params.reason,
          metadata: params.metadata,
        }),
      },
      forUserId  // Pass for-user-id header for sub-account refunds
    );
  }

  /**
   * Get a refund by ID
   *
   * @param refundId Xendit refund ID
   * @returns Refund object
   */
  async getRefund(refundId: string): Promise<XenditRefund> {
    return this.request<XenditRefund>(`/refunds/${refundId}`, {
      method: 'GET',
    });
  }

  /**
   * Create a donation payment request with simplified parameters
   * Handles the complexity of building the payment method object
   *
   * @param params Donation parameters
   * @returns Payment request with action URL for donor
   */
  async createDonationPayment(params: {
    donationId: string;
    customerId?: string;
    amount: number;
    currency?: string;
    paymentMethodType: 'CARD' | 'EWALLET' | 'DIRECT_DEBIT' | 'VIRTUAL_ACCOUNT' | 'QR_CODE';
    channelCode?: string;
    savePaymentMethod?: boolean;
    successUrl: string;
    failureUrl: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<XenditPaymentRequest> {
    const currency = this.getEffectiveCurrency(params.currency || 'PHP');
    const formattedAmount = this.formatAmount(params.amount, currency);
    const reusability: PaymentReusability = params.savePaymentMethod ? 'MULTIPLE_USE' : 'ONE_TIME_USE';

    // Build payment method object based on type
    const paymentMethod: CreatePaymentRequestParams['payment_method'] = {
      type: params.paymentMethodType,
      reusability,
    };

    // Add channel-specific properties
    switch (params.paymentMethodType) {
      case 'CARD':
        paymentMethod.card = {
          channel_properties: {
            success_return_url: params.successUrl,
            failure_return_url: params.failureUrl,
          },
        };
        break;
      case 'EWALLET':
        paymentMethod.ewallet = {
          channel_code: params.channelCode || 'GCASH',
          channel_properties: {
            success_return_url: params.successUrl,
            failure_return_url: params.failureUrl,
          },
        };
        break;
      case 'DIRECT_DEBIT':
        paymentMethod.direct_debit = {
          channel_code: params.channelCode || 'BPI',
          channel_properties: {
            success_return_url: params.successUrl,
            failure_return_url: params.failureUrl,
          },
        };
        break;
      case 'VIRTUAL_ACCOUNT':
        paymentMethod.virtual_account = {
          channel_code: params.channelCode || 'BPI',
        };
        break;
      case 'QR_CODE':
        paymentMethod.qr_code = {
          channel_code: params.channelCode || 'QRPH',
        };
        break;
    }

    return this.createPaymentRequest({
      reference_id: params.donationId,
      customer_id: params.customerId,
      amount: formattedAmount,
      currency,
      payment_method: paymentMethod,
      description: params.description,
      metadata: {
        ...params.metadata,
        donation_id: params.donationId,
        payment_type: 'donation',
      },
    });
  }

  /**
   * Get the action URL from a payment request for redirecting the donor
   *
   * @param paymentRequest Payment request object
   * @returns URL to redirect the donor to, or null if not available
   */
  getPaymentActionUrl(paymentRequest: XenditPaymentRequest): string | null {
    const authAction = paymentRequest.actions?.find(a => a.action === 'AUTH');
    return authAction?.url || null;
  }

  // ============================================================================
  // PAYOUT/DISBURSEMENT METHODS
  // ============================================================================

  /**
   * Create a payout/disbursement to a bank account or e-wallet
   *
   * IMPORTANT: The bank account details are managed in Xendit Dashboard.
   * StewardTrack only stores the Xendit payout channel reference.
   *
   * @param params Payout parameters
   * @returns Payout object
   */
  async createPayout(params: CreatePayoutParams): Promise<XenditPayout> {
    const currency = params.currency || 'PHP';
    const formattedAmount = this.formatAmount(params.amount, currency);

    const requestBody = {
      reference_id: params.referenceId || params.externalId,
      channel_code: params.channelCode,
      channel_properties: params.channelProperties || {},
      amount: formattedAmount,
      currency,
      description: params.description || `Payout ${params.externalId}`,
      ...(params.metadata && { metadata: params.metadata }),
    };

    console.log(`[XenditService] Creating payout: ${params.externalId}, amount: ${formattedAmount} ${currency}, channel: ${params.channelCode}`);

    return this.request<XenditPayout>('/v2/payouts', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Get a payout by ID
   *
   * @param payoutId Xendit payout ID
   * @returns Payout object
   */
  async getPayout(payoutId: string): Promise<XenditPayout> {
    return this.request<XenditPayout>(`/v2/payouts/${payoutId}`, {
      method: 'GET',
    });
  }

  /**
   * Cancel a pending payout
   *
   * @param payoutId Xendit payout ID
   * @returns Updated payout object
   */
  async cancelPayout(payoutId: string): Promise<XenditPayout> {
    return this.request<XenditPayout>(`/v2/payouts/${payoutId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * List payouts with optional filters
   *
   * @param options Query options
   * @returns Array of payouts
   */
  async listPayouts(options?: {
    reference_id?: string;
    channel_code?: string;
    status?: string;
    limit?: number;
    after_id?: string;
  }): Promise<XenditPayout[]> {
    const queryParams = new URLSearchParams();

    if (options?.reference_id) queryParams.append('reference_id', options.reference_id);
    if (options?.channel_code) queryParams.append('channel_code', options.channel_code);
    if (options?.status) queryParams.append('status', options.status);
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.after_id) queryParams.append('after_id', options.after_id);

    const query = queryParams.toString();
    const endpoint = query ? `/v2/payouts?${query}` : '/v2/payouts';

    const response = await this.request<{ data: XenditPayout[] }>(endpoint, {
      method: 'GET',
    });

    return response.data || [];
  }

  // ============================================================================
  // XENPLATFORM METHODS (Multi-tenant Sub-accounts)
  // ============================================================================

  /**
   * Create a XenPlatform Owned Sub-account
   * Used to create isolated accounts for each tenant for donation collection
   *
   * Documentation: https://docs.xendit.co/docs/xenplatform-overview
   *
   * @param params Account creation parameters
   * @returns Created sub-account object
   */
  async createXenPlatformAccount(params: {
    email: string;
    type: 'OWNED';
    publicProfile: { business_name: string };
  }): Promise<XenPlatformAccount> {
    const requestBody = {
      email: params.email,
      type: params.type,
      public_profile: params.publicProfile,
    };

    console.log(`[XenditService] Creating XenPlatform sub-account for: ${params.publicProfile.business_name}`);

    return this.request<XenPlatformAccount>('/v2/accounts', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Get a XenPlatform account by ID
   *
   * @param accountId The Xendit account ID
   * @returns Account object
   */
  async getXenPlatformAccount(accountId: string): Promise<XenPlatformAccount> {
    return this.request<XenPlatformAccount>(`/v2/accounts/${accountId}`, {
      method: 'GET',
    });
  }

  /**
   * Get balance for a sub-account
   * Uses the for-user-id header to query sub-account balance
   *
   * @param subAccountId The Xendit sub-account ID
   * @returns Balance object
   */
  async getBalanceForSubAccount(subAccountId: string): Promise<XenPlatformBalance> {
    return this.request<XenPlatformBalance>(
      '/balance',
      { method: 'GET' },
      subAccountId  // Pass for-user-id header
    );
  }

  /**
   * Create a payment request with optional sub-account (for-user-id header)
   * When forUserId is provided, funds go to sub-account balance, not master
   *
   * XenPlatform Split Rule (Platform Fee Collection):
   * When withSplitRule is provided, Xendit automatically:
   * - Splits the payment according to the rule configuration
   * - Sends the platform fee to the platform (StewardTrack) balance
   * - Sends the remaining amount to the sub-account balance
   *
   * @param params Payment request parameters
   * @param forUserId Optional sub-account ID for XenPlatform
   * @param withSplitRule Optional split rule ID for automatic platform fee collection
   * @returns Created payment request with action URL
   */
  async createPaymentRequestForSubAccount(
    params: CreatePaymentRequestParams,
    forUserId?: string,
    withSplitRule?: string
  ): Promise<XenditPaymentRequest> {
    const requestBody = {
      reference_id: params.reference_id,
      amount: params.amount,
      currency: params.currency,
      capture_method: params.capture_method || 'AUTOMATIC',
      payment_method: params.payment_method,
      ...(params.customer_id && { customer_id: params.customer_id }),
      ...(params.description && { description: params.description }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    return this.request<XenditPaymentRequest>(
      '/payment_requests',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      forUserId,     // Pass for-user-id header if provided
      withSplitRule  // Pass with-split-rule header for automatic platform fee collection
    );
  }

  /**
   * Create a payout from a sub-account balance
   * Uses for-user-id header to payout from sub-account, not master balance
   *
   * @param params Payout parameters including bank account details
   * @param forUserId Sub-account ID for XenPlatform (required for sub-account payouts)
   * @returns Payout object
   */
  async createPayoutForSubAccount(
    params: CreatePayoutParams & {
      channelProperties: {
        account_holder_name: string;
        account_number: string;
      };
    },
    forUserId: string
  ): Promise<XenditPayout> {
    const currency = params.currency || 'PHP';
    const formattedAmount = this.formatAmount(params.amount, currency);

    const requestBody = {
      reference_id: params.referenceId || params.externalId,
      channel_code: params.channelCode,
      channel_properties: params.channelProperties,
      amount: formattedAmount,
      currency,
      description: params.description || `Payout ${params.externalId}`,
      ...(params.metadata && { metadata: params.metadata }),
    };

    console.log(`[XenditService] Creating payout from sub-account ${forUserId}: ${params.externalId}, amount: ${formattedAmount} ${currency}`);

    return this.request<XenditPayout>(
      '/v2/payouts',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      forUserId  // Payout FROM sub-account balance
    );
  }

  /**
   * Create a donation payment with sub-account routing
   * Funds go directly to the church's sub-account balance
   *
   * XenPlatform Split Rule (Platform Fee Collection):
   * When withSplitRule is provided, Xendit automatically:
   * - Splits the payment according to the rule configuration
   * - Sends the platform fee to the platform (StewardTrack) balance
   * - Sends the remaining amount to the sub-account balance
   *
   * @param params Donation parameters
   * @param forUserId Sub-account ID for XenPlatform
   * @param withSplitRule Optional split rule ID for automatic platform fee collection
   * @returns Payment request with action URL for donor
   */
  async createDonationPaymentForSubAccount(params: {
    donationId: string;
    customerId?: string;
    amount: number;
    currency?: string;
    paymentMethodType: 'CARD' | 'EWALLET' | 'DIRECT_DEBIT' | 'VIRTUAL_ACCOUNT' | 'QR_CODE';
    channelCode?: string;
    savePaymentMethod?: boolean;
    successUrl: string;
    failureUrl: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }, forUserId?: string, withSplitRule?: string): Promise<XenditPaymentRequest> {
    const currency = this.getEffectiveCurrency(params.currency || 'PHP');
    const formattedAmount = this.formatAmount(params.amount, currency);
    const reusability: PaymentReusability = params.savePaymentMethod ? 'MULTIPLE_USE' : 'ONE_TIME_USE';

    // Build payment method object based on type
    const paymentMethod: CreatePaymentRequestParams['payment_method'] = {
      type: params.paymentMethodType,
      reusability,
    };

    // Add channel-specific properties
    switch (params.paymentMethodType) {
      case 'CARD':
        paymentMethod.card = {
          channel_properties: {
            success_return_url: params.successUrl,
            failure_return_url: params.failureUrl,
          },
        };
        break;
      case 'EWALLET':
        paymentMethod.ewallet = {
          channel_code: params.channelCode || 'GCASH',
          channel_properties: {
            success_return_url: params.successUrl,
            failure_return_url: params.failureUrl,
          },
        };
        break;
      case 'DIRECT_DEBIT':
        paymentMethod.direct_debit = {
          channel_code: params.channelCode || 'BPI',
          channel_properties: {
            success_return_url: params.successUrl,
            failure_return_url: params.failureUrl,
          },
        };
        break;
      case 'VIRTUAL_ACCOUNT':
        paymentMethod.virtual_account = {
          channel_code: params.channelCode || 'BPI',
        };
        break;
      case 'QR_CODE':
        paymentMethod.qr_code = {
          channel_code: params.channelCode || 'QRPH',
        };
        break;
    }

    return this.createPaymentRequestForSubAccount(
      {
        reference_id: params.donationId,
        customer_id: params.customerId,
        amount: formattedAmount,
        currency,
        payment_method: paymentMethod,
        description: params.description,
        metadata: {
          ...params.metadata,
          donation_id: params.donationId,
          payment_type: 'donation',
        },
      },
      forUserId,
      withSplitRule  // Pass with-split-rule header for automatic platform fee collection
    );
  }

  // ============================================================================
  // SPLIT RULE METHODS (for Platform Fee Collection)
  // ============================================================================

  /**
   * Create a Split Rule for automatic platform fee collection
   *
   * Split Rules define how payments are split between the platform and sub-accounts.
   * Use this to automatically collect platform fees/commissions on transactions.
   *
   * Example: 3% platform fee
   * ```typescript
   * const rule = await xenditService.createSplitRule({
   *   reference_id: 'stewardtrack_platform_fee',
   *   name: 'StewardTrack Platform Fee',
   *   description: '3% platform fee on donations',
   *   routes: [{
   *     percent_amount: 3,
   *     destination_account_id: null, // null = platform account
   *     reference_id: 'platform_fee'
   *   }]
   * });
   * ```
   *
   * Documentation: https://docs.xendit.co/docs/split-payments
   *
   * @param params Split rule parameters
   * @returns Created split rule with ID to use in with-split-rule header
   */
  async createSplitRule(params: CreateSplitRuleParams): Promise<XenditSplitRule> {
    const requestBody = {
      reference_id: params.reference_id,
      name: params.name,
      description: params.description || null,
      routes: params.routes.map(route => ({
        flat_amount: route.flat_amount ?? null,
        percent_amount: route.percent_amount ?? null,
        destination_account_id: route.destination_account_id ?? null,
        reference_id: route.reference_id,
        currency: route.currency || 'PHP',
      })),
    };

    console.log(`[XenditService] Creating split rule: ${params.name}`);

    return this.request<XenditSplitRule>('/split_rules', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Get a Split Rule by ID
   *
   * @param splitRuleId The split rule ID
   * @returns Split rule details
   */
  async getSplitRule(splitRuleId: string): Promise<XenditSplitRule> {
    return this.request<XenditSplitRule>(`/split_rules/${splitRuleId}`, {
      method: 'GET',
    });
  }

  /**
   * Create a platform fee split rule for StewardTrack
   *
   * Convenience method to create a standard platform fee rule.
   * The fee is sent to the platform (master) account.
   *
   * @param feePercentage Platform fee percentage (e.g., 3 for 3%)
   * @param referenceId Unique reference ID for the rule
   * @returns Created split rule
   */
  async createPlatformFeeSplitRule(
    feePercentage: number,
    referenceId: string = 'stewardtrack_platform_fee'
  ): Promise<XenditSplitRule> {
    return this.createSplitRule({
      reference_id: referenceId,
      name: 'StewardTrack Platform Fee',
      description: `${feePercentage}% platform fee on donations`,
      routes: [{
        percent_amount: feePercentage,
        destination_account_id: null, // null = platform (StewardTrack) account
        reference_id: 'platform_fee',
      }],
    });
  }
}

// ============================================================================
// XENPLATFORM TYPES
// ============================================================================

/**
 * XenPlatform Account (Sub-account) response
 */
export interface XenPlatformAccount {
  id: string;
  created: string;
  updated: string;
  type: 'OWNED' | 'MANAGED';
  email: string;
  public_profile: {
    business_name: string;
  };
  country: string;
  status: 'REGISTERED' | 'AWAITING_DOCS' | 'LIVE' | 'SUSPENDED';
}

/**
 * XenPlatform Balance response
 */
export interface XenPlatformBalance {
  balance: number;
  pending_balance: number;
  currency: string;
}

// ============================================================================
// SPLIT RULE TYPES (for Platform Fee Collection)
// ============================================================================

/**
 * Split Rule Route - defines how to split a portion of the payment
 * Either flat_amount or percent_amount must be provided (not both)
 *
 * Documentation: https://docs.xendit.co/docs/split-payments
 */
export interface SplitRuleRoute {
  /** Flat amount to split (in currency's smallest unit). Required if percent_amount is null. */
  flat_amount?: number;
  /** Percentage amount to split (0-100). Required if flat_amount is null. */
  percent_amount?: number;
  /** Destination account ID. If null, defaults to Platform (master) account. */
  destination_account_id?: string | null;
  /** Unique reference ID for this route within the split rule */
  reference_id: string;
  /** Currency for flat_amount (defaults to transaction currency) */
  currency?: string;
}

/**
 * Parameters for creating a Split Rule
 */
export interface CreateSplitRuleParams {
  /** Unique reference ID for the split rule */
  reference_id: string;
  /** Human-readable name for the split rule */
  name: string;
  /** Description of the split rule */
  description?: string;
  /** Routes defining how to split the payment (max 5 routes) */
  routes: SplitRuleRoute[];
}

/**
 * Split Rule response from Xendit API
 */
export interface XenditSplitRule {
  id: string;
  reference_id: string;
  name: string;
  description: string | null;
  routes: Array<{
    flat_amount: number | null;
    percent_amount: number | null;
    destination_account_id: string | null;
    reference_id: string;
    currency: string;
  }>;
  created: string;
  updated: string;
}
