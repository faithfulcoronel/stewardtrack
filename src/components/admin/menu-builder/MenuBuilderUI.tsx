"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { MenuItem } from "@/models/menuItem.model";
import { MenuTree } from "./MenuTree";
import { MenuItemEditor } from "./MenuItemEditor";
import { SidebarPreview } from "./SidebarPreview";

/**
 * MenuBuilderUI - Main container for the menu builder interface
 *
 * Provides a three-panel layout:
 * - Left: Tree view with drag-drop reordering
 * - Center: Form editor for selected menu item
 * - Right: Live preview of sidebar
 */
export function MenuBuilderUI() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load menu items on mount
  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/menu-items?includeHidden=true&includeSystem=false');

      if (!response.ok) {
        throw new Error('Failed to load menu items');
      }

      const result = await response.json();
      setMenuItems(result.data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load menu items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      setIsSaving(true);

      // Create a new menu item with default values
      const newItem = {
        code: `menu_item_${Date.now()}`,
        label: 'New Menu Item',
        path: '/admin/new-item',
        icon: 'dashboard',
        section: 'General',
        permission_key: '',
        is_visible: true,
      };

      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create menu item');
      }

      const result = await response.json();

      // Add to local state
      setMenuItems([...menuItems, result.data]);
      setSelectedItemId(result.data.id);

      toast({
        title: 'Success',
        description: 'Menu item created successfully',
      });
    } catch (error) {
      console.error('Error creating menu item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create menu item',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update menu item');
      }

      const result = await response.json();

      // Update local state
      setMenuItems(menuItems.map(item =>
        item.id === id ? result.data : item
      ));

      toast({
        title: 'Success',
        description: 'Menu item updated successfully',
      });
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update menu item',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete menu item');
      }

      // Remove from local state
      setMenuItems(menuItems.filter(item => item.id !== id));
      if (selectedItemId === id) {
        setSelectedItemId(null);
      }

      toast({
        title: 'Success',
        description: 'Menu item deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete menu item',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorder = async (reorderedItems: Array<{ id: string; sort_order: number }>) => {
    try {
      const response = await fetch('/api/menu-items/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: reorderedItems }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder menu items');
      }

      // Reload items to get updated sort orders
      await loadMenuItems();

      toast({
        title: 'Success',
        description: 'Menu items reordered successfully',
      });
    } catch (error) {
      console.error('Error reordering menu items:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder menu items',
        variant: 'destructive',
      });
    }
  };

  const selectedItem = menuItems.find(item => item.id === selectedItemId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-12 gap-4 p-4">
      {/* Left Panel - Menu Tree */}
      <div className="col-span-3 flex flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Menu Structure</h2>
          <Button
            size="sm"
            onClick={handleCreateItem}
            disabled={isSaving}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <MenuTree
            items={menuItems}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onReorder={handleReorder}
          />
        </div>
      </div>

      {/* Center Panel - Editor */}
      <div className="col-span-5 flex flex-col rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">
            {selectedItem ? 'Edit Menu Item' : 'Select a menu item'}
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {selectedItem ? (
            <MenuItemEditor
              item={selectedItem}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              isSaving={isSaving}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a menu item from the tree to edit
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="col-span-4 flex flex-col rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Live Preview</h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <SidebarPreview menuItems={menuItems} />
        </div>
      </div>
    </div>
  );
}
