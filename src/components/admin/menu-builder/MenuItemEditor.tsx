"use client";

import { useState, useEffect } from "react";
import { Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { MenuItem } from "@/models/menuItem.model";

interface MenuItemEditorProps {
  item: MenuItem;
  onUpdate: (id: string, updates: Partial<MenuItem>) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}

const ICON_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'reports', label: 'Reports' },
  { value: 'customers', label: 'Customers' },
  { value: 'settings', label: 'Settings' },
  { value: 'support', label: 'Support' },
  { value: 'security', label: 'Security' },
  { value: 'finances', label: 'Finances' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'projects', label: 'Projects' },
  { value: 'uiBlocks', label: 'UI Blocks' },
  { value: 'modules', label: 'Modules' },
  { value: 'docs', label: 'Documentation' },
];

const SECTION_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'Community', label: 'Community' },
  { value: 'Financial', label: 'Financial' },
  { value: 'Administration', label: 'Administration' },
];

const BADGE_VARIANT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
];

/**
 * MenuItemEditor - Form for editing menu item properties
 *
 * Provides all fields for customizing a menu item including
 * label, path, icon, section, permissions, features, and visibility.
 */
export function MenuItemEditor({
  item,
  onUpdate,
  onDelete,
  isSaving,
}: MenuItemEditorProps) {
  const [formData, setFormData] = useState({
    code: item.code,
    label: item.label,
    path: item.path,
    icon: item.icon || 'dashboard',
    section: item.section || 'General',
    permission_key: item.permission_key || '',
    feature_key: item.feature_key || '',
    surface_id: item.surface_id || '',
    badge_text: item.badge_text || '',
    badge_variant: item.badge_variant || 'default',
    description: item.description || '',
    is_visible: item.is_visible,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Update form when item changes
  useEffect(() => {
    setFormData({
      code: item.code,
      label: item.label,
      path: item.path,
      icon: item.icon || 'dashboard',
      section: item.section || 'General',
      permission_key: item.permission_key || '',
      feature_key: item.feature_key || '',
      surface_id: item.surface_id || '',
      badge_text: item.badge_text || '',
      badge_variant: item.badge_variant || 'default',
      description: item.description || '',
      is_visible: item.is_visible,
    });
    setHasChanges(false);
  }, [item]);

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(item.id, formData);
    setHasChanges(false);
  };

  const handleDelete = () => {
    onDelete(item.id);
  };

  return (
    <div className="space-y-6">
      {/* System Item Warning */}
      {item.is_system && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          This is a system menu item and cannot be deleted. Some fields may be restricted.
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Basic Information</h3>

        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            placeholder="menu_item_code"
            disabled={item.is_system}
          />
          <p className="text-xs text-muted-foreground">
            Unique identifier for this menu item
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={formData.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Menu Item Label"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="path">Path</Label>
          <Input
            id="path"
            value={formData.path}
            onChange={(e) => handleChange('path', e.target.value)}
            placeholder="/admin/page"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description (shown as tooltip)"
            rows={2}
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Appearance</h3>

        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Select
            value={formData.icon}
            onValueChange={(value) => handleChange('icon', value)}
          >
            <SelectTrigger id="icon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="section">Section</Label>
          <Select
            value={formData.section}
            onValueChange={(value) => handleChange('section', value)}
          >
            <SelectTrigger id="section">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="badge_text">Badge Text</Label>
            <Input
              id="badge_text"
              value={formData.badge_text}
              onChange={(e) => handleChange('badge_text', e.target.value)}
              placeholder="New"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="badge_variant">Badge Variant</Label>
            <Select
              value={formData.badge_variant}
              onValueChange={(value) => handleChange('badge_variant', value)}
            >
              <SelectTrigger id="badge_variant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BADGE_VARIANT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Access Control</h3>

        <div className="space-y-2">
          <Label htmlFor="permission_key">Permission Key</Label>
          <Input
            id="permission_key"
            value={formData.permission_key}
            onChange={(e) => handleChange('permission_key', e.target.value)}
            placeholder="resource:action"
          />
          <p className="text-xs text-muted-foreground">
            Required permission to view this menu item
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feature_key">Feature Key</Label>
          <Input
            id="feature_key"
            value={formData.feature_key}
            onChange={(e) => handleChange('feature_key', e.target.value)}
            placeholder="advanced_reporting"
          />
          <p className="text-xs text-muted-foreground">
            License feature required to access this item
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="surface_id">Surface ID</Label>
          <Input
            id="surface_id"
            value={formData.surface_id}
            onChange={(e) => handleChange('surface_id', e.target.value)}
            placeholder="surface_code"
          />
          <p className="text-xs text-muted-foreground">
            Metadata surface binding for RBAC integration
          </p>
        </div>
      </div>

      {/* Visibility */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Visibility</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Visible</Label>
            <p className="text-xs text-muted-foreground">
              Show this menu item in the sidebar
            </p>
          </div>
          <Switch
            checked={formData.is_visible}
            onCheckedChange={(checked) => handleChange('is_visible', checked)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t pt-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>

        {!item.is_system && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" disabled={isSaving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{item.label}" from the menu.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
