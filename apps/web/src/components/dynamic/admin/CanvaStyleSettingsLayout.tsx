'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Church,
  User,
  Bell,
  Palette,
  Users,
  Link2,
  CreditCard,
  Shield,
  Settings,
  ChevronRight,
  Image,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface SettingsNavItem {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  badge?: string | number;
  disabled?: boolean;
}

export interface SettingsNavSection {
  id: string;
  title: string;
  items: SettingsNavItem[];
}

export interface CanvaStyleSettingsLayoutProps {
  /** Navigation sections with items */
  sections: SettingsNavSection[];
  /** Default active item ID */
  defaultItem?: string;
  /** Title displayed at the top of the main content area */
  pageTitle?: string;
  /** Children are rendered as an array matching navigation item order */
  children?: React.ReactNode;
  /** Callback when navigation item changes */
  onItemChange?: (itemId: string) => void;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<string, LucideIcon> = {
  church: Church,
  user: User,
  bell: Bell,
  palette: Palette,
  users: Users,
  link: Link2,
  'credit-card': CreditCard,
  shield: Shield,
  settings: Settings,
  image: Image,
  zap: Zap,
};

function getIcon(iconName?: string): LucideIcon {
  if (!iconName) return Settings;
  return iconMap[iconName] || Settings;
}

// ============================================================================
// Navigation Item Component
// ============================================================================

interface NavItemProps {
  item: SettingsNavItem;
  isActive: boolean;
  onClick: () => void;
}

function NavItem({ item, isActive, onClick }: NavItemProps) {
  const Icon = getIcon(item.icon);

  return (
    <button
      onClick={onClick}
      disabled={item.disabled}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200',
        'hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
        !isActive && 'text-muted-foreground hover:text-foreground',
        item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
      )}
    >
      <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
      <span className={cn('flex-1 text-sm font-medium truncate', isActive && 'text-primary-foreground')}>
        {item.label}
      </span>
      {item.badge && (
        <span
          className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Navigation Section Component
// ============================================================================

interface NavSectionProps {
  section: SettingsNavSection;
  activeItemId: string;
  onItemClick: (itemId: string) => void;
}

function NavSection({ section, activeItemId, onItemClick }: NavSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {section.title}
      </h3>
      <nav className="space-y-1">
        {section.items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeItemId === item.id}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </nav>
    </div>
  );
}

// ============================================================================
// Mobile Navigation
// ============================================================================

interface MobileNavProps {
  sections: SettingsNavSection[];
  activeItemId: string;
  onItemClick: (itemId: string) => void;
}

function MobileNav({ sections, activeItemId, onItemClick }: MobileNavProps) {
  const allItems = sections.flatMap((s) => s.items);
  const activeItem = allItems.find((i) => i.id === activeItemId);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card border rounded-lg"
      >
        <div className="flex items-center gap-3">
          {activeItem && React.createElement(getIcon(activeItem.icon), { className: 'h-4 w-4 text-muted-foreground' })}
          <span className="font-medium">{activeItem?.label || 'Select section'}</span>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 bg-card border rounded-lg overflow-hidden"
          >
            <div className="p-2">
              {sections.map((section) => (
                <div key={section.id} className="mb-4 last:mb-0">
                  <h4 className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">{section.title}</h4>
                  {section.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={activeItemId === item.id}
                      onClick={() => {
                        onItemClick(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CanvaStyleSettingsLayout({
  sections,
  defaultItem,
  pageTitle,
  children,
  onItemChange,
}: CanvaStyleSettingsLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get all items flattened for index lookup
  const allItems = sections.flatMap((s) => s.items);

  // Determine initial active item
  const urlSection = searchParams.get('section');
  const initialItem = urlSection || defaultItem || allItems[0]?.id || '';

  const [activeItemId, setActiveItemId] = useState(initialItem);

  // Sync with URL changes
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && section !== activeItemId) {
      setActiveItemId(section);
    }
  }, [searchParams, activeItemId]);

  // Handle item click
  const handleItemClick = useCallback(
    (itemId: string) => {
      setActiveItemId(itemId);

      // Update URL without full navigation
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', itemId);
      router.push(`?${params.toString()}`, { scroll: false });

      onItemChange?.(itemId);
    },
    [router, searchParams, onItemChange]
  );

  // Get active item index for children rendering
  const activeIndex = allItems.findIndex((item) => item.id === activeItemId);
  const activeItem = allItems[activeIndex];

  // Children as array
  const childrenArray = React.Children.toArray(children);
  const activeContent = activeIndex >= 0 ? childrenArray[activeIndex] : null;

  // Get the display title
  const displayTitle = pageTitle || activeItem?.label || 'Settings';

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 relative">
      {/* Desktop Sidebar - Fixed/Sticky */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-6 h-[calc(100vh-120px)]">
          <nav className="h-full overflow-y-auto pr-2 pb-8">
            {sections.map((section) => (
              <NavSection
                key={section.id}
                section={section}
                activeItemId={activeItemId}
                onItemClick={handleItemClick}
              />
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <MobileNav sections={sections} activeItemId={activeItemId} onItemClick={handleItemClick} />

      {/* Main Content - Flexible width to respond to canvas mode */}
      <main className="flex-1 min-w-0">
        {/* Page Title */}
        <motion.h1
          key={displayTitle}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-foreground mb-8"
        >
          {displayTitle}
        </motion.h1>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItemId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeContent}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default CanvaStyleSettingsLayout;
