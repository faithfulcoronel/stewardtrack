'use client';

/**
 * ================================================================================
 * GLOBAL SEARCH COMPONENT - RIGHT-SIDE SHEET PANEL
 * ================================================================================
 *
 * A beautiful, keyboard-first global search using a right-side Sheet pattern.
 * Same design pattern as RecipientSelector.
 *
 * Features:
 * - Right-side full-height Sheet
 * - Command palette (Cmd+K / Ctrl+K) trigger
 * - Category tabs for filtering
 * - AI-powered suggestions
 * - Recent search history
 * - Keyboard navigation
 * - Mobile responsive
 *
 * ================================================================================
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  Users,
  Building2,
  Receipt,
  Calendar,
  Users2,
  Heart,
  GraduationCap,
  BookOpen,
  FileText,
  HandCoins,
  Home,
  Command,
  Trash2,
  TrendingUp,
  Zap,
  ChevronRight,
  Hash,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type {
  SearchResponse,
  SearchResultItem,
  SearchResultGroup,
  SearchEntityType,
  RecentSearch,
  AISearchSuggestion,
} from '@/models/search.model';

// =====================================================
// Icon & Color Mapping
// =====================================================

const ENTITY_ICONS: Record<SearchEntityType, React.ComponentType<{ className?: string }>> = {
  member: Users,
  account: Building2,
  transaction: Receipt,
  event: Calendar,
  ministry: Users2,
  care_plan: Heart,
  discipleship_plan: GraduationCap,
  notebook: BookOpen,
  note: FileText,
  donation: HandCoins,
  family: Home,
};

const ENTITY_COLORS: Record<SearchEntityType, { bg: string; text: string; border: string; gradient: string }> = {
  member: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    gradient: 'from-blue-500 to-blue-600',
  },
  account: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
    gradient: 'from-violet-500 to-purple-600',
  },
  transaction: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    gradient: 'from-emerald-500 to-green-600',
  },
  event: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20',
    gradient: 'from-orange-500 to-amber-600',
  },
  ministry: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/20',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  care_plan: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500/20',
    gradient: 'from-pink-500 to-rose-600',
  },
  discipleship_plan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/20',
    gradient: 'from-cyan-500 to-teal-600',
  },
  notebook: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    gradient: 'from-amber-500 to-yellow-600',
  },
  note: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20',
    gradient: 'from-slate-500 to-gray-600',
  },
  donation: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
    gradient: 'from-green-500 to-emerald-600',
  },
  family: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/20',
    gradient: 'from-teal-500 to-cyan-600',
  },
};

const ENTITY_LABELS: Record<SearchEntityType, string> = {
  member: 'Members',
  account: 'Accounts',
  transaction: 'Transactions',
  event: 'Events',
  ministry: 'Ministries',
  care_plan: 'Care Plans',
  discipleship_plan: 'Discipleship',
  notebook: 'Notebooks',
  note: 'Notes',
  donation: 'Donations',
  family: 'Families',
};

// Route mapping for "See all" navigation
const ENTITY_ROUTES: Record<SearchEntityType, string> = {
  member: '/admin/community/members',
  account: '/admin/community/accounts/list',
  transaction: '/admin/finance/transactions',
  event: '/admin/community/planning/calendar',
  ministry: '/admin/community/planning/scheduler/ministries',
  care_plan: '/admin/community/care-plans/list',
  discipleship_plan: '/admin/community/discipleship-plans/list',
  notebook: '/admin/community/planning/notebooks',
  note: '/admin/community/planning/notebooks',
  donation: '/admin/finance/donations',
  family: '/admin/community/families/list',
};

// =====================================================
// Types
// =====================================================

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

// =====================================================
// Main Component
// =====================================================

export function GlobalSearch({
  placeholder = 'Search...',
  className,
  compact = false,
}: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<SearchEntityType | 'all'>('all');
  const [showAI, setShowAI] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // =====================================================
  // Data Fetching
  // =====================================================

  const fetchResults = useCallback(async (searchQuery: string, entityTypes?: SearchEntityType[]) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '10',
        ai: showAI ? 'true' : 'false',
      });
      if (entityTypes && entityTypes.length > 0) {
        params.set('types', entityTypes.join(','));
      }

      const response = await fetch(`/api/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [showAI]);

  const fetchRecentSearches = useCallback(async () => {
    try {
      const response = await fetch('/api/search/recent');
      if (response.ok) {
        const data = await response.json();
        setRecentSearches(data.recentSearches || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent searches:', error);
    }
  }, []);

  const fetchSuggestions = useCallback(async (partialQuery: string) => {
    if (!partialQuery || partialQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(partialQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, []);

  const clearRecentSearches = useCallback(async () => {
    try {
      await fetch('/api/search/recent', { method: 'DELETE' });
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }, []);

  // =====================================================
  // Effects
  // =====================================================

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const types = activeCategory !== 'all' ? [activeCategory] : undefined;
      fetchResults(query, types);
      fetchSuggestions(query);
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, activeCategory, fetchResults, fetchSuggestions]);

  useEffect(() => {
    if (isOpen) {
      fetchRecentSearches();
      // Focus input after sheet animation
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchRecentSearches]);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // =====================================================
  // Event Handlers
  // =====================================================

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    setSelectedIndex(0);
    setActiveCategory('all');
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [handleClose, handleOpen]);

  const handleSelectResult = useCallback((item: SearchResultItem) => {
    router.push(item.meta.href);
    handleClose();
  }, [router, handleClose]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    setSelectedIndex(0);
  }, []);

  const handleSelectRecentSearch = useCallback((search: RecentSearch) => {
    setQuery(search.query);
    if (search.entityTypes && search.entityTypes.length === 1) {
      setActiveCategory(search.entityTypes[0]);
    }
  }, []);

  const handleCategoryChange = useCallback((category: SearchEntityType | 'all') => {
    setActiveCategory(category);
    setSelectedIndex(0);
  }, []);

  const handleSeeAll = useCallback((entityType: SearchEntityType) => {
    const baseRoute = ENTITY_ROUTES[entityType];
    const searchParam = query ? `?search=${encodeURIComponent(query)}` : '';
    router.push(`${baseRoute}${searchParam}`);
    handleClose();
  }, [query, router, handleClose]);

  const flatResults = useMemo(() => {
    return results?.groups.flatMap((g) => g.results) || [];
  }, [results]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const totalItems = flatResults.length + suggestions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[selectedIndex]);
          } else {
            const resultIndex = selectedIndex - suggestions.length;
            if (flatResults[resultIndex]) {
              handleSelectResult(flatResults[resultIndex]);
            }
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through categories
        const categories: (SearchEntityType | 'all')[] = ['all', 'member', 'event', 'transaction', 'ministry', 'notebook'];
        const currentIdx = categories.indexOf(activeCategory);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + categories.length) % categories.length
          : (currentIdx + 1) % categories.length;
        setActiveCategory(categories[nextIdx]);
        break;
    }
  }, [flatResults, suggestions, selectedIndex, activeCategory, handleSelectSuggestion, handleSelectResult, handleClose]);

  // =====================================================
  // Computed Values
  // =====================================================

  const hasResults = results && results.totalCount > 0;
  const showRecentSearches = !query && recentSearches.length > 0;
  const showSuggestions = query && suggestions.length > 0 && !hasResults;
  const showEmptyState = query && !isLoading && !hasResults && !showSuggestions;

  // Category tabs
  const categoryTabs = useMemo(() => [
    { id: 'all' as const, label: 'All', icon: Search, count: results?.totalCount || 0 },
    { id: 'member' as const, label: 'Members', icon: Users, count: results?.groups.find(g => g.entityType === 'member')?.totalCount || 0 },
    { id: 'event' as const, label: 'Events', icon: Calendar, count: results?.groups.find(g => g.entityType === 'event')?.totalCount || 0 },
    { id: 'transaction' as const, label: 'Finance', icon: Receipt, count: results?.groups.find(g => g.entityType === 'transaction')?.totalCount || 0 },
    { id: 'ministry' as const, label: 'Ministries', icon: Users2, count: results?.groups.find(g => g.entityType === 'ministry')?.totalCount || 0 },
    { id: 'notebook' as const, label: 'Notes', icon: BookOpen, count: results?.groups.find(g => g.entityType === 'notebook')?.totalCount || 0 },
  ], [results]);

  // Quick actions for empty state
  const quickActions = [
    { label: 'Find a member', query: 'member:', icon: Users, color: 'blue' },
    { label: 'Upcoming events', query: 'event:', icon: Calendar, color: 'orange' },
    { label: 'Recent donations', query: 'donation:', icon: HandCoins, color: 'green' },
    { label: 'Browse ministries', query: 'ministry:', icon: Users2, color: 'indigo' },
  ];

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-xl border transition-all duration-200',
          'border-border/50 bg-background/80 backdrop-blur-sm',
          'hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
          compact ? 'size-10 justify-center p-0' : 'h-10 w-52 px-3 md:w-64',
          className
        )}
        aria-label="Open search"
      >
        <Search className={cn(
          'transition-colors',
          compact ? 'size-4 text-muted-foreground' : 'size-4 text-muted-foreground group-hover:text-primary'
        )} />
        {!compact && (
          <>
            <span className="flex-1 text-left text-sm text-muted-foreground/70">
              {placeholder}
            </span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded-md border border-border/60 bg-muted/60 px-1.5 font-sans text-[10px] font-medium text-muted-foreground/70 sm:flex">
              <Command className="size-2.5" />
              <span>K</span>
            </kbd>
          </>
        )}
      </button>

      {/* Search Sheet - Right Side Full Height */}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          {/* Header with gradient */}
          <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-card via-card to-muted/30">
            {/* Decorative elements */}
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br from-primary/10 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-gradient-to-tr from-primary/5 to-transparent" />

            <SheetHeader className="relative p-4 pb-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                  <Search className="size-5" />
                </div>
                <div>
                  <SheetTitle className="text-base font-semibold">Global Search</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Find members, events, finances, and more
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Search Input */}
            <div className="relative p-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                {isLoading && (
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4">
                    <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search members, events, finances..."
                  className="pl-10 pr-20 h-12 rounded-xl border-2 focus:border-primary/50 transition-colors text-base"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {query && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg hover:bg-muted"
                      onClick={() => setQuery('')}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 gap-1 rounded-lg px-2 text-xs font-medium transition-all',
                      showAI
                        ? 'bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-600 dark:text-violet-400'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setShowAI(!showAI)}
                  >
                    <Sparkles className={cn('size-3.5', showAI && 'text-violet-500')} />
                    AI
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            {query && (
              <div className="px-4 pb-3">
                <ScrollArea className="w-full" type="scroll">
                  <div className="flex gap-1.5">
                    {categoryTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeCategory === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleCategoryChange(tab.id)}
                          className={cn(
                            'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Icon className="size-3.5" />
                          {tab.label}
                          {tab.count > 0 && isActive && (
                            <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {/* AI Suggestions Panel */}
              {showAI && results?.suggestions && results.suggestions.length > 0 && (
                <div className="mb-4 overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5">
                  <div className="border-b border-violet-500/10 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                        <Sparkles className="size-3.5 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                        AI Insights
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    {results.suggestions.map((suggestion, index) => (
                      <AISuggestionCard
                        key={index}
                        suggestion={suggestion}
                        onClick={() => handleSelectSuggestion(suggestion.suggestion)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && (
                <div className="mb-4">
                  <SectionHeader icon={TrendingUp} label="Suggestions" />
                  <div className="space-y-0.5">
                    {suggestions.map((suggestion, index) => (
                      <SuggestionItem
                        key={suggestion}
                        suggestion={suggestion}
                        isSelected={selectedIndex === index}
                        onClick={() => handleSelectSuggestion(suggestion)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches */}
              {showRecentSearches && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SectionHeader icon={Clock} label="Recent" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={clearRecentSearches}
                    >
                      <Trash2 className="size-3" />
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.slice(0, 5).map((search) => (
                      <RecentSearchItem
                        key={search.id}
                        search={search}
                        onClick={() => handleSelectRecentSearch(search)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions (when no query) */}
              {!query && !showRecentSearches && (
                <div className="py-8">
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10">
                      <Search className="size-7 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Search StewardTrack</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Find members, events, transactions, and more
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={() => setQuery(action.query)}
                          className="group flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm"
                        >
                          <div className={cn(
                            'flex size-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110',
                            action.color === 'blue' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                            action.color === 'orange' && 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
                            action.color === 'green' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                            action.color === 'indigo' && 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                          )}>
                            <Icon className="size-4" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{action.label}</span>
                          <ChevronRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {hasResults && (
                <div className="space-y-4">
                  {results.groups
                    .filter(group => activeCategory === 'all' || group.entityType === activeCategory)
                    .filter(group => group.results.length > 0)
                    .map((group) => (
                      <ResultGroup
                        key={group.entityType}
                        group={group}
                        selectedIndex={selectedIndex}
                        baseIndex={suggestions.length + results.groups
                          .slice(0, results.groups.indexOf(group))
                          .reduce((sum, g) => sum + g.results.length, 0)}
                        onSelect={handleSelectResult}
                        onSeeAll={handleSeeAll}
                      />
                    ))}
                </div>
              )}

              {/* Empty State */}
              {showEmptyState && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-4">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
                      <Search className="size-8 text-muted-foreground/50" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-amber-500/10">
                      <X className="size-3.5 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">No results found</h3>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    We couldn&apos;t find anything for &quot;{query}&quot;. Try different keywords or filters.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg text-xs"
                      onClick={() => setActiveCategory('all')}
                    >
                      <Search className="size-3" />
                      Search all
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg text-xs"
                      onClick={() => setQuery('')}
                    >
                      <X className="size-3" />
                      Clear search
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && !results && (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-3">
                      <div className="size-10 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border/40 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="flex size-5 items-center justify-center rounded border border-border/60 bg-background font-mono text-[10px]">↑</kbd>
                  <kbd className="flex size-5 items-center justify-center rounded border border-border/60 bg-background font-mono text-[10px]">↓</kbd>
                  <span className="ml-0.5 text-muted-foreground/70">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="flex h-5 items-center justify-center rounded border border-border/60 bg-background px-1.5 font-mono text-[10px]">↵</kbd>
                  <span className="ml-0.5 text-muted-foreground/70">Select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="flex h-5 items-center justify-center rounded border border-border/60 bg-background px-1 font-mono text-[10px]">Tab</kbd>
                  <span className="ml-0.5 text-muted-foreground/70">Filter</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="flex h-5 items-center justify-center rounded border border-border/60 bg-background px-1 font-mono text-[10px]">Esc</kbd>
                  <span className="ml-0.5 text-muted-foreground/70">Close</span>
                </span>
              </div>
              {hasResults && (
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3 text-amber-500" />
                  <span>{results.totalCount} results</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{results.duration}ms</span>
                </span>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// =====================================================
// Sub-Components
// =====================================================

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function SuggestionItem({
  suggestion,
  isSelected,
  onClick,
}: {
  suggestion: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
        isSelected
          ? 'bg-primary/10 ring-1 ring-primary/20'
          : 'hover:bg-muted/50'
      )}
    >
      <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50">
        <Hash className="size-3.5 text-muted-foreground" />
      </div>
      <span className="flex-1 text-sm font-medium">{suggestion}</span>
      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function RecentSearchItem({
  search,
  onClick,
}: {
  search: RecentSearch;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-muted/50"
    >
      <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50">
        <Clock className="size-3.5 text-muted-foreground" />
      </div>
      <span className="flex-1 truncate text-sm">{search.query}</span>
      {search.entityTypes && search.entityTypes.length > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {ENTITY_LABELS[search.entityTypes[0]] || search.entityTypes[0]}
        </Badge>
      )}
    </button>
  );
}

function ResultGroup({
  group,
  selectedIndex,
  baseIndex,
  onSelect,
  onSeeAll,
}: {
  group: SearchResultGroup;
  selectedIndex: number;
  baseIndex: number;
  onSelect: (item: SearchResultItem) => void;
  onSeeAll: (entityType: SearchEntityType) => void;
}) {
  const Icon = ENTITY_ICONS[group.entityType];
  const colors = ENTITY_COLORS[group.entityType];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('flex size-5 items-center justify-center rounded', colors.bg)}>
          <Icon className={cn('size-3', colors.text)} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {group.label}
        </span>
        <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px] font-normal">
          {group.totalCount}
        </Badge>
      </div>
      <div className="space-y-0.5">
        {group.results.map((item, index) => (
          <ResultItem
            key={item.id}
            item={item}
            isSelected={selectedIndex === baseIndex + index}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
      {group.hasMore && (
        <button
          onClick={() => onSeeAll(group.entityType)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
        >
          See all {group.totalCount} {group.label.toLowerCase()}
          <ArrowRight className="size-3" />
        </button>
      )}
    </div>
  );
}

function ResultItem({
  item,
  isSelected,
  onClick,
}: {
  item: SearchResultItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = ENTITY_ICONS[item.meta.entityType];
  const colors = ENTITY_COLORS[item.meta.entityType];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
        isSelected
          ? 'bg-primary/10 shadow-sm ring-1 ring-primary/20'
          : 'hover:bg-muted/50'
      )}
    >
      {/* Avatar or Icon */}
      {item.imageUrl ? (
        <Avatar className="size-10 ring-2 ring-background">
          <AvatarImage src={item.imageUrl} alt={item.title} className="object-cover" />
          <AvatarFallback className={cn(colors.bg, colors.text)}>
            <Icon className="size-5" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className={cn(
          'flex size-10 items-center justify-center rounded-xl transition-transform',
          colors.bg,
          'group-hover:scale-105'
        )}>
          <Icon className={cn('size-5', colors.text)} />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {item.subtitle && (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        )}
      </div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="hidden gap-1 sm:flex">
          {item.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={cn('h-5 border-0 px-2 text-[10px] font-normal', colors.bg, colors.text)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Arrow */}
      <ChevronRight className={cn(
        'size-4 transition-all',
        isSelected
          ? 'text-primary opacity-100'
          : 'text-muted-foreground opacity-0 group-hover:opacity-100'
      )} />
    </button>
  );
}

function AISuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: AISearchSuggestion;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl bg-white/50 px-3 py-3 text-left transition-all hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
        <Sparkles className="size-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{suggestion.suggestion}</p>
        {suggestion.reason && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{suggestion.reason}</p>
        )}
      </div>
      {suggestion.targetTypes && suggestion.targetTypes.length > 0 && (
        <Badge
          variant="outline"
          className="shrink-0 border-violet-500/20 bg-violet-500/10 text-[10px] text-violet-600 dark:text-violet-400"
        >
          {ENTITY_LABELS[suggestion.targetTypes[0]] || suggestion.targetTypes[0]}
        </Badge>
      )}
    </button>
  );
}

export default GlobalSearch;
