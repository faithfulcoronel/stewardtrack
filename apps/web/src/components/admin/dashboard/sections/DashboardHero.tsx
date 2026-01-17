'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import {
  RefreshCw,
  BookOpen,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Camera,
  Settings,
  Users,
  Calendar,
  Church,
  Sparkles,
  Upload,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { WelcomeData, BibleVerse } from '@/models/dashboard/adminDashboard.model';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DashboardHeroProps {
  data?: WelcomeData;
  bibleVerse?: BibleVerse;
  userRoles: string[];
  isLoading?: boolean;
  onRefreshVerse?: () => void;
  isRefreshingVerse?: boolean;
  churchImageUrl?: string | null;
  onCoverPhotoChange?: (url: string) => void;
  onLogoChange?: (url: string) => void;
}

/**
 * Check if user has admin role
 */
function isAdmin(roles: string[]): boolean {
  return roles.includes('role_tenant_admin') ||
         roles.includes('role_senior_pastor') ||
         roles.includes('role_associate_pastor');
}

/**
 * Get role title for display
 */
function getRoleTitle(roles: string[]): string {
  if (roles.includes('role_senior_pastor')) return 'Senior Pastor';
  if (roles.includes('role_associate_pastor')) return 'Associate Pastor';
  if (roles.includes('role_tenant_admin')) return 'Administrator';
  if (roles.includes('role_deacon_elder')) return 'Deacon/Elder';
  if (roles.includes('role_ministry_leader')) return 'Ministry Leader';
  if (roles.includes('role_treasurer')) return 'Treasurer';
  if (roles.includes('role_auditor')) return 'Auditor';
  if (roles.includes('role_secretary')) return 'Secretary';
  if (roles.includes('role_volunteer')) return 'Volunteer';
  if (roles.includes('role_member')) return 'Member';
  if (roles.includes('role_visitor')) return 'Visitor';
  return 'Member';
}

/**
 * Get role-specific welcome message
 */
function getRoleWelcomeMessage(roles: string[]): string {
  if (roles.includes('role_senior_pastor') || roles.includes('role_associate_pastor')) {
    return 'Your flock awaits your guidance today';
  }
  if (roles.includes('role_tenant_admin')) {
    return 'Your church is thriving under your stewardship';
  }
  if (roles.includes('role_deacon_elder')) {
    return 'Thank you for your faithful service';
  }
  if (roles.includes('role_ministry_leader')) {
    return 'Your ministry makes a difference';
  }
  if (roles.includes('role_treasurer') || roles.includes('role_auditor')) {
    return 'Faithful stewardship honors God';
  }
  if (roles.includes('role_secretary')) {
    return 'Your organization keeps the church running smoothly';
  }
  if (roles.includes('role_volunteer')) {
    return 'Your service is a blessing to many';
  }
  if (roles.includes('role_member')) {
    return 'You are a valued part of our church family';
  }
  if (roles.includes('role_visitor')) {
    return 'We are so glad you are here!';
  }
  return 'Welcome to your church community';
}

/**
 * Get time-based icon
 */
function getTimeIcon() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return <Sunrise className="h-4 w-4" />;
  if (hour >= 12 && hour < 17) return <Sun className="h-4 w-4" />;
  if (hour >= 17 && hour < 20) return <Sunset className="h-4 w-4" />;
  return <Moon className="h-4 w-4" />;
}

