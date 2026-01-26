'use client';

/**
 * ================================================================================
 * FLOATING PANEL COMPONENT - REUSABLE SEARCH/SELECTOR PANEL
 * ================================================================================
 *
 * A beautiful, reusable panel component with consistent design patterns.
 * Used by GlobalSearch, RecipientSelector, and other selector components.
 *
 * Features:
 * - Consistent glass morphism design
 * - Smooth framer-motion animations
 * - Configurable header, search, tabs, content, footer
 * - Keyboard navigation support
 * - Click outside to close
 * - Body scroll lock when open as overlay
 *
 * ================================================================================
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// =====================================================
// Animation Variants
// =====================================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -10,
    transition: { duration: 0.15 },
  },
};

// =====================================================
// Types
// =====================================================

export interface FloatingPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when the panel should close */
  onOpenChange: (open: boolean) => void;
  /** Panel title for accessibility */
  title: string;
  /** Panel description for accessibility */
  description?: string;
  /** Whether to render as overlay (modal) or inline */
  mode?: 'overlay' | 'inline';
  /** Custom class name for the panel container */
  className?: string;
  /** Children to render inside the panel */
  children: React.ReactNode;
}

export interface FloatingPanelHeaderProps {
  /** Icon element to display */
  icon?: React.ReactNode;
  /** Header title */
  title: string;
  /** Header subtitle/description */
  subtitle?: string;
  /** Right side action element */
  action?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export interface FloatingPanelSearchProps {
  /** Search input value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether search is loading */
  isLoading?: boolean;
  /** Keyboard event handler */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Right side action element (e.g., AI toggle) */
  action?: React.ReactNode;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Auto focus the input */
  autoFocus?: boolean;
  /** Ref for the input element */
  inputRef?: React.RefObject<HTMLInputElement>;
}

export interface FloatingPanelTabsProps<T extends string> {
  /** Currently active tab */
  value: T;
  /** Callback when tab changes */
  onValueChange: (value: T) => void;
  /** Tab items */
  tabs: Array<{
    id: T;
    label: string;
    shortLabel?: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }>;
  /** Custom class name */
  className?: string;
}

export interface FloatingPanelContentProps {
  /** Content to render */
  children: React.ReactNode;
  /** Fixed height for the content area */
  height?: string;
  /** Custom class name */
  className?: string;
}

export interface FloatingPanelFooterProps {
  /** Footer content */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
}

// =====================================================
// Context
// =====================================================

interface FloatingPanelContextValue {
  open: boolean;
  onClose: () => void;
  mode: 'overlay' | 'inline';
}

const FloatingPanelContext = React.createContext<FloatingPanelContextValue | null>(null);

function useFloatingPanel() {
  const context = React.useContext(FloatingPanelContext);
  if (!context) {
    throw new Error('FloatingPanel components must be used within FloatingPanel');
  }
  return context;
}

// =====================================================
// Main Component
// =====================================================

function FloatingPanelRoot({
  open,
  onOpenChange,
  title,
  description,
  mode = 'overlay',
  className,
  children,
}: FloatingPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  const handleClose = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Close on click outside (overlay mode only)
  React.useEffect(() => {
    if (mode !== 'overlay' || !open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, mode, handleClose]);

  // Lock body scroll when open (overlay mode only)
  React.useEffect(() => {
    if (mode !== 'overlay' || !open) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, mode]);

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  const contextValue = React.useMemo(
    () => ({ open, onClose: handleClose, mode }),
    [open, handleClose, mode]
  );

  // Inline mode - render directly
  if (mode === 'inline') {
    return (
      <FloatingPanelContext.Provider value={contextValue}>
        <div
          ref={panelRef}
          className={cn('relative', className)}
          role="dialog"
          aria-label={title}
          aria-describedby={description ? 'floating-panel-desc' : undefined}
        >
          {description && (
            <span id="floating-panel-desc" className="sr-only">
              {description}
            </span>
          )}
          {children}
        </div>
      </FloatingPanelContext.Provider>
    );
  }

  // Overlay mode - render with backdrop and animations
  return (
    <FloatingPanelContext.Provider value={contextValue}>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={handleClose}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              ref={panelRef}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'fixed left-1/2 top-[8%] z-50 w-full max-w-2xl -translate-x-1/2 px-4 sm:px-0',
                className
              )}
              role="dialog"
              aria-label={title}
              aria-describedby={description ? 'floating-panel-desc' : undefined}
            >
              {description && (
                <span id="floating-panel-desc" className="sr-only">
                  {description}
                </span>
              )}
              <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background shadow-2xl">
                {/* Gradient Background Effect */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />
                  <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-tl from-violet-500/10 to-transparent blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative">{children}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </FloatingPanelContext.Provider>
  );
}

// =====================================================
// Header Component
// =====================================================

function FloatingPanelHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: FloatingPanelHeaderProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-card via-card to-muted/30 p-4',
        className
      )}
    >
      {/* Decorative elements */}
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br from-primary/10 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-gradient-to-tr from-primary/5 to-transparent" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-base">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

