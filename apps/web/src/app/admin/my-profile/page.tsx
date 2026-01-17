/**
 * My Profile Page (Self-Service)
 *
 * Allows authenticated users to view and edit their own member profile.
 * Features a Facebook-style cover photo and profile picture layout.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import { authUtils } from "@/utils/authUtils";
import { tenantUtils } from "@/utils/tenantUtils";
import type { MemberProfileRepository } from "@/repositories/memberProfile.repository";
import type { UserMemberLinkRepository } from "@/repositories/userMemberLink.repository";
import { MyProfileContent } from "./MyProfileContent";
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
      {/* Cover Photo Skeleton */}
      <div className="relative">
        <Skeleton
          className="w-full rounded-xl md:rounded-2xl"
          style={{ minHeight: '180px', height: '22vh', maxHeight: '240px' }}
        />
        <div className="absolute -bottom-12 md:-bottom-14 left-4 md:left-6 z-20">
          <Skeleton className="h-24 w-24 md:h-28 md:w-28 rounded-full ring-4 ring-background" />
        </div>
      </div>
      {/* Profile Info Skeleton */}
      <div className="pt-10 md:pt-12 px-4 md:px-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      {/* Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 pt-4">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

async function ProfileData() {
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

  // Build address string
  const addressParts = [
    member.address_city,
    member.address_state,
  ].filter(Boolean);
  const location = addressParts.length > 0 ? addressParts.join(", ") : null;

  return (
    <MyProfileContent
      member={{
        id: member.id,
        firstName: member.first_name ?? "",
        lastName: member.last_name ?? "",
        preferredName: member.preferred_name,
        photoUrl: member.profile_picture_url,
        coverPhotoUrl: member.cover_photo_url ?? null,
        email: member.email,
        phone: member.contact_number,
        center: member.membership_center?.name ?? null,
        membershipType: member.membership_type?.name ?? null,
        joinDate: member.membership_date,
        location,
        // Additional fields for cards
        addressStreet: member.address_street,
        addressCity: member.address_city,
        addressState: member.address_state,
        addressPostalCode: member.address_postal_code,
        preferredContactMethod: member.preferred_contact_method,
        householdName: member.household?.name,
        servingTeam: member.serving_team,
        servingRole: member.serving_role,
        nextServeAt: member.next_serve_at,
        smallGroups: member.small_groups,
        spiritualGifts: member.spiritual_gifts,
        ministryInterests: member.ministry_interests,
        emergencyContactName: member.emergency_contact_name,
        emergencyContactPhone: member.emergency_contact_phone,
        emergencyContactRelationship: member.emergency_contact_relationship,
        birthday: member.birthday,
        anniversary: member.anniversary,
        maritalStatus: member.marital_status,
        occupation: member.occupation,
      }}
    />
  );
}

export default function MyProfilePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileData />
      </Suspense>
    </div>
  );
}
