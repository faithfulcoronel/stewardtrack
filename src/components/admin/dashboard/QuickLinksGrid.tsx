'use client';

import Link from 'next/link';
import {
  Users,
  DollarSign,
  Calendar,
  MessageSquare,
  Settings,
  Shield,
  FileText,
  BarChart,
  Heart,
  BookOpen,
  Bell,
  Church
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { QuickLink, QuickLinkIcon } from '@/models/dashboard/adminDashboard.model';

interface QuickLinksGridProps {
  links?: QuickLink[];
  isLoading?: boolean;
}

const iconMap: Record<QuickLinkIcon, React.ComponentType<{ className?: string }>> = {
  users: Users,
  'dollar-sign': DollarSign,
  calendar: Calendar,
  'message-square': MessageSquare,
  settings: Settings,
  shield: Shield,
  'file-text': FileText,
  'bar-chart': BarChart,
  heart: Heart,
  book: BookOpen,
  bell: Bell,
  church: Church,
};

const categoryColors: Record<string, { bg: string; text: string; hover: string }> = {
  membership: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
  finances: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', hover: 'hover:bg-green-50 dark:hover:bg-green-900/20' },
  events: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  communications: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  admin: { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', hover: 'hover:bg-slate-50 dark:hover:bg-slate-800/30' },
  reports: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', hover: 'hover:bg-cyan-50 dark:hover:bg-cyan-900/20' },
};

function QuickLinkCard({ link }: { link: QuickLink }) {
  const Icon = iconMap[link.icon] || Users;
  const colors = categoryColors[link.category] || categoryColors.admin;

  return (
    <Link href={link.href} className="block group">
      <Card className={`transition-all duration-200 border-transparent ${colors.hover} hover:shadow-md hover:border-border/50`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2.5 ${colors.bg} transition-colors group-hover:scale-105`}>
              <Icon className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {link.title}
                </h3>
                {link.badge && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {link.badge}
                  </Badge>
                )}
                {link.isNew && (
                  <Badge className="text-xs px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {link.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLinkSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickLinksGrid({ links, isLoading }: QuickLinksGridProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickLinkSkeleton />
            <QuickLinkSkeleton />
            <QuickLinkSkeleton />
            <QuickLinkSkeleton />
            <QuickLinkSkeleton />
            <QuickLinkSkeleton />
          </div>
        ) : links && links.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <QuickLinkCard key={link.id} link={link} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No quick links available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
