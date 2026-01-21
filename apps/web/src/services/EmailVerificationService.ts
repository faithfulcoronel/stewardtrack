/**
 * Email Verification Service
 *
 * Handles email verification flow during tenant registration:
 * 1. initiateVerification - Creates pending registration, sends verification email
 * 2. verifyEmailAndComplete - Validates token, completes tenant provisioning
 * 3. resendVerificationEmail - Resends verification email (rate limited)
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { randomBytes } from 'crypto';
import { TYPES } from '@/lib/types';
import type { IPendingRegistrationRepository } from '@/repositories/pendingRegistration.repository';
import type { IAuthRepository } from '@/repositories/auth.repository';
import type { SettingService } from '@/services/SettingService';
import type { RegistrationService, RegistrationData } from '@/services/RegistrationService';
import { renderEmailVerificationEmail } from '@/emails/service/EmailTemplateService';

export interface InitiateVerificationData {
  email: string;
  password: string;
  churchName: string;
  firstName: string;
  lastName: string;
  offeringId: string;
  denomination?: string;
  contactNumber?: string;
  address?: string;
  // Offering type flags
  isTrial?: boolean;
  isFree?: boolean;
  priceIsZero?: boolean;
  // Coupon/discount data
  couponCode?: string;
  couponDiscountId?: string;
  couponDiscountAmount?: number;
  couponDiscountedPrice?: number;
  couponDurationBillingCycles?: number;
}

export interface InitiateVerificationResult {
  success: boolean;
  email?: string;
  message?: string;
  error?: string;
}

export interface VerifyEmailResult {
  success: boolean;
  tenantId?: string;
  subdomain?: string;
  error?: string;
  // Offering type flags for redirect logic
  offeringId?: string;
  isTrial?: boolean;
  isFree?: boolean;
  priceIsZero?: boolean;
  // User data for checkout
  email?: string;
  firstName?: string;
  lastName?: string;
  // Coupon/discount data for checkout redirect
  couponCode?: string | null;
  couponDiscountId?: string | null;
  couponDurationBillingCycles?: number | null;
}

export interface ResendVerificationResult {
  success: boolean;
  message?: string;
  error?: string;
}

// In-memory rate limiting store (per email)
// In production, this should use Redis or similar
const resendAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

@injectable()
export class EmailVerificationService {
  constructor(
    @inject(TYPES.IPendingRegistrationRepository)
    private pendingRegistrationRepository: IPendingRegistrationRepository,
    @inject(TYPES.IAuthRepository)
    private authRepository: IAuthRepository,
    @inject(TYPES.SettingService)
    private settingService: SettingService,
    @inject(TYPES.RegistrationService)
    private registrationService: RegistrationService
  ) {}

  /**
   * Generate a secure 32-byte verification token (base64url encoded)
   */
  private generateVerificationToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Check rate limiting for resend attempts
   */
  private checkRateLimit(email: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();
    const record = resendAttempts.get(normalizedEmail);

    if (!record) {
      return { allowed: true, remainingAttempts: RESEND_LIMIT };
    }

    // Check if window has expired
    if (now - record.firstAttempt > RESEND_WINDOW_MS) {
      resendAttempts.delete(normalizedEmail);
      return { allowed: true, remainingAttempts: RESEND_LIMIT };
    }

    if (record.count >= RESEND_LIMIT) {
      const retryAfterSeconds = Math.ceil((record.firstAttempt + RESEND_WINDOW_MS - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }

    return { allowed: true, remainingAttempts: RESEND_LIMIT - record.count };
  }

  /**
   * Record a resend attempt for rate limiting
   */
  private recordResendAttempt(email: string): void {
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();
    const record = resendAttempts.get(normalizedEmail);

    if (!record || now - record.firstAttempt > RESEND_WINDOW_MS) {
      resendAttempts.set(normalizedEmail, { count: 1, firstAttempt: now });
    } else {
      record.count++;
    }
  }

  /**
   * Get email configuration from system-level settings
   */
  private async getEmailConfiguration(): Promise<{ apiKey: string; fromEmail: string; fromName?: string; replyTo?: string | null } | null> {
    try {
      const systemConfig = await this.settingService.getSystemEmailConfig();

      if (systemConfig && systemConfig.apiKey && systemConfig.fromEmail) {
        return {
          apiKey: systemConfig.apiKey,
          fromEmail: systemConfig.fromEmail,
          fromName: systemConfig.fromName || undefined,
          replyTo: systemConfig.replyTo,
        };
      }
    } catch (error) {
      console.error('[EmailVerificationService] Failed to get system email config:', error);
    }

    return null;
  }

  /**
   * Send verification email to user
   */
  private async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string,
    churchName: string
  ): Promise<void> {
    const config = await this.getEmailConfiguration();

    if (!config) {
      throw new Error('Email service not configured. Please contact support.');
    }

    const { apiKey, fromEmail, fromName, replyTo } = config;

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stewardtrack.com';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    // Render the email template
    const htmlBody = await renderEmailVerificationEmail({
      recipientName: firstName,
      verificationUrl,
      churchName,
      expiresIn: '24 hours',
    });

    // Build the "from" field with optional display name
    const fromField = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      from: fromField,
      to: email,
      subject: `Verify your email to complete ${churchName} registration`,
      html: htmlBody,
    };

    // Add reply-to if configured
    if (replyTo) {
      emailPayload.reply_to = replyTo;
    }

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send verification email: ${errorText}`);
    }

    const result = await response.json();
    console.log(`[EmailVerificationService] Verification email sent to ${email}, messageId: ${result.id}`);
  }

  /**
   * Initiate email verification flow
   *
   * 1. Validate input data
   * 2. Check if email already registered
   * 3. Create Supabase auth user (with email_confirm: false)
   * 4. Create pending registration record
   * 5. Send verification email
   */
  async initiateVerification(data: InitiateVerificationData): Promise<InitiateVerificationResult> {
    const {
      email, password, churchName, firstName, lastName, offeringId,
      denomination, contactNumber, address,
      isTrial, isFree, priceIsZero,
      couponCode, couponDiscountId, couponDiscountAmount, couponDiscountedPrice, couponDurationBillingCycles
    } = data;

    try {
      // Validate required fields
      if (!email || !password || !churchName || !firstName || !lastName || !offeringId) {
        return { success: false, error: 'Missing required fields' };
      }

      // Check if there's already a pending registration for this email
      const existingPending = await this.pendingRegistrationRepository.findByEmail(email);
      if (existingPending) {
        // If pending registration exists, resend verification email instead
        return await this.resendVerificationEmail(email);
      }

      // Create Supabase auth user (email not confirmed yet)
      const authResponse = await this.authRepository.signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        email_confirmed: false, // User must verify email
      });

      if (authResponse.error) {
        // Check for common errors
        if (authResponse.error.message.includes('already registered')) {
          return { success: false, error: 'This email is already registered. Please sign in or use a different email.' };
        }
        return { success: false, error: `Registration failed: ${authResponse.error.message}` };
      }

      if (!authResponse.data.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      const userId = authResponse.data.user.id;

      // Generate verification token
      const verificationToken = this.generateVerificationToken();

      // Create pending registration record
      try {
        await this.pendingRegistrationRepository.create({
          user_id: userId,
          verification_token: verificationToken,
          email: email.toLowerCase(),
          church_name: churchName,
          first_name: firstName,
          last_name: lastName,
          offering_id: offeringId,
          denomination: denomination || null,
          contact_number: contactNumber || null,
          address: address || null,
          // Offering type flags
          is_trial: isTrial || false,
          is_free: isFree || false,
          price_is_zero: priceIsZero || false,
          // Coupon/discount data
          coupon_code: couponCode || null,
          coupon_discount_id: couponDiscountId || null,
          coupon_discount_amount: couponDiscountAmount || null,
          coupon_discounted_price: couponDiscountedPrice || null,
          coupon_duration_billing_cycles: couponDurationBillingCycles || null,
        });
      } catch (error) {
        // Cleanup: delete the auth user if pending registration fails
        console.error('[EmailVerificationService] Failed to create pending registration, cleaning up auth user:', error);
        await this.authRepository.deleteUser(userId);
        return { success: false, error: 'Failed to initiate registration. Please try again.' };
      }

      // Send verification email
      try {
        await this.sendVerificationEmail(email, firstName, verificationToken, churchName);
      } catch (error) {
        console.error('[EmailVerificationService] Failed to send verification email:', error);
        // Don't cleanup here - user can resend the email
        return {
          success: true,
          email,
          message: 'Account created but verification email could not be sent. Please use the resend option.',
        };
      }

      return {
        success: true,
        email,
        message: 'Verification email sent. Please check your inbox and click the verification link.',
      };

    } catch (error) {
      console.error('[EmailVerificationService] initiateVerification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed. Please try again.',
      };
    }
  }

  /**
   * Verify email and complete tenant provisioning
   *
   * 1. Find pending registration by token
   * 2. Validate token is not expired
   * 3. Mark token as used
   * 4. Complete tenant provisioning via RegistrationService
   */
  async verifyEmailAndComplete(token: string): Promise<VerifyEmailResult> {
    try {
      // Find pending registration by token
      const pending = await this.pendingRegistrationRepository.findByToken(token);

      if (!pending) {
        return {
          success: false,
          error: 'Invalid or expired verification link. Please request a new verification email.',
        };
      }

      // Check if token has expired (handled by query, but double-check)
      const tokenExpiry = new Date(pending.token_expires_at);
      if (tokenExpiry < new Date()) {
        return {
          success: false,
          error: 'Verification link has expired. Please request a new verification email.',
        };
      }

      // Mark token as used before proceeding
      await this.pendingRegistrationRepository.markTokenUsed(token);

      // Confirm user's email in Supabase
      try {
        await this.authRepository.confirmUserEmail(pending.user_id);
      } catch (error) {
        console.error('[EmailVerificationService] Failed to confirm user email:', error);
        // Continue anyway - the user account exists
      }

      // Complete registration using RegistrationService.completeRegistrationAfterVerification
      // This handles: tenant creation, RBAC setup, feature provisioning, etc.
      const registrationResult = await this.registrationService.completeRegistrationAfterVerification(
        pending.user_id,
        {
          email: pending.email,
          churchName: pending.church_name,
          firstName: pending.first_name,
          lastName: pending.last_name,
          offeringId: pending.offering_id,
          denomination: pending.denomination || undefined,
          contactNumber: pending.contact_number || undefined,
          address: pending.address || undefined,
        }
      );

      if (!registrationResult.success) {
        return {
          success: false,
          error: registrationResult.error || 'Failed to complete registration. Please contact support.',
        };
      }

      // Clean up pending registration record
      try {
        await this.pendingRegistrationRepository.deleteByUserId(pending.user_id);
      } catch (error) {
        console.error('[EmailVerificationService] Failed to delete pending registration:', error);
        // Non-fatal - continue
      }

      return {
        success: true,
        tenantId: registrationResult.tenantId,
        subdomain: registrationResult.subdomain,
        // Include data needed for potential checkout redirect
        offeringId: pending.offering_id,
        isTrial: pending.is_trial,
        isFree: pending.is_free,
        priceIsZero: pending.price_is_zero,
        email: pending.email,
        firstName: pending.first_name,
        lastName: pending.last_name,
        couponCode: pending.coupon_code,
        couponDiscountId: pending.coupon_discount_id,
        couponDurationBillingCycles: pending.coupon_duration_billing_cycles,
      };

    } catch (error) {
      console.error('[EmailVerificationService] verifyEmailAndComplete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed. Please try again.',
      };
    }
  }

  /**
   * Resend verification email
   *
   * Rate limited: max 3 attempts per 15 minutes per email address
   */
  async resendVerificationEmail(email: string): Promise<ResendVerificationResult> {
    try {
      const normalizedEmail = email.toLowerCase();

      // Check rate limit
      const rateLimit = this.checkRateLimit(normalizedEmail);
      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `Too many resend attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        };
      }

      // Find pending registration by email
      const pending = await this.pendingRegistrationRepository.findByEmail(normalizedEmail);

      if (!pending) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If this email has a pending registration, a verification email has been sent.',
        };
      }

      // Check if token has expired
      const tokenExpiry = new Date(pending.token_expires_at);
      if (tokenExpiry < new Date()) {
        // Generate new token for expired pending registrations
        const newToken = this.generateVerificationToken();

        // Delete old pending registration and create new one with fresh token
        await this.pendingRegistrationRepository.deleteByUserId(pending.user_id);
        await this.pendingRegistrationRepository.create({
          user_id: pending.user_id,
          verification_token: newToken,
          email: pending.email,
          church_name: pending.church_name,
          first_name: pending.first_name,
          last_name: pending.last_name,
          offering_id: pending.offering_id,
          denomination: pending.denomination,
          contact_number: pending.contact_number,
          address: pending.address,
          // Preserve offering type flags
          is_trial: pending.is_trial,
          is_free: pending.is_free,
          price_is_zero: pending.price_is_zero,
          // Preserve coupon/discount data
          coupon_code: pending.coupon_code,
          coupon_discount_id: pending.coupon_discount_id,
          coupon_discount_amount: pending.coupon_discount_amount,
          coupon_discounted_price: pending.coupon_discounted_price,
          coupon_duration_billing_cycles: pending.coupon_duration_billing_cycles,
        });

        // Send verification email with new token
        await this.sendVerificationEmail(
          pending.email,
          pending.first_name,
          newToken,
          pending.church_name
        );
      } else {
        // Resend with existing token
        await this.sendVerificationEmail(
          pending.email,
          pending.first_name,
          pending.verification_token,
          pending.church_name
        );
      }

      // Record the resend attempt
      this.recordResendAttempt(normalizedEmail);

      return {
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      };

    } catch (error) {
      console.error('[EmailVerificationService] resendVerificationEmail error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send verification email.',
      };
    }
  }
}
