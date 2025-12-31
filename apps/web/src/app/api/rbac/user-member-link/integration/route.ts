import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

// GET /api/rbac/user-member-link/integration - Get RBAC integration status for user-member links
export async function GET(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    // Get current user's effective permissions
    const userPermissions = await rbacService.getUserEffectivePermissions(user.id, tenantId);

    // Check if user has required permissions for user-member linking
    const requiredPermissions = [
      'user_management.link_members',
      'member_management.create_invitations',
      'user_management.view_audit'
    ];

    const hasRequiredPermissions = requiredPermissions.every(permission =>
      userPermissions.some(p => p.code === permission)
    );

    // Get user's roles and check for delegation permissions
    const userRoles = await rbacService.getUserRoles(user.id, tenantId);
    const isDelegatedAdmin = userRoles.some(role =>
      role.scope === 'delegated' || role.scope === 'campus' || role.scope === 'ministry'
    );

    // Get linking stats if user has access
    let linkingStats = null;
    if (hasRequiredPermissions) {
      try {
        linkingStats = await userMemberLinkService.getLinkingStats(tenantId);
      } catch (error) {
        console.error('Error fetching linking stats:', error);
      }
    }

    // Check if user can access current member profile (if linked)
    let linkedMember = null;
    try {
      linkedMember = await userMemberLinkService.getMemberByUserId(user.id, tenantId);
    } catch (error) {
      // User may not have a linked member profile
    }

    return NextResponse.json({
      user_permissions: {
        has_required_permissions: hasRequiredPermissions,
        missing_permissions: requiredPermissions.filter(permission =>
          !userPermissions.some(p => p.code === permission)
        ),
        effective_permissions: userPermissions.map(p => p.code)
      },
      role_context: {
        user_roles: userRoles.map(role => ({
          id: role.id,
          name: role.name,
          scope: role.scope,
          is_delegatable: role.is_delegatable
        })),
        is_delegated_admin: isDelegatedAdmin,
        can_manage_links: hasRequiredPermissions
      },
      member_context: {
        is_linked: !!linkedMember,
        linked_member: linkedMember ? {
          id: linkedMember.id,
          first_name: linkedMember.first_name,
          last_name: linkedMember.last_name,
          email: linkedMember.email,
          linked_at: linkedMember.linked_at
        } : null
      },
      system_stats: linkingStats ? {
        total_members: linkingStats.total_members,
        linked_members: linkingStats.linked_members,
        linking_percentage: linkingStats.linking_percentage,
        recent_links_count: linkingStats.recent_links_count
      } : null,
      rbac_integration: {
        version: '1.0.0',
        features: [
          'user_member_linking',
          'member_invitations',
          'audit_logging',
          'delegation_support',
          'role_based_access'
        ],
        security_features: [
          'conflict_detection',
          'audit_trail',
          'rate_limiting',
          'token_based_invitations',
          'expiration_management'
        ]
      }
    });
  } catch (error) {
    console.error('Error checking RBAC integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/rbac/user-member-link/integration - Test RBAC integration with user-member linking
export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const { test_type } = body;

    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const results: Record<string, any> = {
      test_type,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      tenant_id: tenantId
    };

    switch (test_type) {
      case 'permission_check':
        // Test permission checking integration
        const permissions = await rbacService.getUserEffectivePermissions(user.id, tenantId);
        const linkingPermissions = permissions.filter(p =>
          p.code.includes('user_management') || p.code.includes('member_management')
        );

        results.permission_test = {
          total_permissions: permissions.length,
          linking_related_permissions: linkingPermissions.length,
          permissions: linkingPermissions.map(p => ({
            code: p.code,
            name: p.name,
            module: p.module
          }))
        };
        break;

      case 'delegation_check':
        // Test delegation functionality
        const delegatedContext = await rbacService.getDelegatedContext(user.id, tenantId);

        results.delegation_test = {
          has_delegation_context: !!delegatedContext,
          delegation_scope: delegatedContext?.scope,
          allowed_roles: delegatedContext?.allowed_roles || [],
          can_delegate_links: !!delegatedContext
        };

        if (delegatedContext) {
          // Test getting users in delegated scope
          const delegatedUsers = await rbacService.getUsersInDelegatedScope(delegatedContext);
          results.delegation_test.delegated_users_count = delegatedUsers.length;
        }
        break;

      case 'audit_integration':
        // Test audit logging integration
        const auditLogs = await userMemberLinkService.getAuditTrail(
          tenantId,
          10,
          0,
          {
            date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
          }
        );

        const rbacAuditLogs = await rbacService.getAuditLogs(tenantId, 10, 0);

        results.audit_test = {
          user_member_audit_entries: auditLogs.length,
          rbac_audit_entries: rbacAuditLogs.length,
          recent_activity: auditLogs.slice(0, 3).map(entry => ({
            action: entry.action,
            user_email: entry.user_email,
            member_name: entry.member_name,
            created_at: entry.created_at
          }))
        };
        break;

      case 'role_assignment_integration':
        // Test role assignment with member linking
        const userRoles = await rbacService.getUserRoles(user.id, tenantId);
        const linkedMember = await userMemberLinkService.getMemberByUserId(user.id, tenantId);

        results.role_assignment_test = {
          user_has_roles: userRoles.length > 0,
          user_is_linked: !!linkedMember,
          roles: userRoles.map(role => ({
            name: role.name,
            scope: role.scope,
            is_delegatable: role.is_delegatable
          })),
          member_profile: linkedMember ? {
            name: `${linkedMember.first_name} ${linkedMember.last_name}`,
            linked_at: linkedMember.linked_at
          } : null,
          integration_status: 'linked_user_with_roles'
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        );
    }

    // Log the test to RBAC audit system
    await rbacService.createAuditLog({
      tenant_id: tenantId,
      table_name: 'rbac_integration_test',
      operation: 'SYSTEM',
      user_id: user.id,
      new_values: {
        test_type,
        results: results
      },
      security_impact: 'low',
      action_label: `RBAC_INTEGRATION_TEST_${test_type.toUpperCase()}`,
      notes: `Integration test performed for user-member linking system`
    });

    results.test_status = 'completed';
    results.success = true;

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error testing RBAC integration:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        test_status: 'failed',
        success: false
      },
      { status: 500 }
    );
  }
}