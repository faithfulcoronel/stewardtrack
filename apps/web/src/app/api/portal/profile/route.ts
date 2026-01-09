import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import { authUtils } from "@/utils/authUtils";
import { tenantUtils } from "@/utils/tenantUtils";
import type { MemberProfileRepository } from "@/repositories/memberProfile.repository";
import type { UserMemberLinkRepository } from "@/repositories/userMemberLink.repository";
import type { IMemberRepository } from "@/repositories/member.repository";

/**
 * GET /api/portal/profile
 * Get the authenticated user's own member profile
 */
export async function GET() {
  try {
    const user = await authUtils.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 });
    }

    const userMemberLinkRepo = container.get<UserMemberLinkRepository>(
      TYPES.UserMemberLinkRepository
    );
    const memberProfileRepo = container.get<MemberProfileRepository>(
      TYPES.IMemberProfileRepository
    );

    // Get the member linked to this user
    const linkedMember = await userMemberLinkRepo.getMemberByUserId(
      user.id,
      tenantId
    );

    if (!linkedMember) {
      return NextResponse.json(
        { error: "No member profile linked to this user" },
        { status: 404 }
      );
    }

    // Get full member profile
    const memberProfiles = await memberProfileRepo.fetchMembers({
      memberId: linkedMember.id,
      tenantId,
      limit: 1,
    });

    if (memberProfiles.length === 0) {
      return NextResponse.json(
        { error: "Member profile not found" },
        { status: 404 }
      );
    }

    const member = memberProfiles[0];

    // Transform to API response format (filtering visible fields for members)
    const response = {
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      preferredName: member.preferred_name,
      photoUrl: member.profile_picture_url,
      email: member.email,
      phone: member.contact_number,
      preferredContact: member.preferred_contact_method,
      address: {
        street: member.address_street,
        city: member.address_city,
        state: member.address_state,
        postalCode: member.address_postal_code,
      },
      birthday: member.birthday,
      anniversary: member.anniversary,
      maritalStatus: member.marital_status,
      occupation: member.occupation,
      membershipCenter: member.membership_center?.name ?? null,
      membershipType: member.membership_type?.name ?? null,
      membershipDate: member.membership_date,
      household: member.household
        ? {
            id: member.household.id,
            name: member.household.name,
          }
        : null,
      serving: {
        team: member.serving_team,
        role: member.serving_role,
        schedule: member.serving_schedule,
        nextServeDate: member.next_serve_at,
      },
      groups: member.small_groups ?? [],
      spiritualGifts: member.spiritual_gifts ?? [],
      ministryInterests: member.ministry_interests ?? [],
      emergencyContact: {
        name: member.emergency_contact_name,
        phone: member.emergency_contact_phone,
        relationship: member.emergency_contact_relationship,
      },
      permissions: {
        canEditContact: true,
        canEditEmergency: true,
        canEditInterests: true,
      },
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Error fetching self profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/portal/profile
 * Update the authenticated user's own member profile (limited fields)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authUtils.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 });
    }

    const userMemberLinkRepo = container.get<UserMemberLinkRepository>(
      TYPES.UserMemberLinkRepository
    );
    const memberRepo = container.get<IMemberRepository>(
      TYPES.IMemberRepository
    );

    // Get the member linked to this user
    const linkedMember = await userMemberLinkRepo.getMemberByUserId(
      user.id,
      tenantId
    );

    if (!linkedMember) {
      return NextResponse.json(
        { error: "No member profile linked to this user" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Filter to only allowed fields for self-edit
    const updates: Record<string, unknown> = {};

    if (body.preferredName !== undefined) {
      updates.preferred_name = body.preferredName;
    }
    if (body.email !== undefined) {
      updates.email = body.email;
    }
    if (body.phone !== undefined) {
      updates.contact_number = body.phone;
    }
    if (body.preferredContact !== undefined) {
      updates.preferred_contact_method = body.preferredContact;
    }
    if (body.address !== undefined) {
      updates.address_street = body.address.street;
      updates.address_city = body.address.city;
      updates.address_state = body.address.state;
      updates.address_postal_code = body.address.postalCode;
    }
    if (body.birthday !== undefined) {
      updates.birthday = body.birthday;
    }
    if (body.anniversary !== undefined) {
      updates.anniversary = body.anniversary;
    }
    if (body.emergencyContact !== undefined) {
      updates.emergency_contact_name = body.emergencyContact.name;
      updates.emergency_contact_phone = body.emergencyContact.phone;
      updates.emergency_contact_relationship =
        body.emergencyContact.relationship;
    }
    if (body.ministryInterests !== undefined) {
      updates.ministry_interests = body.ministryInterests;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update the member
    const updated = await memberRepo.update(linkedMember.id, updates);

    return NextResponse.json({
      data: { id: updated.id },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating self profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
