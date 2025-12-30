import { injectable } from 'inversify';
import 'reflect-metadata';

/**
 * Xendit API Service
 *
 * Wrapper service for Xendit payment gateway integration.
 * Handles invoice creation, payment methods, and API communication.
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
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as XenditErrorResponse;
      throw new Error(`Xendit API Error: ${error.error_code} - ${error.message}`);
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
   * Format amount to Xendit format (no decimal places for PHP)
   *
   * @param amount Amount in currency major units
   * @param currency Currency code
   * @returns Formatted amount
   */
  formatAmount(amount: number, currency: string = 'PHP'): number {
    // PHP uses whole numbers (no cents)
    if (currency === 'PHP') {
      return Math.round(amount);
    }
    // Other currencies might use cents
    return Math.round(amount * 100);
  }

  /**
   * Create invoice for subscription payment
   *
   * @param params Subscription payment parameters
   * @returns Created invoice
   */
  async createSubscriptionInvoice(params: {
    tenantId: string;
    offeringId: string;
    offeringName: string;
    amount: number;
    payerEmail: string;
    payerName: string;
    billingCycle: 'monthly' | 'annual';
    successUrl: string;
    failureUrl: string;
  }): Promise<XenditInvoice> {
    const externalId = `SUB-${params.tenantId}-${Date.now()}`;
    const description = `${params.offeringName} - ${params.billingCycle === 'monthly' ? 'Monthly' : 'Annual'} Subscription`;

    const names = params.payerName.split(' ');
    const givenNames = names.slice(0, -1).join(' ') || params.payerName;
    const surname = names.length > 1 ? names[names.length - 1] : '';

    return this.createInvoice({
      external_id: externalId,
      amount: this.formatAmount(params.amount),
      payer_email: params.payerEmail,
      description,
      invoice_duration: 86400, // 24 hours
      currency: 'PHP',
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
          price: this.formatAmount(params.amount),
          category: 'Subscription',
        },
      ],
      should_send_email: true,
      metadata: {
        tenant_id: params.tenantId,
        offering_id: params.offeringId,
        billing_cycle: params.billingCycle,
        payment_type: 'subscription',
      },
    });
  }
}
