'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  Search,
  Grid3X3,
  List,
  Download,
  ExternalLink,
  Loader2,
  FileImage,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================
export interface MediaItem {
  id: string;
  bucket_name: string;
  file_path: string;
  public_url: string;
  original_filename: string | null;
  mime_type: string;
  file_size_bytes: number;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_field: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface MediaDependency {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  entity_field: string;
}

export interface StorageUsage {
  total_files: number;
  total_bytes: number;
  by_category: Record<string, { count: number; bytes: number }>;
  formatted: {
    totalFiles: string;
    totalBytes: string;
    byCategory: Record<string, { count: string; bytes: string }>;
  };
}

export interface AdminMediaGalleryProps {
  items?: MediaItem[];
  storageUsage?: StorageUsage;
  categories?: { id: string; label: string }[];
  onRefresh?: () => void;
}

// =============================================================================
// Constants
// =============================================================================
const CATEGORY_LABELS: Record<string, string> = {
  church_logos: 'Logos',
  church_images: 'Church Images',
  member_photos: 'Member Photos',
  editor_images: 'Editor Images',
  schedule_covers: 'Schedule Covers',
  other: 'Other',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  church_logos: <ImageIcon className="h-4 w-4" />,
  church_images: <ImageIcon className="h-4 w-4" />,
  member_photos: <FileImage className="h-4 w-4" />,
  editor_images: <FileImage className="h-4 w-4" />,
  schedule_covers: <ImageIcon className="h-4 w-4" />,
  other: <FileImage className="h-4 w-4" />,
};

// =============================================================================
// Helper Functions
// =============================================================================
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// =============================================================================
// Sub-Components
// =============================================================================
interface MediaThumbnailProps {
  item: MediaItem;
  onClick: () => void;
  selected: boolean;
}

// Category color mapping for visual distinction
const CATEGORY_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  church_logos: { bg: 'bg-violet-500/90', text: 'text-violet-50', glow: 'shadow-violet-500/25' },
  church_images: { bg: 'bg-emerald-500/90', text: 'text-emerald-50', glow: 'shadow-emerald-500/25' },
  member_photos: { bg: 'bg-blue-500/90', text: 'text-blue-50', glow: 'shadow-blue-500/25' },
  editor_images: { bg: 'bg-amber-500/90', text: 'text-amber-50', glow: 'shadow-amber-500/25' },
  schedule_covers: { bg: 'bg-rose-500/90', text: 'text-rose-50', glow: 'shadow-rose-500/25' },
  other: { bg: 'bg-slate-500/90', text: 'text-slate-50', glow: 'shadow-slate-500/25' },
};

