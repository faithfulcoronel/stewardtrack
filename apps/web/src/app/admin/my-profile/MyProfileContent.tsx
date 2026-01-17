'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MyProfileHero } from '@/components/dynamic/member/MyProfileHero';
import {
  MemberProfileCard,
  type CardDetailItem,
} from '@/components/dynamic/member/MemberProfileCard';

interface MemberData {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  center?: string | null;
  membershipType?: string | null;
  joinDate?: string | null;
  location?: string | null;
  // Additional fields for cards
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  preferredContactMethod?: string | null;
  householdName?: string | null;
  servingTeam?: string | null;
  servingRole?: string | null;
  nextServeAt?: string | null;
  smallGroups?: string[] | null;
  spiritualGifts?: string[] | null;
  ministryInterests?: string[] | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  maritalStatus?: string | null;
  occupation?: string | null;
}

interface MyProfileContentProps {
  member: MemberData;
}

export function MyProfileContent({ member: initialMember }: MyProfileContentProps) {
  const router = useRouter();
  const [member, setMember] = useState(initialMember);

  const handleCoverPhotoChange = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/members/me/cover-photo', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload cover photo');
    }

    const data = await response.json();
    setMember(prev => ({ ...prev, coverPhotoUrl: data.url }));
    router.refresh();
  };

  const handleProfilePhotoChange = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/members/me/profile-photo', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload profile photo');
    }

    const data = await response.json();
    setMember(prev => ({ ...prev, photoUrl: data.url }));
    router.refresh();
  };

  // Build items for cards
  const contactItems: CardDetailItem[] = [];
  if (member.email) {
    contactItems.push({ label: 'Email', value: member.email });
  }
  if (member.phone) {
    contactItems.push({ label: 'Phone', value: member.phone });
  }
  if (member.preferredContactMethod) {
    contactItems.push({
      label: 'Preferred Contact',
      value: member.preferredContactMethod,
      type: 'badge',
    });
  }
  const addressParts = [
    member.addressStreet,
    member.addressCity,
    member.addressState,
    member.addressPostalCode,
  ].filter(Boolean);
  if (addressParts.length > 0) {
    contactItems.push({ label: 'Address', value: addressParts.join(', ') });
  }

  const familyItems: CardDetailItem[] = [];
  if (member.householdName) {
    familyItems.push({ label: 'Family Name', value: member.householdName });
  }

  const churchLifeItems: CardDetailItem[] = [];
  if (member.servingTeam) {
    churchLifeItems.push({
      label: 'Serving Team',
      value: member.servingTeam,
      type: 'badge',
    });
  }
  if (member.servingRole) {
    churchLifeItems.push({ label: 'Role', value: member.servingRole });
  }
  if (member.nextServeAt) {
    churchLifeItems.push({
      label: 'Next Serving',
      value: new Date(member.nextServeAt).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    });
  }
  if (member.smallGroups?.length) {
    churchLifeItems.push({
      label: 'Groups',
      value: member.smallGroups.join(', '),
      type: 'chips',
    });
  }
  if (member.spiritualGifts?.length) {
    churchLifeItems.push({
      label: 'Spiritual Gifts',
      value: member.spiritualGifts.join(', '),
      type: 'chips',
    });
  }
  if (member.ministryInterests?.length) {
    churchLifeItems.push({
      label: 'Ministry Interests',
      value: member.ministryInterests.join(', '),
      type: 'chips',
    });
  }

  const emergencyItems: CardDetailItem[] = [];
  if (member.emergencyContactName) {
    emergencyItems.push({
      label: 'Name',
      value: member.emergencyContactName,
    });
  }
  if (member.emergencyContactPhone) {
    emergencyItems.push({
      label: 'Phone',
      value: member.emergencyContactPhone,
    });
  }
  if (member.emergencyContactRelationship) {
    emergencyItems.push({
      label: 'Relationship',
      value: member.emergencyContactRelationship,
      type: 'badge',
    });
  }

  const personalItems: CardDetailItem[] = [];
  if (member.preferredName) {
    personalItems.push({
      label: 'Preferred Name',
      value: member.preferredName,
    });
  }
  if (member.birthday) {
    personalItems.push({
      label: 'Birthday',
      value: new Date(member.birthday).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      }),
      type: 'date',
    });
  }
  if (member.anniversary) {
    personalItems.push({
      label: 'Anniversary',
      value: new Date(member.anniversary).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      }),
      type: 'date',
    });
  }
  if (member.maritalStatus) {
    personalItems.push({
      label: 'Marital Status',
      value: member.maritalStatus,
      type: 'badge',
    });
  }
  if (member.occupation) {
    personalItems.push({ label: 'Occupation', value: member.occupation });
  }

  return (
    <div className="space-y-6">
      {/* Facebook-style Profile Hero */}
      <MyProfileHero
        member={{
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          preferredName: member.preferredName,
          photoUrl: member.photoUrl,
          coverPhotoUrl: member.coverPhotoUrl,
          email: member.email,
          phone: member.phone,
          center: member.center,
          membershipType: member.membershipType,
          joinDate: member.joinDate,
          location: member.location,
        }}
        canEdit={true}
        onCoverPhotoChange={handleCoverPhotoChange}
        onProfilePhotoChange={handleProfilePhotoChange}
      />

      {/* Profile Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 px-4 md:px-0">
        {/* Contact Card */}
        <MemberProfileCard
          variant="contact"
          userPermissions={['members:edit_self']}
          title="Contact Information"
          canEdit={true}
          editHref="/admin/my-profile/edit?section=contact"
          items={contactItems}
          emptyMessage="No contact information on file."
        />

        {/* Family Card */}
        <MemberProfileCard
          variant="family"
          userPermissions={['members:edit_self']}
          title="My Family"
          canEdit={false}
          items={familyItems}
          emptyMessage="Not part of a family unit."
        />

        {/* Church Life Card */}
        <MemberProfileCard
          variant="engagement"
          userPermissions={['members:edit_self']}
          title="Church Life"
          canEdit={true}
          editHref="/admin/my-profile/edit?section=interests"
          items={churchLifeItems}
          emptyMessage="Not yet connected to groups or serving."
        />

        {/* Emergency Contact Card */}
        <MemberProfileCard
          variant="emergency"
          userPermissions={['members:edit_self']}
          title="Emergency Contact"
          canEdit={true}
          editHref="/admin/my-profile/edit?section=emergency"
          items={emergencyItems}
          emptyMessage="No emergency contact on file."
        />

        {/* Personal Info Card */}
        <MemberProfileCard
          variant="identity"
          userPermissions={['members:edit_self']}
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
