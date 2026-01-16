'use client';

import { format } from 'date-fns';
import { RefreshCw, BookOpen, Sun, Sunrise, Sunset, Moon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { WelcomeData, BibleVerse } from '@/models/dashboard/adminDashboard.model';
import { cn } from '@/lib/utils';

/**
 * Theme-aware gradient background class using CSS variable
 */
const heroGradientClass = "bg-gradient-sidebar";

interface DashboardHeroProps {
  data?: WelcomeData;
  bibleVerse?: BibleVerse;
  userRoles: string[];
  isLoading?: boolean;
  onRefreshVerse?: () => void;
  isRefreshingVerse?: boolean;
}

/**
 * Get role-specific title for personalized greeting
 */
function getRoleTitle(roles: string[]): string {
  if (roles.includes('role_senior_pastor')) return 'Pastor';
  if (roles.includes('role_associate_pastor')) return 'Pastor';
  if (roles.includes('role_deacon_elder')) return 'Elder';
  if (roles.includes('role_ministry_leader')) return 'Leader';
  if (roles.includes('role_treasurer')) return '';
  if (roles.includes('role_auditor')) return '';
  if (roles.includes('role_secretary')) return '';
  if (roles.includes('role_volunteer')) return '';
  if (roles.includes('role_member')) return '';
  if (roles.includes('role_visitor')) return 'Friend';
  return '';
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
    return 'Thank you for your faithful service to the church';
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
  if (hour >= 5 && hour < 12) return <Sunrise className="h-5 w-5" />;
  if (hour >= 12 && hour < 17) return <Sun className="h-5 w-5" />;
  if (hour >= 17 && hour < 20) return <Sunset className="h-5 w-5" />;
  return <Moon className="h-5 w-5" />;
}

export function DashboardHero({
  data,
  bibleVerse,
  userRoles,
  isLoading,
  onRefreshVerse,
  isRefreshingVerse
}: DashboardHeroProps) {
  if (isLoading) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-2xl p-6 md:p-8 lg:p-10 text-white shadow-2xl", heroGradientClass)}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: Greeting */}
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/20" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-64 bg-white/20" />
                <Skeleton className="h-5 w-48 bg-white/20" />
                <Skeleton className="h-4 w-56 bg-white/20" />
              </div>
            </div>
            {/* Right: Date/Time */}
            <div className="text-left lg:text-right">
              <Skeleton className="h-6 w-48 bg-white/20 mb-2" />
              <Skeleton className="h-4 w-32 bg-white/20" />
            </div>
          </div>

          {/* Bible Verse */}
          <div className="mt-8 p-5 rounded-xl bg-white/10 backdrop-blur-sm">
            <Skeleton className="h-5 w-full bg-white/20 mb-2" />
            <Skeleton className="h-5 w-3/4 bg-white/20 mb-3" />
            <Skeleton className="h-4 w-32 bg-white/20" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const initials = data.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');
  const roleTitle = getRoleTitle(userRoles);
  const welcomeMessage = getRoleWelcomeMessage(userRoles);

  // Extract first name for a more personal greeting
  const firstName = data.userName.split(' ')[0];
  const displayName = roleTitle ? `${roleTitle} ${firstName}` : firstName;

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl p-6 md:p-8 lg:p-10 text-white shadow-2xl", heroGradientClass)}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10">
        {/* Main Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Avatar and Greeting */}
          <div className="flex items-start gap-4 md:gap-5">
            <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-4 ring-white/30 shadow-xl">
              {data.userProfilePictureUrl ? (
                <AvatarImage src={data.userProfilePictureUrl} alt={data.userName} />
              ) : null}
              <AvatarFallback className="bg-white/20 text-white text-xl md:text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
                {data.greeting}, {displayName}!
              </h1>
              <p className="text-white/90 text-base md:text-lg font-medium">
                {welcomeMessage}
              </p>
              <p className="text-white/70 text-sm md:text-base">
                {data.tenantName}
              </p>
            </div>
          </div>

          {/* Right: Date and Time */}
          <div className="flex items-center gap-3 lg:flex-col lg:items-end">
            <div className="flex items-center gap-2 text-white/90">
              {getTimeIcon()}
              <span className="text-sm md:text-base font-medium">{currentDate}</span>
            </div>
            {data.lastSignIn && (
              <p className="text-xs md:text-sm text-white/60">
                Last visit: {format(new Date(data.lastSignIn), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        </div>

        {/* Bible Verse Card */}
        {bibleVerse && (
          <div className="mt-6 md:mt-8 p-5 md:p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-inner">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-white/10">
                <BookOpen className="h-5 w-5 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 mb-2">
                  Verse of the Day
                </p>
                <blockquote className="text-white/95 text-base md:text-lg leading-relaxed italic">
                  &ldquo;{bibleVerse.text}&rdquo;
                </blockquote>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">
                    {bibleVerse.reference}
                    <span className="font-normal text-white/60 ml-2">
                      ({bibleVerse.version})
                    </span>
                  </p>
                  {onRefreshVerse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRefreshVerse}
                      disabled={isRefreshingVerse}
                      className="text-white/80 hover:text-white hover:bg-white/10 h-8 px-3"
                    >
                      <RefreshCw className={cn(
                        "h-4 w-4 mr-1.5",
                        isRefreshingVerse && "animate-spin"
                      )} />
                      <span className="text-xs">New verse</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
