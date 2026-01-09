/**
 * Member Profile View Page (Card-Based Layout)
 *
 * Modern, mobile-first card-based profile view for admin/staff.
 * Shows comprehensive member information with permission-based visibility.
 *
 * SECURITY: Protected by AccessGate requiring members:view or members:edit permission.
 * VISIBILITY: Field/card visibility controlled by user's actual permissions using the gate framework.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";

import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { MemberProfileRepository } from "@/repositories/memberProfile.repository";
import { getUserPermissionCodes } from "@/lib/rbac/permissionHelpers";

import { Skeleton } from "@/components/ui/skeleton";
import {
  MemberProfileHeader,
  type MetricItem,
} from "@/components/dynamic/member/MemberProfileHeader";
import {
  MemberProfileCard,
  type CardDetailItem,
} from "@/components/dynamic/member/MemberProfileCard";
import { MemberCareSummaryCard } from "@/components/dynamic/member/MemberCareSummaryCard";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  memberId: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
}

export const metadata: Metadata = {
  title: "Member Profile | StewardTrack",
};

export const dynamic = "force-dynamic";

// UUID v4 regex pattern
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex gap-4">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

async function MemberProfileContent({ memberId }: { memberId: string }) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  if (!userId || !tenantId) {
    redirect("/auth/login");
  }

  // Get user's actual permissions using the gate framework
  const userPermissions = await getUserPermissionCodes(userId, tenantId);

  // Fetch member profile
  const memberProfileRepo = container.get<MemberProfileRepository>(
    TYPES.IMemberProfileRepository
  );
  const members = await memberProfileRepo.fetchMembers({
    memberId,
    tenantId,
    limit: 1,
  });

  if (!members.length) {
    notFound();
  }

  const member = members[0];

  // Permission-based visibility checks using inline array checks
  const hasAny = (perms: string[]) => perms.some(p => userPermissions.includes(p));

  const _canViewSensitive = hasAny(["members:view-sensitive", "members:manage"]);
  const canEditMembers = hasAny(["members:edit", "members:manage"]);
  const canViewCare = hasAny(["care:view", "members:manage"]);
  const canViewDiscipleship = hasAny(["discipleship:view", "members:manage"]);
  const canViewAdmin = hasAny(["members:manage", "admin:full", "tenant:admin"]);

  // Card-level edit permission check
  const canEditSelf = hasAny(["members:edit_self", "members:edit", "members:manage"]);
  const canEditCard = (category: string) => {
    // Self-editable categories
    if (["contact", "emergency", "engagement"].includes(category)) {
      return canEditSelf;
    }
    // Admin-only categories
    if (category === "admin") {
      return canViewAdmin;
    }
    // Default: requires edit permission
    return canEditMembers;
  };

  // Build metrics for header
  const metrics: MetricItem[] = [];
  if (member.serving_team) {
    metrics.push({
      id: "serving",
      label: "Serving Team",
      value: member.serving_team,
      tone: "info",
    });
  }
  if (member.small_groups?.length) {
    metrics.push({
      id: "groups",
      label: "Groups",
      value: String(member.small_groups.length),
      tone: "positive",
    });
  }
  if (member.membership_date) {
    const years = Math.floor(
      (Date.now() - new Date(member.membership_date).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    );
    metrics.push({
      id: "tenure",
      label: "Member Since",
      value: years > 0 ? `${years} years` : "New",
      tone: "neutral",
    });
  }

  // Build card items
  const identityItems: CardDetailItem[] = [];
  if (member.preferred_name) {
    identityItems.push({
      label: "Preferred Name",
      value: member.preferred_name,
    });
  }
  if (member.birthday) {
    identityItems.push({
      label: "Birthday",
      value: new Date(member.birthday).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      type: "date",
    });
  }
  if (member.marital_status) {
    identityItems.push({
      label: "Marital Status",
      value: member.marital_status,
      type: "badge",
    });
  }
  if (member.anniversary) {
    identityItems.push({
      label: "Anniversary",
      value: new Date(member.anniversary).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      type: "date",
    });
  }
  if (member.occupation) {
    identityItems.push({ label: "Occupation", value: member.occupation });
  }

  const contactItems: CardDetailItem[] = [];
  if (member.email) {
    contactItems.push({
      label: "Email",
      value: member.email,
      type: "link",
      href: `mailto:${member.email}`,
    });
  }
  if (member.contact_number) {
    contactItems.push({ label: "Phone", value: member.contact_number });
  }
  if (member.preferred_contact_method) {
    contactItems.push({
      label: "Preferred Contact",
      value: member.preferred_contact_method,
      type: "badge",
    });
  }
  const addressParts = [
    member.address_street,
    member.address_city,
    member.address_state,
    member.address_postal_code,
  ].filter(Boolean);
  if (addressParts.length > 0) {
    contactItems.push({ label: "Address", value: addressParts.join(", ") });
  }

  const familyItems: CardDetailItem[] = [];
  if (member.household?.name) {
    familyItems.push({
      label: "Family",
      value: member.household.name,
      type: "link",
      href: member.household.id
        ? `/admin/community/families/${member.household.id}`
        : undefined,
    });
  }

  const engagementItems: CardDetailItem[] = [];
  if (member.serving_team) {
    engagementItems.push({
      label: "Serving Team",
      value: member.serving_team,
      type: "badge",
    });
  }
  if (member.serving_role) {
    engagementItems.push({ label: "Role", value: member.serving_role });
  }
  if (member.serving_schedule) {
    engagementItems.push({
      label: "Schedule",
      value: member.serving_schedule,
    });
  }
  if (member.next_serve_at) {
    engagementItems.push({
      label: "Next Serving",
      value: new Date(member.next_serve_at).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      type: "date",
    });
  }
  if (member.small_groups?.length) {
    engagementItems.push({
      label: "Groups",
      value: member.small_groups.join(", "),
      type: "chips",
    });
  }
  if (member.spiritual_gifts?.length) {
    engagementItems.push({
      label: "Spiritual Gifts",
      value: member.spiritual_gifts.join(", "),
      type: "chips",
    });
  }
  if (member.ministry_interests?.length) {
    engagementItems.push({
      label: "Ministry Interests",
      value: member.ministry_interests.join(", "),
      type: "chips",
    });
  }

  const emergencyItems: CardDetailItem[] = [];
  if (member.emergency_contact_name) {
    emergencyItems.push({
      label: "Name",
      value: member.emergency_contact_name,
    });
  }
  if (member.emergency_contact_phone) {
    emergencyItems.push({
      label: "Phone",
      value: member.emergency_contact_phone,
    });
  }
  if (member.emergency_contact_relationship) {
    emergencyItems.push({
      label: "Relationship",
      value: member.emergency_contact_relationship,
      type: "badge",
    });
  }

  const adminItems: CardDetailItem[] = [];
  if (member.membership_stage?.name) {
    adminItems.push({
      label: "Stage",
      value: member.membership_stage.name,
      type: "badge",
      variant:
        member.membership_stage.name === "Active"
          ? "success"
          : member.membership_stage.name === "Inactive"
            ? "warning"
            : "secondary",
    });
  }
  if (member.membership_type?.name) {
    adminItems.push({
      label: "Membership Type",
      value: member.membership_type.name,
    });
  }
  if (member.membership_center?.name) {
    adminItems.push({
      label: "Center",
      value: member.membership_center.name,
    });
  }
  if (member.membership_date) {
    adminItems.push({
      label: "Member Since",
      value: new Date(member.membership_date).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      type: "date",
    });
  }
  adminItems.push({ label: "Member ID", value: member.id });

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <MemberProfileHeader
        member={{
          id: member.id,
          firstName: member.first_name ?? "",
          lastName: member.last_name ?? "",
          preferredName: member.preferred_name,
          photoUrl: member.profile_picture_url,
          stage: member.membership_stage?.name,
          stageVariant:
            member.membership_stage?.name === "Active"
              ? "success"
              : member.membership_stage?.name === "Inactive"
                ? "warning"
                : "neutral",
          center: member.membership_center?.name ?? null,
          membershipType: member.membership_type?.name ?? null,
          joinDate: member.membership_date,
        }}
        userPermissions={userPermissions}
        metrics={metrics}
        actions={
          canEditMembers
            ? [
                {
                  id: "edit",
                  label: "Edit Member",
                  href: `/admin/community/members/${member.id}/manage`,
                  variant: "default",
                  icon: <Pencil className="h-4 w-4" />,
                },
              ]
            : []
        }
        backHref="/admin/community/members"
        backLabel="Back to Members"
      />

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Identity Card */}
        <MemberProfileCard
          variant="identity"
          userPermissions={userPermissions}
          title="Personal Information"
          canEdit={canEditCard("identity")}
          editHref={`/admin/community/members/${member.id}/manage?section=identity`}
          items={identityItems}
          emptyMessage="No personal information on file."
        />

        {/* Contact Card */}
        <MemberProfileCard
          variant="contact"
          userPermissions={userPermissions}
          title="Contact Information"
          canEdit={canEditCard("contact")}
          editHref={`/admin/community/members/${member.id}/manage?section=contact`}
          items={contactItems}
          emptyMessage="No contact information on file."
        />

        {/* Family Card */}
        <MemberProfileCard
          variant="family"
          userPermissions={userPermissions}
          title="Family & Household"
          canEdit={canEditCard("family")}
          editHref={`/admin/community/members/${member.id}/manage?section=family`}
          items={familyItems}
          emptyMessage="Not part of a family unit."
        />

        {/* Engagement Card - spans 2 columns on larger screens */}
        <MemberProfileCard
          variant="engagement"
          userPermissions={userPermissions}
          title="Serving & Groups"
          canEdit={canEditCard("engagement")}
          editHref={`/admin/community/members/${member.id}/manage?section=engagement`}
          items={engagementItems}
          emptyMessage="Not yet connected to groups or serving."
          className="lg:col-span-2"
        />

        {/* Emergency Contact Card */}
        <MemberProfileCard
          variant="emergency"
          userPermissions={userPermissions}
          title="Emergency Contact"
          canEdit={canEditCard("emergency")}
          editHref={`/admin/community/members/${member.id}/manage?section=care`}
          items={emergencyItems}
          emptyMessage="No emergency contact on file."
        />

        {/* Care & Discipleship Summary - Permission gated */}
        {(canViewCare || canViewDiscipleship) && (
          <MemberCareSummaryCard
            memberId={member.id}
            userPermissions={userPermissions}
            className="lg:col-span-2"
          />
        )}

        {/* Admin Card - Permission gated */}
        {canViewAdmin && (
          <MemberProfileCard
            variant="admin"
            userPermissions={userPermissions}
            title="Administrative Details"
            canEdit={canEditCard("admin")}
            editHref={`/admin/community/members/${member.id}/manage?section=admin`}
            items={adminItems}
          />
        )}
      </div>
    </div>
  );
}

export default async function MemberProfileViewPage({ params }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  // Page-level access gate - requires at least members:view permission
  const gate = Gate.withPermission(["members:view", "members:edit"], "any", {
    fallbackPath: "/unauthorized?reason=members_access",
  });

  const resolvedParams = await Promise.resolve(params);

  // Validate UUID format before rendering
  if (!isValidUUID(resolvedParams.memberId)) {
    notFound();
  }

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <Suspense fallback={<ProfileSkeleton />}>
        <MemberProfileContent memberId={resolvedParams.memberId} />
      </Suspense>
    </ProtectedPage>
  );
}