function MediaThumbnail({ item, onClick, selected }: MediaThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isImage = isImageMimeType(item.mime_type);
  const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;

  return (
    <div
      className={cn(
        'group relative cursor-pointer',
        'rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-background to-muted/50',
        'border border-border/50',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:-translate-y-1',
        'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30',
        'active:scale-[0.98] active:translate-y-0',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] -translate-y-1'
      )}
      onClick={onClick}
    >
      {/* Image Container with Aspect Ratio */}
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        {/* Skeleton loader */}
        {!isLoaded && isImage && !imageError && (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/80 to-muted animate-pulse" />
        )}

        {isImage && !imageError ? (
          <img
            src={item.public_url}
            alt={item.original_filename || 'Media'}
            className={cn(
              'w-full h-full object-cover',
              'transition-all duration-500 ease-out',
              'group-hover:scale-110',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/30">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
              <FileImage className="relative h-12 w-12 text-muted-foreground/60" />
            </div>
          </div>
        )}

        {/* Gradient Overlay - Always visible, stronger on hover */}
        <div className={cn(
          'absolute inset-0',
          'bg-gradient-to-t from-black/80 via-black/20 to-transparent',
          'opacity-60 group-hover:opacity-90',
          'transition-opacity duration-300'
        )} />

        {/* Quick Actions - Floating buttons on hover */}
        <div className={cn(
          'absolute top-3 right-3',
          'flex gap-2',
          'opacity-0 group-hover:opacity-100',
          'translate-y-2 group-hover:translate-y-0',
          'transition-all duration-300 ease-out'
        )}>
          <a
            href={item.public_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className={cn(
              'flex items-center justify-center',
              'w-9 h-9 rounded-full',
              'bg-white/90 dark:bg-black/60',
              'backdrop-blur-md',
              'text-foreground',
              'shadow-lg shadow-black/20',
              'hover:bg-white dark:hover:bg-black/80',
              'hover:scale-110',
              'transition-all duration-200'
            )}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={item.public_url}
            download={item.original_filename || undefined}
            onClick={e => e.stopPropagation()}
            className={cn(
              'flex items-center justify-center',
              'w-9 h-9 rounded-full',
              'bg-white/90 dark:bg-black/60',
              'backdrop-blur-md',
              'text-foreground',
              'shadow-lg shadow-black/20',
              'hover:bg-white dark:hover:bg-black/80',
              'hover:scale-110',
              'transition-all duration-200'
            )}
          >
            <Download className="h-4 w-4" />
          </a>
        </div>

        {/* Category Badge - Floating top left */}
        <div className={cn(
          'absolute top-3 left-3',
          'opacity-0 group-hover:opacity-100',
          '-translate-x-2 group-hover:translate-x-0',
          'transition-all duration-300 ease-out delay-75'
        )}>
          <span className={cn(
            'inline-flex items-center gap-1.5',
            'px-2.5 py-1 rounded-full',
            'text-[10px] font-semibold uppercase tracking-wider',
            'backdrop-blur-md',
            'shadow-lg',
            categoryColor.bg,
            categoryColor.text,
            categoryColor.glow
          )}>
            {CATEGORY_ICONS[item.category]}
            <span className="hidden sm:inline">{CATEGORY_LABELS[item.category] || item.category}</span>
          </span>
        </div>

        {/* Bottom Info Overlay - Glassmorphism */}
        <div className={cn(
          'absolute bottom-0 left-0 right-0',
          'p-3 sm:p-4',
          'transform translate-y-0',
          'transition-transform duration-300'
        )}>
          {/* Filename with truncation */}
          <h3 className={cn(
            'text-sm sm:text-base font-semibold',
            'text-white',
            'truncate',
            'drop-shadow-lg',
            'mb-1'
          )} title={item.original_filename || item.file_path}>
            {item.original_filename || item.file_path.split('/').pop()}
          </h3>

          {/* Meta info row */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              'text-[11px] sm:text-xs font-medium',
              'text-white/70',
              'truncate'
            )}>
              {formatBytes(item.file_size_bytes)}
            </span>

            {/* Mini category indicator for mobile */}
            <span className={cn(
              'inline-flex sm:hidden items-center',
              'px-2 py-0.5 rounded-full',
              'text-[9px] font-bold uppercase',
              categoryColor.bg,
              categoryColor.text
            )}>
              {CATEGORY_LABELS[item.category]?.slice(0, 3) || '...'}
            </span>
          </div>
        </div>
      </div>

      {/* Selection indicator ring animation */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 rounded-2xl animate-pulse ring-2 ring-primary/50" />
        </div>
      )}
    </div>
  );
}

interface StorageUsageCardProps {
  usage: StorageUsage;
}

