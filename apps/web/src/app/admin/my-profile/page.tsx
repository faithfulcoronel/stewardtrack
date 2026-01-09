/**
 * My Profile Page (Self-Service)
 *
 * Allows authenticated users to view and edit their own member profile.
 * Uses the same admin layout as other admin pages for consistent UX.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import { authUtils } from "@/utils/authUtils";
import { tenantUtils } from "@/utils/tenantUtils";
import type { MemberProfileRepository } from "@/repositories/memberProfile.repository";
import type { UserMemberLinkRepository } from "@/repositories/userMemberLink.repository";
import { MemberProfileHeader } from "@/components/dynamic/member/MemberProfileHeader";
import {
  MemberProfileCard,
  type CardDetailItem,
} from "@/components/dynamic/member/MemberProfileCard";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

async function getSelfProfile(userId: string, tenantId: string) {
  const userMemberLinkRepo = container.get<UserMemberLinkRepository>(
    TYPES.UserMemberLinkRepository
  );
  const memberProfileRepo = container.get<MemberProfileRepository>(
    TYPES.IMemberProfileRepository
  );

  // Get the member linked to this user using the repository method
  const linkedMember = await userMemberLinkRepo.getMemberByUserId(
    userId,
    tenantId
  );
  if (!linkedMember) {
    return null;
  }

  // Get full member profile with additional data
  const memberProfiles = await memberProfileRepo.fetchMembers({
    memberId: linkedMember.id,
    tenantId,
    limit: 1,
  });

  return memberProfiles.length > 0 ? memberProfiles[0] : null;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

async function ProfileContent() {
  const user = await authUtils.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/admin/my-profile");
  }

  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    redirect("/onboarding");
  }

  const member = await getSelfProfile(user.id, tenantId);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="mb-4 text-6xl">👤</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Profile Not Found
        </h2>
        <p className="text-muted-foreground max-w-md">
          Your user account is not linked to a member profile. Please contact
          the church office to set up your profile.
        </p>
      </div>
    );
  }

  // Build items for cards - filter out nulls and empty values
  const contactItems: CardDetailItem[] = [];
  if (member.email) {
    contactItems.push({ label: "Email", value: member.email });
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
    familyItems.push({ label: "Family Name", value: member.household.name });
  }

  const churchLifeItems: CardDetailItem[] = [];
  if (member.serving_team) {
    churchLifeItems.push({
      label: "Serving Team",
      value: member.serving_team,
      type: "badge",
    });
  }
  if (member.serving_role) {
    churchLifeItems.push({ label: "Role", value: member.serving_role });
  }
  if (member.next_serve_at) {
    churchLifeItems.push({
      label: "Next Serving",
      value: new Date(member.next_serve_at).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }
  if (member.small_groups?.length) {
    churchLifeItems.push({
      label: "Groups",
      value: member.small_groups.join(", "),
      type: "chips",
    });
  }
  if (member.spiritual_gifts?.length) {
    churchLifeItems.push({
      label: "Spiritual Gifts",
      value: member.spiritual_gifts.join(", "),
      type: "chips",
    });
  }
  if (member.ministry_interests?.length) {
    churchLifeItems.push({
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

  const personalItems: CardDetailItem[] = [];
  if (member.preferred_name) {
    personalItems.push({
      label: "Preferred Name",
      value: member.preferred_name,
    });
  }
  if (member.birthday) {
    personalItems.push({
      label: "Birthday",
      value: new Date(member.birthday).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      }),
      type: "date",
    });
  }
  if (member.anniversary) {
    personalItems.push({
      label: "Anniversary",
      value: new Date(member.anniversary).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      }),
      type: "date",
    });
  }
  if (member.marital_status) {
    personalItems.push({
      label: "Marital Status",
      value: member.marital_status,
      type: "badge",
    });
  }
  if (member.occupation) {
    personalItems.push({ label: "Occupation", value: member.occupation });
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <MemberProfileHeader
        member={{
          id: member.id,
          firstName: member.first_name ?? "",
          lastName: member.last_name ?? "",
          preferredName: member.preferred_name,
          photoUrl: member.profile_picture_url,
          center: member.membership_center?.name ?? null,
          membershipType: member.membership_type?.name ?? null,
          joinDate: member.membership_date,
        }}
        userPermissions={["members:edit_self"]}
        metrics={[
          ...(member.serving_team
            ? [
                {
                  id: "serving",
                  label: "Serving",
                  value: member.serving_team,
                  tone: "info" as const,
                },
              ]
            : []),
          ...(member.small_groups?.length
            ? [
                {
                  id: "groups",
                  label: "Groups",
                  value: String(member.small_groups.length),
                  tone: "positive" as const,
                },
              ]
            : []),
        ]}
      />

      {/* Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Contact Card */}
        <MemberProfileCard
          variant="contact"
          userPermissions={["members:edit_self"]}
          title="Contact Information"
          canEdit={true}
          editHref="/admin/my-profile/edit?section=contact"
          items={contactItems}
          emptyMessage="No contact information on file."
        />

        {/* Family Card */}
        <MemberProfileCard
          variant="family"
          userPermissions={["members:edit_self"]}
          title="My Family"
          canEdit={false}
          items={familyItems}
          emptyMessage="Not part of a family unit."
        />

        {/* Church Life Card */}
        <MemberProfileCard
          variant="engagement"
          userPermissions={["members:edit_self"]}
          title="Church Life"
          canEdit={true}
          editHref="/admin/my-profile/edit?section=interests"
          items={churchLifeItems}
          emptyMessage="Not yet connected to groups or serving."
        />

        {/* Emergency Contact Card */}
        <MemberProfileCard
          variant="emergency"
          userPermissions={["members:edit_self"]}
          title="Emergency Contact"
          canEdit={true}
          editHref="/admin/my-profile/edit?section=emergency"
          items={emergencyItems}
          emptyMessage="No emergency contact on file."
        />

        {/* Personal Info Card */}
        <MemberProfileCard
          variant="identity"
          userPermissions={["members:edit_self"]}
          title="Personal Information"
          canEdit={true}
          editHref="/admin/my-profile/edit?section=personal"
          className="sm:col-span-2"
          items={personalItems}
        />
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
