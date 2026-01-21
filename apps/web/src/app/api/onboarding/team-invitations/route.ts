/**
 * POST /api/onboarding/team-invitations
 *
 * Creates team invitations during onboarding.
 * For each invitation:
 * 1. Creates a member record if one doesn't exist with that email
 * 2. Creates a member invitation with the assigned role
 * 3. Sends an invitation email via the notification infrastructure
 *
 * When the invitee accepts:
 * - User account is created
 * - User is linked to the member
 * - Role is automatically assigned
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { MemberService } from '@/services/MemberService';
import type { UserMemberLinkService } from '@/services/UserMemberLinkService';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { SettingService, EmailConfig } from '@/services/SettingService';
import { renderInviteEmail } from '@/emails/service/EmailTemplateService';

// ============================================================================
// Types
// ============================================================================

interface TeamInvitationRequest {
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
  role_name: string;
}

interface InvitationResult {
  email: string;
  success: boolean;
  member_id?: string;
  invitation_id?: string;
  error?: string;
}

// ============================================================================
// Email Configuration (following EmailVerificationService pattern)
// ============================================================================

interface ResolvedEmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string | null;
}

async function getEmailConfiguration(settingService: SettingService): Promise<ResolvedEmailConfig | null> {
  console.log('[TeamInvitations] Getting email configuration...');

  // Use system-level configuration (tenant_id = NULL) like EmailVerificationService
  try {
    const systemConfig: EmailConfig | null = await settingService.getSystemEmailConfig();
    console.log('[TeamInvitations] System config result:', {
      hasConfig: !!systemConfig,
      hasApiKey: !!systemConfig?.apiKey,
      hasFromEmail: !!systemConfig?.fromEmail,
      fromEmail: systemConfig?.fromEmail,
    });

    if (systemConfig && systemConfig.apiKey && systemConfig.fromEmail) {
      console.log('[TeamInvitations] Using system-level configuration');
      return {
        apiKey: systemConfig.apiKey,
        fromEmail: systemConfig.fromEmail,
        fromName: systemConfig.fromName || undefined,
        replyTo: systemConfig.replyTo,
      };
    }
  } catch (error) {
    console.error('[TeamInvitations] Failed to get system email config:', error);
  }

  // Fallback to environment variables
  const envApiKey = process.env.RESEND_API_KEY;
  const envFromEmail = process.env.RESEND_FROM_EMAIL;

  console.log('[TeamInvitations] Environment variables check:', {
    hasApiKey: !!envApiKey,
    hasFromEmail: !!envFromEmail,
  });

  if (envApiKey && envFromEmail) {
    console.log('[TeamInvitations] Using environment variable configuration');
    return {
      apiKey: envApiKey,
      fromEmail: envFromEmail,
    };
  }

  console.warn('[TeamInvitations] No email configuration available');
  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function sendInvitationEmail(
  settingService: SettingService,
  recipientEmail: string,
  recipientName: string,
  inviterName: string,
  tenantName: string,
  roleName: string,
  invitationToken: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[TeamInvitations] sendInvitationEmail called with:', {
    recipientEmail,
    recipientName,
    inviterName,
    tenantName,
    roleName,
    baseUrl,
    tokenLength: invitationToken?.length,
  });

  try {
    // Get email configuration using system config (like EmailVerificationService)
    const config = await getEmailConfiguration(settingService);

    if (!config) {
      console.error('[TeamInvitations] No email configuration available');
      return {
        success: false,
        error: 'Email service not configured. Please configure email settings in system settings.',
      };
    }

    const { apiKey, fromEmail, fromName, replyTo } = config;
    console.log('[TeamInvitations] Config loaded, fromEmail:', fromEmail);

    const invitationUrl = `${baseUrl}/join?token=${invitationToken}`;
    console.log('[TeamInvitations] Invitation URL:', invitationUrl);

    // Render the invite email template
    console.log('[TeamInvitations] Rendering invite email template...');
    const html = await renderInviteEmail({
      recipientName,
      inviterName,
      tenantName,
      roleName,
      invitationUrl,
      expiresIn: '7 days',
    });
    console.log('[TeamInvitations] Email template rendered, HTML length:', html?.length);

    // Build the "from" field with optional display name
    const fromField = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      from: fromField,
      to: recipientEmail,
      subject: `You're invited to join ${tenantName}`,
      html: html,
    };

    // Add reply-to if configured
    if (replyTo) {
      emailPayload.reply_to = replyTo;
    }

    console.log('[TeamInvitations] Sending to Resend API...', {
      from: fromField,
      to: recipientEmail,
      subject: emailPayload.subject,
    });

    // Send directly via Resend API (following EmailVerificationService pattern)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[TeamInvitations] Resend API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TeamInvitations] Resend API error:', errorText);
      return {
        success: false,
        error: `Email delivery failed: ${errorText}`,
      };
    }

    const result = await response.json();
    console.log('[TeamInvitations] Email sent successfully, provider ID:', result.id);
    return { success: true };
  } catch (error) {
    console.error('[TeamInvitations] Exception in sendInvitationEmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    // Get user's profile for inviter name
    const inviterName = user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Team Admin';

    // Parse request body
    const body = await request.json();
    const { invitations } = body as { invitations: TeamInvitationRequest[] };

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return NextResponse.json(
        { error: 'At least one invitation is required' },
        { status: 400 }
      );
    }

    if (invitations.length > 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 invitations at once' },
        { status: 400 }
      );
    }

    // Get services
    const memberService = container.get<MemberService>(TYPES.MemberService);
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);
    const settingService = container.get<SettingService>(TYPES.SettingService);

    // Get tenant info
    const tenant = await tenantRepo.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if email configuration is available (using system config)
    const emailConfig = await getEmailConfiguration(settingService);
    const emailAvailable = emailConfig !== null;
    console.log('[TeamInvitations] Email available:', emailAvailable);

    // Determine base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'https://stewardtrack.com';

    // Process each invitation
    const results: InvitationResult[] = [];

    for (const invitation of invitations) {
      try {
        // Validate required fields
        if (!invitation.email || !invitation.role_id) {
          results.push({
            email: invitation.email || 'unknown',
            success: false,
            error: 'Email and role_id are required',
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(invitation.email)) {
          results.push({
            email: invitation.email,
            success: false,
            error: 'Invalid email format',
          });
          continue;
        }

        // Check if member with this email already exists
        const { data: existingMembers } = await memberService.findAll({
          filters: {
            email: { operator: 'eq', value: invitation.email },
            tenant_id: { operator: 'eq', value: tenantId },
          },
        });

        let memberId: string;

        if (existingMembers && existingMembers.length > 0) {
          // Use existing member
          memberId = existingMembers[0].id!;
        } else {
          // Create new member
          const newMember = await memberService.create({
            first_name: invitation.first_name || invitation.email.split('@')[0],
            last_name: invitation.last_name || '',
            email: invitation.email,
            tenant_id: tenantId,
          });
          memberId = newMember.id!;
        }

        // Create member invitation with assigned role
        console.log('[TeamInvitations] Creating invitation for member:', memberId);
        const invitationResult = await userMemberLinkService.createMemberInvitation(
          {
            member_id: memberId,
            email: invitation.email,
            invitation_type: 'email',
            expires_in_days: 7,
            assigned_role_id: invitation.role_id,
            notes: `Invited during onboarding as ${invitation.role_name}`,
          },
          user.id,
          tenantId
        );

        console.log('[TeamInvitations] Invitation result:', {
          success: invitationResult.success,
          invitationId: invitationResult.invitation?.id,
          hasToken: !!invitationResult.invitation?.token,
          error: invitationResult.error,
          error_code: invitationResult.error_code,
        });

        if (!invitationResult.success) {
          results.push({
            email: invitation.email,
            success: false,
            member_id: memberId,
            error: invitationResult.error || 'Failed to create invitation',
          });
          continue;
        }

        // Send invitation email if email channel is available
        console.log('[TeamInvitations] Checking email conditions:', {
          emailAvailable,
          hasToken: !!invitationResult.invitation?.token,
          tokenValue: invitationResult.invitation?.token ? `${invitationResult.invitation.token.substring(0, 10)}...` : null,
        });

        if (emailAvailable && invitationResult.invitation?.token) {
          console.log('[TeamInvitations] Conditions met, sending invitation email to:', invitation.email);
          const emailResult = await sendInvitationEmail(
            settingService,
            invitation.email,
            invitation.first_name || invitation.email.split('@')[0],
            inviterName,
            tenant.name,
            invitation.role_name,
            invitationResult.invitation.token,
            baseUrl
          );

          if (!emailResult.success) {
            console.warn(`[TeamInvitations] Failed to send invitation email to ${invitation.email}:`, emailResult.error);
            // Don't fail the invitation, just log the warning
          }
        } else {
          console.warn('[TeamInvitations] Skipping email send - conditions not met:', {
            emailAvailable,
            hasToken: !!invitationResult.invitation?.token,
          });
        }

        results.push({
          email: invitation.email,
          success: true,
          member_id: memberId,
          invitation_id: invitationResult.invitation?.id,
        });
      } catch (error) {
        console.error(`Error processing invitation for ${invitation.email}:`, error);
        results.push({
          email: invitation.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
      results,
      emailConfigured: emailAvailable,
    });
  } catch (error) {
    console.error('Error processing team invitations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process invitations' },
      { status: 500 }
    );
  }
}