function StorageUsageCard({ usage }: StorageUsageCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden',
      'rounded-2xl',
      'bg-gradient-to-br from-background via-background to-muted/30',
      'border border-border/50',
      'p-4 sm:p-6',
      'mb-6'
    )}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-500/5 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center',
              'w-12 h-12 rounded-xl',
              'bg-gradient-to-br from-primary/20 to-primary/5',
              'border border-primary/20'
            )}>
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Storage Usage</h3>
              <p className="text-sm text-muted-foreground">
                {usage.formatted.totalFiles} files uploaded
              </p>
            </div>
          </div>

          {/* Total usage pill */}
          <div className={cn(
            'inline-flex items-center gap-2',
            'px-4 py-2 rounded-full',
            'bg-gradient-to-r from-primary/10 to-violet-500/10',
            'border border-primary/20'
          )}>
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              {usage.formatted.totalBytes}
            </span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(usage.formatted.byCategory).map(([category, stats]) => {
            const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
            return (
              <div
                key={category}
                className={cn(
                  'group relative',
                  'p-3 sm:p-4 rounded-xl',
                  'bg-gradient-to-br from-muted/50 to-muted/30',
                  'border border-border/50',
                  'transition-all duration-300',
                  'hover:border-border hover:shadow-md hover:shadow-black/5',
                  'hover:-translate-y-0.5'
                )}
              >
                {/* Category indicator bar */}
                <div className={cn(
                  'absolute top-0 left-3 right-3 h-1 rounded-b-full',
                  'transition-all duration-300',
                  'opacity-60 group-hover:opacity-100',
                  categoryColor.bg
                )} />

                <div className="flex items-center gap-2 mb-2 mt-1">
                  <span className={cn(
                    'flex items-center justify-center',
                    'w-7 h-7 rounded-lg',
                    'transition-transform duration-300 group-hover:scale-110',
                    categoryColor.bg,
                    categoryColor.text
                  )}>
                    {CATEGORY_ICONS[category]}
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-foreground">{stats.bytes}</div>
                  <div className="text-xs text-muted-foreground">{stats.count} files</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MediaDetailDialogProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (item: MediaItem) => void;
}

function MediaDetailDialog({ item, open, onOpenChange, onDelete }: MediaDetailDialogProps) {
  const [imageError, setImageError] = useState(false);

  if (!item) return null;

  const isImage = isImageMimeType(item.mime_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{item.original_filename || 'Media Details'}</DialogTitle>
          <DialogDescription>View media details and manage this file</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
            {isImage && !imageError ? (
              <img
                src={item.public_url}
                alt={item.original_filename || 'Media'}
                className="w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileImage className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Category</p>
              <p>{CATEGORY_LABELS[item.category] || item.category}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Size</p>
              <p>{formatBytes(item.file_size_bytes)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Type</p>
              <p>{item.mime_type}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Uploaded</p>
              <p>{formatDate(item.uploaded_at)}</p>
            </div>
            {item.entity_type && (
              <div className="col-span-2">
                <p className="font-medium text-muted-foreground">Linked To</p>
                <p>{item.entity_type} ({item.entity_field})</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" asChild>
            <a href={item.public_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={item.public_url} download={item.original_filename || undefined}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
          <Button variant="destructive" onClick={() => onDelete(item)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmDialogProps {
  item: MediaItem | null;
  dependencies: MediaDependency[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (force: boolean) => void;
}

function DeleteConfirmDialog({
  item,
  dependencies,
  loading,
  open,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const hasDependencies = dependencies.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasDependencies && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            Delete Media
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasDependencies ? (
              <div className="space-y-3">
                <p>
                  This media is used by <strong>{dependencies.length}</strong> item(s). Deleting it may break these references:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 bg-muted p-3 rounded-lg">
                  {dependencies.slice(0, 5).map((dep, i) => (
                    <li key={i}>
                      {dep.entity_name} ({dep.entity_type}.{dep.entity_field})
                    </li>
                  ))}
                  {dependencies.length > 5 && (
                    <li className="text-muted-foreground">...and {dependencies.length - 5} more</li>
                  )}
                </ul>
                <p className="text-amber-600 font-medium">
                  Are you sure you want to delete this media anyway?
                </p>
              </div>
            ) : (
              <p>
                Are you sure you want to delete &quot;{item?.original_filename || 'this media'}&quot;? This action cannot be undone.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(hasDependencies)}
            disabled={loading}
            className={hasDependencies ? 'bg-amber-600 hover:bg-amber-700' : 'bg-destructive hover:bg-destructive/90'}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {hasDependencies ? 'Delete Anyway' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================
export function AdminMediaGallery({
  items: initialItems = [],
  storageUsage: initialUsage,
  onRefresh,
}: AdminMediaGalleryProps) {
  // State - use props if provided, otherwise initialize empty and fetch
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | undefined>(initialUsage);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);
  const [dependencies, setDependencies] = useState<MediaDependency[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Only sync with props if we received actual data from props (not default empty array)
  // This prevents overwriting fetched data with empty prop values
  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems);
      setHasFetched(true);
    }
  }, [initialItems]);

  useEffect(() => {
    if (initialUsage) {
      setStorageUsage(initialUsage);
      setHasFetched(true);
    }
  }, [initialUsage]);

  // Fetch gallery data
  const fetchGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }

      const response = await fetch(`/api/media/gallery?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch gallery');

      const result = await response.json();
      const data = result.data || result;

      setItems(data.items || []);
      setStorageUsage(data.storageUsage);
      setHasFetched(true);
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
      toast.error('Failed to load media gallery');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  // Fetch on initial mount if no items were provided via props
  useEffect(() => {
    if (!hasFetched && initialItems.length === 0 && !initialUsage) {
      fetchGallery();
    }
  }, [hasFetched, initialItems.length, initialUsage, fetchGallery]);

  // Handle delete
  const handleDeleteClick = useCallback(async (item: MediaItem) => {
    setItemToDelete(item);
    setShowDetailDialog(false);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/media/${item.id}/dependencies`);
      if (!response.ok) throw new Error('Failed to check dependencies');
      const result = await response.json();
      // Handle nested data structure from API
      const data = result.data || result;
      setDependencies(data.dependencies || []);
    } catch (error) {
      console.error('Failed to check dependencies:', error);
      setDependencies([]);
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(true);
    }
  }, []);

  const handleDeleteConfirm = useCallback(async (force: boolean) => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/media/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete media');
      }

      toast.success('Media deleted successfully');
      setShowDeleteDialog(false);
      setItemToDelete(null);
      setDependencies([]);

      // Refresh gallery
      if (onRefresh) {
        onRefresh();
      } else {
        fetchGallery();
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete media');
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, onRefresh, fetchGallery]);

  // Filter items
  const filteredItems = items.filter(item => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filename = (item.original_filename || item.file_path).toLowerCase();
      if (!filename.includes(query)) return false;
    }
    // Category filter
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Get unique categories from items
  const availableCategories = Array.from(new Set(items.map(item => item.category)));

  return (
    <div className="space-y-6">
      {/* Storage Usage */}
      {storageUsage && <StorageUsageCard usage={storageUsage} />}

      {/* Toolbar */}
      <div className={cn(
        'flex flex-col lg:flex-row gap-4',
        'items-stretch lg:items-center justify-between',
        'p-4 rounded-xl',
        'bg-gradient-to-r from-muted/30 to-transparent',
        'border border-border/50'
      )}>
        {/* Search and Refresh */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(
                'pl-11 pr-10 h-11',
                'rounded-xl',
                'border-border/50',
                'bg-background/50 backdrop-blur-sm',
                'focus:bg-background focus:border-primary/50',
                'transition-all duration-300'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2',
                  'p-1 rounded-full',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-muted',
                  'transition-colors duration-200'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchGallery()}
            disabled={isLoading}
            className={cn(
              'h-11 w-11 rounded-xl',
              'border-border/50',
              'hover:bg-primary/10 hover:border-primary/50 hover:text-primary',
              'transition-all duration-300'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0">
          {/* Category Pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-4 py-2 rounded-full',
                'text-sm font-medium',
                'transition-all duration-300',
                'whitespace-nowrap',
                categoryFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              All
            </button>
            {availableCategories.map(cat => {
              const categoryColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'px-3 py-2 rounded-full',
                    'text-sm font-medium',
                    'transition-all duration-300',
                    'whitespace-nowrap',
                    categoryFilter === cat
                      ? cn(categoryColor.bg, categoryColor.text, 'shadow-md', categoryColor.glow)
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {CATEGORY_ICONS[cat]}
                  <span className="hidden sm:inline">{CATEGORY_LABELS[cat] || cat}</span>
                </button>
              );
            })}
          </div>

          {/* View Toggle */}
          <div className={cn(
            'flex items-center',
            'p-1 rounded-xl',
            'bg-muted/50',
            'border border-border/50'
          )}>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center justify-center',
                'w-9 h-9 rounded-lg',
                'transition-all duration-300',
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center justify-center',
                'w-9 h-9 rounded-lg',
                'transition-all duration-300',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gallery */}
      {isLoading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full" />
            <div className={cn(
              'relative flex items-center justify-center',
              'w-20 h-20 rounded-2xl',
              'bg-gradient-to-br from-muted to-muted/50',
              'border border-border/50'
            )}>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse">
            Loading your media...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={cn(
          'flex flex-col items-center justify-center',
          'py-16 sm:py-24 px-6',
          'text-center'
        )}>
          <div className="relative mb-6">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-violet-500/10 to-primary/10 rounded-full" />
            <div className={cn(
              'relative flex items-center justify-center',
              'w-24 h-24 rounded-3xl',
              'bg-gradient-to-br from-muted to-muted/30',
              'border border-border/50'
            )}>
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {searchQuery || categoryFilter !== 'all' ? 'No matches found' : 'No media yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters to find what you\'re looking for'
              : 'Your uploaded images and files will appear here. Start by uploading some media.'}
          </p>
          {(searchQuery || categoryFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="mt-6 rounded-full"
            >
              <X className="h-4 w-4 mr-2" />
              Clear filters
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${Math.min(index * 50, 300)}ms`, animationFillMode: 'backwards' }}
            >
              <MediaThumbnail
                item={item}
                selected={selectedItem?.id === item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setShowDetailDialog(true);
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => {
            const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;
            return (
              <div
                key={item.id}
                className={cn(
                  'group relative',
                  'flex items-center gap-4',
                  'p-3 sm:p-4',
                  'rounded-xl',
                  'bg-gradient-to-r from-background to-muted/30',
                  'border border-border/50',
                  'cursor-pointer',
                  'transition-all duration-300 ease-out',
                  'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
                  'hover:border-border',
                  'hover:-translate-x-1',
                  'active:translate-x-0 active:scale-[0.99]',
                  'animate-in fade-in-0 slide-in-from-right-4 duration-300',
                  selectedItem?.id === item.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background -translate-x-1'
                )}
                style={{ animationDelay: `${Math.min(index * 30, 200)}ms`, animationFillMode: 'backwards' }}
                onClick={() => {
                  setSelectedItem(item);
                  setShowDetailDialog(true);
                }}
              >
                {/* Thumbnail with overlay */}
                <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  {isImageMimeType(item.mime_type) ? (
                    <img
                      src={item.public_url}
                      alt={item.original_filename || 'Media'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <FileImage className="h-6 w-6 text-muted-foreground/60" />
                    </div>
                  )}
                  {/* Category color indicator bar */}
                  <div className={cn(
                    'absolute bottom-0 left-0 right-0 h-1',
                    categoryColor.bg
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate text-foreground group-hover:text-primary transition-colors">
                    {item.original_filename || item.file_path.split('/').pop()}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    <span className="font-medium">{formatBytes(item.file_size_bytes)}</span>
                    <span className="text-border">•</span>
                    <span>{formatDate(item.uploaded_at)}</span>
                  </div>
                </div>

                {/* Category badge */}
                <div className="hidden sm:flex items-center gap-3">
                  <span className={cn(
                    'inline-flex items-center gap-1.5',
                    'px-3 py-1.5 rounded-full',
                    'text-xs font-semibold',
                    'backdrop-blur-sm',
                    'transition-all duration-300',
                    'group-hover:scale-105',
                    categoryColor.bg,
                    categoryColor.text
                  )}>
                    {CATEGORY_ICONS[item.category]}
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                </div>

                {/* Mobile category indicator */}
                <div className="sm:hidden">
                  <span className={cn(
                    'inline-flex items-center justify-center',
                    'w-8 h-8 rounded-full',
                    'text-xs font-bold',
                    categoryColor.bg,
                    categoryColor.text
                  )}>
                    {CATEGORY_LABELS[item.category]?.charAt(0) || '?'}
                  </span>
                </div>

                {/* Hover arrow indicator */}
                <div className="hidden sm:flex items-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <MediaDetailDialog
        item={selectedItem}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onDelete={handleDeleteClick}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        item={itemToDelete}
        dependencies={dependencies}
        loading={isDeleting}
        open={showDeleteDialog}
        onOpenChange={open => {
          setShowDeleteDialog(open);
          if (!open) {
            setItemToDelete(null);
            setDependencies([]);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
