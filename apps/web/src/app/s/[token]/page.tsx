/**
 * Generic Short URL Director (Receptionist Pattern)
 *
 * Central routing point for all short URLs in the application.
 * Decodes the token, determines entity type, validates access,
 * and routes to the appropriate view.
 *
 * Supported entity types:
 * - member: Routes to member profile
 * - family: Routes to family view
 * - event: Routes to event details
 * - group: Routes to group details
 * - donation: Routes to donation record
 * - care: Routes to care plan
 * - discipleship: Routes to discipleship plan
 * - goal: Routes to goal details
 * - invitation: Routes to invitation handler
 *
 * Routing logic for each entity:
 * 1. Validate token and extract entity type + ID
 * 2. Check authentication (redirect to login if needed)
 * 3. Verify entity exists in tenant
 * 4. Check user permissions for entity type
 * 5. Route to appropriate view
 */

import { redirect, notFound } from "next/navigation";
import {
  decodeShortUrlToken,
  type EntityType,
} from "@/lib/tokens/shortUrlTokens";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { getUserPermissionCodes } from "@/lib/rbac/permissionHelpers";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { UserMemberLinkRepository } from "@/repositories/userMemberLink.repository";
import type { MemberProfileRepository } from "@/repositories/memberProfile.repository";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  token: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
}

export const dynamic = "force-dynamic";

/**
 * Permission requirements for each entity type
 */
const ENTITY_PERMISSIONS: Record<EntityType, string[]> = {
  member: ["members:view", "members:manage", "admin:full", "tenant:admin"],
  family: ["households:view", "households:manage", "members:view", "admin:full", "tenant:admin"],
  event: ["events:view", "events:manage", "admin:full", "tenant:admin"],
  group: ["groups:view", "groups:manage", "admin:full", "tenant:admin"],
  donation: ["donations:view", "finance:view", "admin:full", "tenant:admin"],
  care: ["careplans:view", "careplans:manage", "admin:full", "tenant:admin"],
  discipleship: ["discipleshipplans:view", "discipleshipplans:manage", "admin:full", "tenant:admin"],
  goal: ["goals:view", "goals:manage", "planning:view", "admin:full", "tenant:admin"],
  invitation: ["members:invite", "members:manage", "admin:full", "tenant:admin"],
};

/**
 * Route patterns for each entity type
 */
const ENTITY_ROUTES: Record<EntityType, (id: string) => string> = {
  member: (id) => `/admin/community/members/${id}/view`,
  family: (id) => `/admin/community/families/${id}`,
  event: (id) => `/admin/community/planning/${id}`,
  group: (id) => `/admin/community/groups/${id}`,
  donation: (id) => `/admin/finance/donations/${id}`,
  care: (id) => `/admin/community/care-plans/${id}`,
  discipleship: (id) => `/admin/community/discipleship-plans/${id}`,
  goal: (id) => `/admin/community/planning/goals/${id}`,
  invitation: (id) => `/invitation/${id}`,
};

/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((p) => userPermissions.includes(p));
}

/**
 * Handle member-specific routing (includes self-check)
 */
async function handleMemberRouting(
  memberId: string,
  userId: string,
  tenantId: string,
  userPermissions: string[],
  token: string
): Promise<string> {
  // Verify member exists
  const memberProfileRepo = container.get<MemberProfileRepository>(
    TYPES.IMemberProfileRepository
  );
  const members = await memberProfileRepo.fetchMembers({
    memberId,
    tenantId,
    limit: 1,
  });

  if (!members.length) {
    return "notfound";
  }

  // Check if user is viewing their own profile
  const userMemberLinkRepo = container.get<UserMemberLinkRepository>(
    TYPES.UserMemberLinkRepository
  );
  const linkedMember = await userMemberLinkRepo.getMemberByUserId(userId, tenantId);

  if (linkedMember?.id === memberId) {
    return "/admin/my-profile";
  }

  // Check permissions for viewing other members
  if (!hasAnyPermission(userPermissions, ENTITY_PERMISSIONS.member)) {
    return "unauthorized";
  }

  return ENTITY_ROUTES.member(memberId);
}

export default async function ShortUrlDirector({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const { token } = resolvedParams;

  if (!token) {
    notFound();
  }

  // Step 1: Decode the token
  const decoded = decodeShortUrlToken(token);

  if (!decoded) {
    notFound();
  }

  const { type: entityType, id: entityId } = decoded;

  // Step 2: Check authentication
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  if (!userId || !tenantId) {
    // Not authenticated - redirect to login with return URL
    redirect(`/login?redirect=/s/${token}`);
  }

  // Step 3: Get user permissions
  const userPermissions = await getUserPermissionCodes(userId, tenantId);

  // Step 4: Route based on entity type
  let targetRoute: string;

  switch (entityType) {
    case "member": {
      // Members have special handling for self-view
      targetRoute = await handleMemberRouting(
        entityId,
        userId,
        tenantId,
        userPermissions,
        token
      );
      break;
    }

    case "invitation": {
      // Invitations don't require authentication - anyone with the link can view
      targetRoute = ENTITY_ROUTES.invitation(entityId);
      break;
    }

    default: {
      // Standard permission check for other entity types
      const requiredPermissions = ENTITY_PERMISSIONS[entityType];
      if (!hasAnyPermission(userPermissions, requiredPermissions)) {
        targetRoute = "unauthorized";
      } else {
        targetRoute = ENTITY_ROUTES[entityType](entityId);
      }
    }
  }

  // Step 5: Handle special routes
  if (targetRoute === "notfound") {
    notFound();
  }

  if (targetRoute === "unauthorized") {
    redirect(`/unauthorized?reason=${entityType}_access`);
  }

  // Step 6: Redirect to the target route
  redirect(targetRoute);
}
