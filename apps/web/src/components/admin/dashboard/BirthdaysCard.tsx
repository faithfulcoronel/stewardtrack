'use client';

import Link from 'next/link';
import { parseISO } from 'date-fns';
import { Cake, ChevronRight, Gift } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { UpcomingBirthday } from '@/models/dashboard/adminDashboard.model';

interface BirthdaysCardProps {
  birthdays?: UpcomingBirthday[];
  isLoading?: boolean;
  timezone?: string;
}

// Format date with tenant timezone using Intl.DateTimeFormat
function formatBirthdayDate(date: Date, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
  };
  if (timezone) {
    options.timeZone = timezone;
  }
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function BirthdayItem({ birthday, timezone }: { birthday: UpcomingBirthday; timezone?: string }) {
  const initials = `${birthday.firstName[0]}${birthday.lastName[0]}`.toUpperCase();
  const birthdayDate = parseISO(birthday.birthday);
  const formattedDate = formatBirthdayDate(birthdayDate, timezone);

  return (
    <Link
      href={`/admin/members/${birthday.memberId}`}
      className="flex items-center gap-3 py-2.5 rounded-lg px-2 -mx-2 transition-colors hover:bg-muted/50"
    >
      <Avatar className="h-9 w-9">
        {birthday.profilePictureUrl && (
          <AvatarImage src={birthday.profilePictureUrl} alt={`${birthday.firstName} ${birthday.lastName}`} />
        )}
        <AvatarFallback className="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {birthday.firstName} {birthday.lastName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formattedDate}
        </p>
      </div>
      {birthday.daysUntil === 0 ? (
        <Badge className="bg-pink-500 hover:bg-pink-600 text-white text-xs shrink-0">
          Today!
        </Badge>
      ) : birthday.daysUntil === 1 ? (
        <Badge variant="secondary" className="text-xs shrink-0">
          Tomorrow
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground shrink-0">
          in {birthday.daysUntil} days
        </span>
      )}
    </Link>
  );
}

function BirthdaySkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

export function BirthdaysCard({ birthdays, isLoading, timezone }: BirthdaysCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            Upcoming Birthdays
          </CardTitle>
          <Link href="/admin/members">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-0.5">
            <BirthdaySkeleton />
            <BirthdaySkeleton />
            <BirthdaySkeleton />
          </div>
        ) : birthdays && birthdays.length > 0 ? (
          <div className="space-y-0.5">
            {birthdays.map((birthday) => (
              <BirthdayItem key={birthday.memberId} birthday={birthday} timezone={timezone} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Gift className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming birthdays this month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
