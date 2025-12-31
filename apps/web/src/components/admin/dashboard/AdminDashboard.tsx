'use client';

import { useCallback } from 'react';
import { WelcomeCard } from './WelcomeCard';
import { BibleVerseCard } from './BibleVerseCard';
import { MetricsGrid } from './MetricsGrid';
import { QuickLinksGrid } from './QuickLinksGrid';
import { HighlightsCard } from './HighlightsCard';
import { RecentActivityCard } from './RecentActivityCard';
import { UpcomingEventsCard } from './UpcomingEventsCard';
import { BirthdaysCard } from './BirthdaysCard';
import { useDashboard } from '@/hooks/useDashboard';

export function AdminDashboard() {
  const { data, isLoading, error, refreshBibleVerse, isRefreshingVerse, refetch } = useDashboard();

  const handleRefreshVerse = useCallback(() => {
    refreshBibleVerse();
  }, [refreshBibleVerse]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load dashboard: {error}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <WelcomeCard data={data?.welcome} isLoading={isLoading} />

      {/* Bible Verse */}
      <BibleVerseCard
        verse={data?.bibleVerse}
        isLoading={isLoading}
        onRefresh={handleRefreshVerse}
        isRefreshing={isRefreshingVerse}
      />

      {/* Metrics Grid */}
      <MetricsGrid metrics={data?.metrics} isLoading={isLoading} />

      {/* Quick Actions */}
      <QuickLinksGrid links={data?.quickLinks} isLoading={isLoading} />

      {/* Two Column Layout for Desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <HighlightsCard highlights={data?.highlights} isLoading={isLoading} />
          <UpcomingEventsCard events={data?.upcomingEvents} isLoading={isLoading} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <RecentActivityCard activities={data?.recentActivity} isLoading={isLoading} />
          <BirthdaysCard birthdays={data?.upcomingBirthdays} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
