import { NextRequest, NextResponse } from 'next/server';
import { renderErrorReportEmail } from '@/emails/service/EmailTemplateService';
import { createClient } from '@/lib/supabase/server';
import {
  sanitizeErrorMessage,
  sanitizeStackTrace,
  sanitizeComponentStack,
} from '@/components/error/sanitizeError';

const SUPPORT_EMAIL = 'support@cortantechsolutions.com';

interface ErrorReportRequest {
  errorMessage: string;
  stackTrace?: string;
  componentStack?: string;
  userFeedback?: string;
  errorUrl?: string;
  userAgent?: string;
  errorId?: string;
}

/**
 * Sanitize error message for email subject line
 * Removes sensitive patterns and truncates for subject line use
 */
function sanitizeSubjectLine(message: string, maxLength = 50): string {
  const sanitized = sanitizeErrorMessage(message);
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength) + '...';
  }
  return sanitized;
}

/**
 * POST /api/error-report
 * Submit an error report via email to support
 *
 * Security notes:
 * - Email to support contains full details (they need to investigate)
 * - Database stores sanitized version (to prevent storing secrets)
 * - Email subject is sanitized (visible in email clients/logs)
 */
export async function POST(request: NextRequest) {
  try {
    const body: ErrorReportRequest = await request.json();

    // Validate required fields
    if (!body.errorMessage) {
      return NextResponse.json(
        { success: false, error: 'Error message is required' },
        { status: 400 }
      );
    }

    // Try to get user context (optional - error reporting should work even if not authenticated)
    let userEmail: string | undefined;
    let userName: string | undefined;
    let tenantName: string | undefined;

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        userEmail = user.email;

        // Try to get profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined;
        }

        // Try to get tenant info
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('tenant_id, tenants(name)')
          .eq('user_id', user.id)
          .single();

        if (tenantUser?.tenants) {
          tenantName = (tenantUser.tenants as { name: string }).name;
        }
      }
    } catch {
      // User context is optional, continue without it
    }

    // Generate timestamp
    const timestamp = new Date().toISOString();

    // Render the email template with FULL details for support team
    // Support team needs complete information to investigate issues
    const emailHtml = await renderErrorReportEmail({
      errorMessage: body.errorMessage,
      stackTrace: body.stackTrace,
      componentStack: body.componentStack,
      userFeedback: body.userFeedback,
      userEmail,
      userName,
      tenantName,
      errorUrl: body.errorUrl,
      userAgent: body.userAgent,
      timestamp,
      errorId: body.errorId,
    });

    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@stewardtrack.com';

    if (!resendApiKey) {
      console.error('[POST /api/error-report] RESEND_API_KEY not configured');
      // Still return success to not block the user, but log the error
      return NextResponse.json({
        success: true,
        message: 'Error report received (email delivery not configured)',
      });
    }

    // Sanitize subject line (visible in email clients and logs)
    const sanitizedSubject = sanitizeSubjectLine(body.errorMessage);

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `StewardTrack Error Reports <${fromEmail}>`,
        to: [SUPPORT_EMAIL],
        subject: `[Error Report] ${sanitizedSubject}${body.errorId ? ` (${body.errorId})` : ''}`,
        html: emailHtml,
        reply_to: userEmail || undefined,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('[POST /api/error-report] Failed to send email:', errorData);
      // Return success anyway - we don't want to show error to user
      return NextResponse.json({
        success: true,
        message: 'Error report received',
      });
    }

    // Also log the error to database if possible
    // Database stores SANITIZED version to prevent storing secrets
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Get tenant ID if user is authenticated
      let tenantId: string | undefined;
      if (user) {
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();
        tenantId = tenantUser?.tenant_id;
      }

      // Sanitize all error data before storing in database
      const sanitizedMessage = sanitizeErrorMessage(body.errorMessage);
      const sanitizedStack = body.stackTrace ? sanitizeStackTrace(body.stackTrace) : undefined;
      const sanitizedComponentStack = body.componentStack
        ? sanitizeComponentStack(body.componentStack)
        : undefined;

      await supabase.from('error_logs').insert({
        message: sanitizedMessage,
        stack: sanitizedStack,
        context: JSON.stringify({
          componentStack: sanitizedComponentStack,
          userFeedback: body.userFeedback, // User feedback is safe - provided by user
          errorUrl: body.errorUrl, // URL pathname is safe
          errorId: body.errorId,
          // Note: userAgent excluded from DB to reduce data stored
        }),
        tenant_id: tenantId,
        created_by: user?.id,
      });
    } catch {
      // Database logging is optional, don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: 'Error report sent successfully',
    });
  } catch (error) {
    console.error('[POST /api/error-report] Error:', error);
    // Still return success to not confuse users
    return NextResponse.json({
      success: true,
      message: 'Error report received',
    });
  }
}
