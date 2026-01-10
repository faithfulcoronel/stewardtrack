'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Calendar,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Ministry {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  color: string;
  icon: string;
  isActive: boolean;
  teamCount: number;
  scheduleCount: number;
}

export interface MinistryListViewProps {
  className?: string;
}

const colorOptions = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
];

function MinistryCard({
  ministry,
  onEdit,
  onDelete,
  onManageTeam,
}: {
  ministry: Ministry;
  onEdit: () => void;
  onDelete: () => void;
  onManageTeam: () => void;
}) {
  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: ministry.color + '20' }}
            >
              <Building2
                className="w-5 h-5"
                style={{ color: ministry.color }}
              />
            </div>
            <div>
              <CardTitle className="text-base">{ministry.name}</CardTitle>
              <CardDescription className="text-xs font-mono">
                {ministry.code}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={ministry.isActive ? 'default' : 'secondary'}>
              {ministry.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Ministry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onManageTeam}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Ministry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ministry.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {ministry.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{ministry.teamCount} team members</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{ministry.scheduleCount} schedules</span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/community/planning/scheduler/ministries/${ministry.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MinistryListView({ className }: MinistryListViewProps) {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteMinistry, setDeleteMinistry] = useState<Ministry | null>(null);
  const [editMinistry, setEditMinistry] = useState<Ministry | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#3b82f6',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchMinistries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/community/ministries');

      if (!response.ok) {
        throw new Error('Failed to fetch ministries');
      }

      const result = await response.json();
      setMinistries(result.data || []);
    } catch (error) {
      console.error('Error fetching ministries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ministries. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMinistries();
  }, [fetchMinistries]);

  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      toast({
        title: 'Validation Error',
        description: 'Name and code are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/community/ministries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create ministry');
      }

      toast({
        title: 'Success',
        description: 'Ministry created successfully',
      });

      setIsCreateOpen(false);
      setFormData({ name: '', code: '', description: '', color: '#3b82f6' });
      fetchMinistries();
    } catch (error) {
      console.error('Error creating ministry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create ministry',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editMinistry || !formData.name) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/community/ministries/${editMinistry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update ministry');
      }

      toast({
        title: 'Success',
        description: 'Ministry updated successfully',
      });

      setEditMinistry(null);
      setFormData({ name: '', code: '', description: '', color: '#3b82f6' });
      fetchMinistries();
    } catch (error) {
      console.error('Error updating ministry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update ministry',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteMinistry) return;

    try {
      const response = await fetch(`/api/community/ministries/${deleteMinistry.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete ministry');
      }

      toast({
        title: 'Success',
        description: 'Ministry deleted successfully',
      });

      setDeleteMinistry(null);
      fetchMinistries();
    } catch (error) {
      console.error('Error deleting ministry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ministry',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (ministry: Ministry) => {
    setFormData({
      name: ministry.name,
      code: ministry.code,
      description: ministry.description || '',
      color: ministry.color,
    });
    setEditMinistry(ministry);
  };

  // Filter ministries
  const filteredMinistries = ministries.filter((ministry) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      ministry.name.toLowerCase().includes(query) ||
      ministry.code.toLowerCase().includes(query)
    );
  });

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/community/planning/scheduler">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ministries</h1>
            <p className="text-muted-foreground">
              Manage ministry groups and their teams
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchMinistries} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Ministry
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ministries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ministry Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded mt-2" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMinistries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Ministries Found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? 'No ministries match your search. Try a different term.'
                : 'Get started by creating your first ministry.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Ministry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMinistries.map((ministry) => (
            <MinistryCard
              key={ministry.id}
              ministry={ministry}
              onEdit={() => openEditDialog(ministry)}
              onDelete={() => setDeleteMinistry(ministry)}
              onManageTeam={() => {
                window.location.href = `/admin/community/planning/scheduler/ministries/${ministry.id}`;
              }}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredMinistries.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredMinistries.length} of {ministries.length} ministries
        </p>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ministry</DialogTitle>
            <DialogDescription>
              Add a new ministry to organize teams and schedules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Worship Ministry"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., WORSHIP"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier for this ministry
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the ministry..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      formData.color === color.value
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Ministry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMinistry} onOpenChange={() => setEditMinistry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ministry</DialogTitle>
            <DialogDescription>
              Update ministry information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Worship Ministry"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                disabled
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Code cannot be changed after creation
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the ministry..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      formData.color === color.value
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMinistry(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMinistry} onOpenChange={() => setDeleteMinistry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ministry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteMinistry?.name}&quot;? This will also
              delete all associated team members, schedules, and occurrences. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