// =====================================================
// Search Component
// =====================================================

function FloatingPanelSearch({
  value,
  onChange,
  placeholder = 'Search...',
  isLoading = false,
  onKeyDown,
  action,
  disabled = false,
  className,
  autoFocus = false,
  inputRef,
}: FloatingPanelSearchProps) {
  const internalRef = React.useRef<HTMLInputElement>(null);
  const ref = inputRef || internalRef;

  // Auto focus when mounted
  React.useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => ref.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, ref]);

  return (
    <div className={cn('relative border-b border-border/40 bg-background/95', className)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative flex-shrink-0">
          <Search className="size-5 text-muted-foreground" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 border-0 bg-transparent text-base font-medium shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
          autoFocus={autoFocus}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 flex-shrink-0 rounded-lg hover:bg-muted"
            onClick={() => onChange('')}
          >
            <X className="size-4" />
          </Button>
        )}
        {action && (
          <>
            <div className="h-6 w-px flex-shrink-0 bg-border/60" />
            {action}
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Tabs Component
// =====================================================

function FloatingPanelTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  className,
}: FloatingPanelTabsProps<T>) {
  return (
    <div className={cn('border-b border-border/40 bg-background/95', className)}>
      <ScrollArea className="w-full" type="scroll">
        <div className="flex gap-1.5 px-4 py-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = value === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onValueChange(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && isActive && (
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
  );
}

// =====================================================
// Content Component
// =====================================================

function FloatingPanelContent({
  children,
  height = 'max-h-[60vh] min-h-[200px]',
  className,
}: FloatingPanelContentProps) {
  return (
    <ScrollArea className={cn(height, className)}>
      <div className="relative p-3">{children}</div>
    </ScrollArea>
  );
}

// =====================================================
// Footer Component
// =====================================================

function FloatingPanelFooter({ children, className }: FloatingPanelFooterProps) {
  return (
    <div
      className={cn(
        'relative border-t border-border/40 bg-muted/30 px-4 py-2.5',
        className
      )}
    >
      {children}
    </div>
  );
}

// =====================================================
// Empty State Component
// =====================================================

interface FloatingPanelEmptyProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function FloatingPanelEmpty({
  icon,
  title,
  description,
  action,
  className,
}: FloatingPanelEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="relative mb-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// =====================================================
// Loading State Component
// =====================================================

interface FloatingPanelLoadingProps {
  count?: number;
  className?: string;
}

function FloatingPanelLoading({ count = 3, className }: FloatingPanelLoadingProps) {
  return (
    <div className={cn('space-y-3 py-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-3">
          <div className="size-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// Section Header Component
// =====================================================

interface FloatingPanelSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action?: React.ReactNode;
  className?: string;
}

function FloatingPanelSection({
  icon: Icon,
  label,
  action,
  className,
}: FloatingPanelSectionProps) {
  return (
    <div className={cn('mb-2 flex items-center justify-between px-2', className)}>
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {action}
    </div>
  );
}

// =====================================================
// Exports
// =====================================================

export const FloatingPanel = Object.assign(FloatingPanelRoot, {
  Header: FloatingPanelHeader,
  Search: FloatingPanelSearch,
  Tabs: FloatingPanelTabs,
  Content: FloatingPanelContent,
  Footer: FloatingPanelFooter,
  Empty: FloatingPanelEmpty,
  Loading: FloatingPanelLoading,
  Section: FloatingPanelSection,
});

export {
  FloatingPanelHeader,
  FloatingPanelSearch,
  FloatingPanelTabs,
  FloatingPanelContent,
  FloatingPanelFooter,
  FloatingPanelEmpty,
  FloatingPanelLoading,
  FloatingPanelSection,
  useFloatingPanel,
};
