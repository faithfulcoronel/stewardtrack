'use client';

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
  Church,
  BookOpen,
  Bell,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { QuickLink, QuickLinkIcon, QuickLinkCategory } from '@/models/dashboard/adminDashboard.model';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface QuickActionsSectionProps {
  links?: QuickLink[];
  userRoles: string[];
  isLoading?: boolean;
}

/**
 * Icon mapping
 */
const iconMap: Record<QuickLinkIcon, React.ComponentType<{ className?: string }>> = {
  'users': Users,
  'dollar-sign': DollarSign,
  'calendar': Calendar,
  'message-square': MessageSquare,
  'settings': Settings,
  'shield': Shield,
  'file-text': FileText,
  'bar-chart': BarChart,
  'heart': Heart,
  'church': Church,
  'book': BookOpen,
  'bell': Bell,
};

/**
 * Category color mapping with gradients for wow factor
 */
const categoryColors: Record<QuickLinkCategory, {
  bg: string;
  hover: string;
  icon: string;
  ring: string;
}> = {
  membership: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30',
    hover: 'hover:from-blue-100 hover:to-blue-150/50 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30',
    icon: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-200 dark:ring-blue-800',
  },
  finances: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30',
    hover: 'hover:from-emerald-100 hover:to-emerald-150/50 dark:hover:from-emerald-900/50 dark:hover:to-emerald-800/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  events: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30',
    hover: 'hover:from-purple-100 hover:to-purple-150/50 dark:hover:from-purple-900/50 dark:hover:to-purple-800/30',
    icon: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-200 dark:ring-purple-800',
  },
  communications: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30',
    hover: 'hover:from-orange-100 hover:to-orange-150/50 dark:hover:from-orange-900/50 dark:hover:to-orange-800/30',
    icon: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-200 dark:ring-orange-800',
  },
  admin: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30',
    hover: 'hover:from-slate-100 hover:to-slate-150/50 dark:hover:from-slate-800/50 dark:hover:to-slate-700/30',
    icon: 'text-slate-600 dark:text-slate-400',
    ring: 'ring-slate-200 dark:ring-slate-700',
  },
  reports: {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/50 dark:to-cyan-900/30',
    hover: 'hover:from-cyan-100 hover:to-cyan-150/50 dark:hover:from-cyan-900/50 dark:hover:to-cyan-800/30',
    icon: 'text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-200 dark:ring-cyan-800',
  },
};

export function QuickActionsSection({ links, userRoles, isLoading }: QuickActionsSectionProps) {
  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-xl border bg-muted/30">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-5 w-20 mb-1" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!links || links.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {links.map((link) => {
          const Icon = iconMap[link.icon] || Users;
          const colors = categoryColors[link.category] || categoryColors.admin;

          return (
            <Link
              key={link.id}
              href={link.href}
              className={cn(
                "group relative p-4 rounded-xl border transition-all duration-300",
                "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5",
                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                colors.bg,
                colors.hover,
                colors.ring
              )}
            >
              {/* New badge */}
              {link.isNew && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 shadow-md">
                  New
                </Badge>
              )}

              {/* Badge */}
              {link.badge && !link.isNew && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 shadow-md"
                >
                  {link.badge}
                </Badge>
              )}

              {/* Icon */}
              <div className={cn(
                "mb-3 p-2.5 rounded-lg w-fit",
                "bg-white/60 dark:bg-white/10",
                "shadow-sm"
              )}>
                <Icon className={cn("h-5 w-5", colors.icon)} />
              </div>

              {/* Title */}
              <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                {link.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {link.description}
              </p>

              {/* Hover arrow indicator */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className={cn("h-4 w-4", colors.icon)} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
