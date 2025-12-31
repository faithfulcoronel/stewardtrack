'use client';

import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { WelcomeData } from '@/models/dashboard/adminDashboard.model';

interface WelcomeCardProps {
  data?: WelcomeData;
  isLoading?: boolean;
}

export function WelcomeCard({ data, isLoading }: WelcomeCardProps) {
  if (isLoading) {
    return (
      <Card className="border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-none">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-5 w-40" />
          </div>
        </CardContent>
      </Card>
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

  return (
    <Card className="border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-none">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {data.tenantLogoUrl ? (
              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                <AvatarImage src={data.tenantLogoUrl} alt={data.tenantName} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                {data.greeting}, {data.userName}!
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome to <span className="font-medium text-foreground">{data.tenantName}</span>
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-foreground">{currentDate}</p>
            {data.lastSignIn && (
              <p className="text-xs text-muted-foreground">
                Last sign-in: {format(new Date(data.lastSignIn), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
