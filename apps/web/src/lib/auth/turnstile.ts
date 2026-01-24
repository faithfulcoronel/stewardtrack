/**
 * Cloudflare Turnstile CAPTCHA verification utility
 *
 * This module provides server-side verification of Turnstile tokens.
 * Used across authentication, registration, and public forms.
 */

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  /** Error codes from Cloudflare */
  errorCodes?: string[];
}

/**
 * Verify a Cloudflare Turnstile CAPTCHA token server-side.
 *
 * @param token - The Turnstile response token from the client
 * @param remoteIp - Optional remote IP address for additional verification
 * @returns Verification result with success status and optional error message
 *
 * @example
 * ```ts
 * const result = await verifyTurnstileToken(token);
 * if (!result.success) {
 *   return { error: result.error };
 * }
 * ```
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If no secret key is configured, skip verification (development mode)
  if (!secretKey) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY not configured, skipping verification');
    return { success: true };
  }

  // Validate token is provided
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      success: false,
      error: 'Please complete the security verification.',
    };
  }

  try {
    const formData = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    // Include remote IP if provided for stricter verification
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      console.error('[Turnstile] API request failed:', response.status);
      return {
        success: false,
        error: 'Security verification service unavailable. Please try again.',
      };
    }

    const result = await response.json();

    if (!result.success) {
      console.error('[Turnstile] Verification failed:', result['error-codes']);

      // Map Cloudflare error codes to user-friendly messages
      const errorCodes = result['error-codes'] || [];
      let errorMessage = 'Security verification failed. Please try again.';

      if (errorCodes.includes('timeout-or-duplicate')) {
        errorMessage = 'Security check expired. Please refresh and try again.';
      } else if (errorCodes.includes('invalid-input-response')) {
        errorMessage = 'Invalid security response. Please try again.';
      }

      return {
        success: false,
        error: errorMessage,
        errorCodes,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Turnstile] Verification error:', error);
    return {
      success: false,
      error: 'Security verification failed. Please try again.',
    };
  }
}

/**
 * Check if Turnstile is configured (has a secret key)
 */
export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}
