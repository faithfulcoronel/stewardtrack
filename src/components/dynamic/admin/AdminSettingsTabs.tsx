'use client';

import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Settings,
  Bell,
  Link2,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SettingsTabConfig {
  id: string;
  label: string;
  icon: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface AdminSettingsTabsProps {
  /** Tab configurations from metadata */
  tabs?: SettingsTabConfig[];
  /** Default active tab */
  defaultTab?: string;
  /** Children to render in each tab */
  children?: ReactNode;
  /** Callback when tab changes */
  onTabChange?: (tabId: string) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  settings: Settings,
  bell: Bell,
  link: Link2,
  notifications: Bell,
  integrations: Link2,
  general: Settings,
};

const DEFAULT_TABS: SettingsTabConfig[] = [
  {
    id: 'general',
    label: 'General',
    icon: 'settings',
    description: 'Church profile and preferences',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'bell',
    description: 'Alert and communication settings',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'link',
    description: 'Email and SMS providers',
  },
];

// Simply convert children to an array without any unwrapping
// The interpreter's Fragment wrappers are transparent when rendered by React
function getChildrenArray(children: ReactNode): ReactNode[] {
  if (Array.isArray(children)) {
    return children.filter((child) => child !== null && child !== undefined);
  }

  const result: ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (child !== null && child !== undefined) {
      result.push(child);
    }
  });
  return result;
}

const TAB_QUERY_PARAM = 'tab';

export function AdminSettingsTabs({
  tabs = DEFAULT_TABS,
  defaultTab,
  children,
  onTabChange,
}: AdminSettingsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial tab from URL or fallback to defaultTab/first tab
  const getInitialTab = useCallback(() => {
    const urlTab = searchParams.get(TAB_QUERY_PARAM);
    // Validate that the URL tab exists in our tabs
    if (urlTab && tabs.some(t => t.id === urlTab)) {
      return urlTab;
    }
    return defaultTab || tabs[0]?.id || 'general';
  }, [searchParams, tabs, defaultTab]);

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobile, setIsMobile] = useState(false);

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get(TAB_QUERY_PARAM);
    if (urlTab && tabs.some(t => t.id === urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, tabs, activeTab]);

  // Convert children to array, properly handling metadata interpreter output
  const childrenArray = getChildrenArray(children);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);

    // Update URL with new tab selection
    const params = new URLSearchParams(searchParams.toString());
    params.set(TAB_QUERY_PARAM, tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [onTabChange, searchParams, router, pathname]);

  // Render icon by name
  const renderIcon = (iconName: string, className?: string) => {
    const Icon = ICON_MAP[iconName] || Settings;
    return <Icon className={cn('h-5 w-5', className)} />;
  };

  // Get the active tab index
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  // Mobile: Full-width stacked tabs with touch-friendly design
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Tab Selector */}
        <div className="bg-background sticky top-0 z-10 border-b pb-1">
          <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 gap-1.5 py-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && handleTabChange(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                    tab.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {renderIcon(tab.icon, isActive ? 'text-primary-foreground' : '')}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={cn(
                      'ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-semibold',
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                    )}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Content Area */}
        <div className="min-h-[50vh]">
          {activeTabIndex >= 0 && activeTabIndex < childrenArray.length && (
            <div className="animate-in fade-in-50 duration-200">
              {childrenArray[activeTabIndex]}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Sidebar navigation with content area
  return (
    <div className="flex gap-8">
      {/* Desktop Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0">
        <nav className="sticky top-6 space-y-1">
          <div className="pb-3 mb-3 border-b">
            <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && handleTabChange(tab.id)}
                disabled={tab.disabled}
                className={cn(
                  'w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  tab.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'p-2 rounded-md transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-muted-foreground/10'
                )}>
                  {renderIcon(tab.icon, 'h-4 w-4')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{tab.label}</span>
                    {tab.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  {tab.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {tab.description}
                    </p>
                  )}
                </div>
                <ChevronRight className={cn(
                  'h-4 w-4 transition-transform',
                  isActive ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'
                )} />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Desktop Content Area */}
      <main className="flex-1 min-w-0">
        {activeTabIndex >= 0 && activeTabIndex < childrenArray.length && (
          <div className="animate-in fade-in-50 slide-in-from-right-2 duration-200">
            {childrenArray[activeTabIndex]}
          </div>
        )}
      </main>
    </div>
  );
}
