'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  Pencil,
  Upload,
  User,
  Calendar,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface MyProfileHeroProps {
  member: {
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
  };
  isLoading?: boolean;
  canEdit?: boolean;
  onCoverPhotoChange?: (file: File) => Promise<void>;
  onProfilePhotoChange?: (file: File) => Promise<void>;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function MyProfileHero({
  member,
  isLoading,
  canEdit = true,
  onCoverPhotoChange,
  onProfilePhotoChange,
}: MyProfileHeroProps) {
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  const displayName = member.preferredName
    ? `${member.preferredName} ${member.lastName}`
    : `${member.firstName} ${member.lastName}`;

  const initials = getInitials(member.firstName, member.lastName);

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onCoverPhotoChange) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingCover(true);
    try {
      await onCoverPhotoChange(file);
      toast.success('Cover photo updated!');
    } catch (error) {
      toast.error('Failed to update cover photo');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onProfilePhotoChange) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingProfile(true);
    try {
      await onProfilePhotoChange(file);
      toast.success('Profile photo updated!');
    } catch (error) {
      toast.error('Failed to update profile photo');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 pt-6">
        {/* Cover Photo Skeleton */}
        <div className="relative mx-4 md:mx-0">
          <Skeleton
            className="w-full rounded-xl md:rounded-2xl"
            style={{ minHeight: '180px', height: '22vh', maxHeight: '240px' }}
          />
          {/* Avatar Skeleton */}
          <div className="absolute -bottom-12 md:-bottom-14 left-4 md:left-6 z-20">
            <Skeleton className="h-24 w-24 md:h-28 md:w-28 rounded-full ring-4 ring-background" />
          </div>
        </div>
        {/* Profile Info Skeleton */}
        <div className="pt-10 md:pt-12 px-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== COVER PHOTO SECTION ===== */}
      <div className="relative mx-4 md:mx-0">
        {/* Cover Photo Banner */}
        <div
          className="relative w-full rounded-xl md:rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600"
          style={{ minHeight: '180px', height: '22vh', maxHeight: '240px' }}
        >
          {member.coverPhotoUrl ? (
            <>
              <Image
                src={member.coverPhotoUrl}
                alt={`${displayName}'s cover`}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </>
          ) : (
            /* Placeholder gradient with decorative elements */
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            </div>
          )}

          {/* Edit Cover Button */}
          {canEdit && onCoverPhotoChange && (
            <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverPhotoUpload}
                  disabled={isUploadingCover}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-foreground shadow-lg backdrop-blur-sm gap-2 text-xs md:text-sm pointer-events-none"
                  disabled={isUploadingCover}
                  asChild
                >
                  <span>
                    {isUploadingCover ? (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {member.coverPhotoUrl ? 'Edit cover' : 'Add cover'}
                    </span>
                  </span>
                </Button>
              </label>
            </div>
          )}
        </div>

        {/* ===== PROFILE PICTURE (overlapping cover) ===== */}
        <div className="absolute -bottom-12 md:-bottom-14 left-4 md:left-6 z-20">
          <div className="relative group">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-background shadow-2xl bg-background">
              {member.photoUrl ? (
                <AvatarImage
                  src={member.photoUrl}
                  alt={displayName}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl md:text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Edit Profile Photo Button */}
            {canEdit && onProfilePhotoChange && (
              <label className="cursor-pointer absolute bottom-0 right-0 md:bottom-1 md:right-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoUpload}
                  disabled={isUploadingProfile}
                />
                <span className="flex items-center justify-center p-1.5 md:p-2 rounded-full bg-primary text-primary-foreground shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-primary/90">
                  {isUploadingProfile ? (
                    <span className="animate-spin h-3 w-3 md:h-4 md:w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <Camera className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ===== PROFILE INFO SECTION ===== */}
      <div className="pt-10 md:pt-12 px-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Name and Details */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {displayName}
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {member.membershipType && (
                <Badge variant="secondary" className="text-xs">
                  {member.membershipType}
                </Badge>
              )}
              {member.center && (
                <Badge variant="outline" className="text-xs">
                  {member.center}
                </Badge>
              )}
            </div>

            {/* Member Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {member.joinDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {format(new Date(member.joinDate), 'MMMM yyyy')}
                </span>
              )}
              {member.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {member.location}
                </span>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {member.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {member.email}
                </span>
              )}
              {member.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {member.phone}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" className="gap-2" asChild>
                <Link href="/admin/my-profile/edit">
                  <Pencil className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyProfileHero;