export function DashboardHero({
  data,
  bibleVerse,
  userRoles,
  isLoading,
  onRefreshVerse,
  isRefreshingVerse,
  churchImageUrl: propChurchImageUrl,
  onCoverPhotoChange,
  onLogoChange,
}: DashboardHeroProps) {
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);

  const churchImageUrl = localCoverUrl ?? propChurchImageUrl ?? data?.churchImageUrl;
  const churchLogoUrl = localLogoUrl ?? data?.tenantLogoUrl;

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/onboarding/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload cover photo');
      }

      const result = await response.json();
      setLocalCoverUrl(result.url);
      onCoverPhotoChange?.(result.url);
      toast.success('Cover photo updated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload cover photo');
    } finally {
      setIsUploadingCover(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/onboarding/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      const result = await response.json();
      setLocalLogoUrl(result.url);
      onLogoChange?.(result.url);
      toast.success('Church logo updated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 pt-6">
        {/* Cover Photo Skeleton */}
        <div className="relative mx-4 md:mx-6 lg:mx-8">
          <Skeleton
            className="w-full rounded-xl md:rounded-2xl"
            style={{ minHeight: '200px', height: '25vh', maxHeight: '280px' }}
          />
          {/* Avatar Skeleton overlapping cover */}
          <div className="absolute -bottom-12 md:-bottom-16 left-0 md:left-2 lg:left-4 z-20">
            <Skeleton className="h-24 w-24 md:h-32 md:w-32 lg:h-36 lg:w-36 rounded-full ring-4 ring-background" />
          </div>
        </div>
        {/* Profile Info Skeleton */}
        <div className="pt-8 md:pt-12 lg:pt-14 px-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-10" />
            </div>
          </div>
        </div>
        {/* Bible Verse Skeleton */}
        <div className="mx-4 md:mx-6 lg:mx-8">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');
  const welcomeMessage = getRoleWelcomeMessage(userRoles);
  const firstName = data.userName.split(' ')[0];

  // Get church initials for fallback
  const churchInitials = data.tenantName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-4 pt-6">
      {/* ===== COVER PHOTO SECTION (Facebook-style) ===== */}
      <div className="relative mx-4 md:mx-6 lg:mx-8">
        {/* Cover Photo Banner */}
        <div
          className="relative w-full rounded-xl md:rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600"
          style={{ minHeight: '200px', height: '25vh', maxHeight: '280px' }}
        >
          {churchImageUrl ? (
            <>
              <Image
                src={churchImageUrl}
                alt={`${data.tenantName} cover`}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              {/* Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

              {/* Edit Cover Button - for admins */}
              {isAdmin(userRoles) && (
                <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10">
                  <input
                    type="file"
                    id="cover-photo-input"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverPhotoUpload}
                    disabled={isUploadingCover}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/90 hover:bg-white text-foreground shadow-lg backdrop-blur-sm gap-2 text-xs md:text-sm"
                    disabled={isUploadingCover}
                    asChild
                  >
                    <label htmlFor="cover-photo-input" className="cursor-pointer">
                      {isUploadingCover ? (
                        <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isUploadingCover ? 'Uploading...' : 'Edit cover'}
                      </span>
                    </label>
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* Placeholder when no cover image */
            <>
              {/* Decorative background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
              </div>

              {/* Centered placeholder content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                <Church className="h-16 w-16 md:h-20 md:w-20 text-white/30 mb-3" />
                {isAdmin(userRoles) ? (
                  <>
                    <p className="text-sm md:text-base font-medium mb-3">Add a cover photo for your church</p>
                    <input
                      type="file"
                      id="cover-photo-input-empty"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverPhotoUpload}
                      disabled={isUploadingCover}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm gap-2"
                      disabled={isUploadingCover}
                      asChild
                    >
                      <label htmlFor="cover-photo-input-empty" className="cursor-pointer">
                        {isUploadingCover ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{isUploadingCover ? 'Uploading...' : 'Upload Cover Photo'}</span>
                      </label>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-white/60">Welcome to {data.tenantName}</p>
                )}
              </div>
            </>
          )}

          {/* Date/Time Badge - always visible */}
          <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs md:text-sm">
              {getTimeIcon()}
              <span className="font-medium">{currentDate}</span>
            </div>
          </div>
        </div>

        {/* ===== CHURCH LOGO (Profile Picture overlapping cover) ===== */}
        <div className="absolute -bottom-12 md:-bottom-16 left-0 md:left-2 lg:left-4 z-20">
          <div className="relative group">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 lg:h-36 lg:w-36 ring-4 ring-background shadow-2xl bg-background">
              {churchLogoUrl ? (
                <AvatarImage
                  src={churchLogoUrl}
                  alt={data.tenantName}
                  className="object-contain p-1"
                />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl md:text-3xl lg:text-4xl font-bold">
                {churchInitials}
              </AvatarFallback>
            </Avatar>
            {/* Edit Logo Button - appears on hover, admin only */}
            {isAdmin(userRoles) && (
              <>
                <input
                  type="file"
                  id="logo-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                />
                <label
                  htmlFor="logo-input"
                  className={cn(
                    "absolute bottom-1 right-1 md:bottom-2 md:right-2 p-1.5 md:p-2 rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity duration-200 hover:bg-primary/90 cursor-pointer",
                    isUploadingLogo ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== PROFILE INFO SECTION (below cover, offset for logo) ===== */}
      <div className="pt-8 md:pt-12 lg:pt-14 px-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Church Name & Greeting */}
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {data.tenantName}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {data.greeting}, {firstName}! {welcomeMessage}
            </p>
            {data.lastSignIn && (
              <p className="text-xs md:text-sm text-muted-foreground/70">
                Last visit: {format(new Date(data.lastSignIn), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" className="gap-2" asChild>
              <Link href="/admin/community/members">
                <Users className="h-4 w-4" />
                <span>Members</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href="/admin/community/calendar">
                <Calendar className="h-4 w-4" />
                <span>Events</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <Link href="/admin/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ===== BIBLE VERSE CARD ===== */}
      {bibleVerse && (
        <div className="mx-4 md:mx-6 lg:mx-8">
          <div className="relative p-4 md:p-6 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/10 shadow-sm overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />

            <div className="relative flex items-start gap-3 md:gap-4">
              <div className="flex-shrink-0 p-2 md:p-2.5 rounded-xl bg-primary/10">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs md:text-sm font-semibold text-primary uppercase tracking-wider">
                    Verse of the Day
                  </p>
                  {onRefreshVerse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRefreshVerse}
                      disabled={isRefreshingVerse}
                      className="h-7 px-2 text-muted-foreground hover:text-primary"
                    >
                      <RefreshCw className={cn(
                        "h-3.5 w-3.5 mr-1",
                        isRefreshingVerse && "animate-spin"
                      )} />
                      <span className="text-xs hidden sm:inline">New verse</span>
                    </Button>
                  )}
                </div>

                <blockquote className="text-sm md:text-base lg:text-lg text-foreground/90 leading-relaxed">
                  &ldquo;{bibleVerse.text}&rdquo;
                </blockquote>

                <div className="mt-2 md:mt-3 flex items-center gap-2">
                  <p className="text-xs md:text-sm font-semibold text-foreground">
                    {bibleVerse.reference}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    ({bibleVerse.version})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
