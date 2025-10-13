"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, GripVertical, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/models/menuItem.model";

interface MenuTreeProps {
  items: MenuItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onReorder: (reorderedItems: Array<{ id: string; sort_order: number }>) => void;
}

interface MenuTreeNode {
  item: MenuItem;
  children: MenuTreeNode[];
}

/**
 * MenuTree - Hierarchical tree view of menu items with drag-drop
 *
 * Displays menu items in a collapsible tree structure grouped by section.
 * Supports drag-and-drop reordering and visual indicators for visibility.
 */
export function MenuTree({
  items,
  selectedItemId,
  onSelectItem,
  onReorder,
}: MenuTreeProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['General', 'Community', 'Financial', 'Administration'])
  );
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Group items by section
  const sections = new Map<string, MenuItem[]>();
  for (const item of items) {
    const section = item.section || 'General';
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section)!.push(item);
  }

  // Sort items by sort_order
  for (const [_, sectionItems] of sections) {
    sectionItems.sort((a, b) => a.sort_order - b.sort_order);
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetItemId: string, section: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      return;
    }

    const sectionItems = sections.get(section) || [];
    const draggedIndex = sectionItems.findIndex(item => item.id === draggedItemId);
    const targetIndex = sectionItems.findIndex(item => item.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    // Reorder items
    const reordered = [...sectionItems];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Calculate new sort orders
    const reorderedWithSortOrder = reordered.map((item, index) => ({
      id: item.id,
      sort_order: (index + 1) * 10,
    }));

    onReorder(reorderedWithSortOrder);
    setDraggedItemId(null);
  };

  // Define section order
  const sectionOrder = ['General', 'Community', 'Financial', 'Administration'];
  const orderedSections = sectionOrder.filter(section => sections.has(section));

  // Add any remaining sections not in the predefined order
  for (const [section] of sections) {
    if (!sectionOrder.includes(section)) {
      orderedSections.push(section);
    }
  }

  return (
    <div className="space-y-2">
      {orderedSections.map((section) => {
        const sectionItems = sections.get(section) || [];
        const isExpanded = expandedSections.has(section);

        return (
          <div key={section} className="space-y-1">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>{section}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {sectionItems.length}
              </span>
            </button>

            {/* Section Items */}
            {isExpanded && (
              <div className="ml-4 space-y-1">
                {sectionItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item.id, section)}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-move",
                      "hover:bg-accent",
                      selectedItemId === item.id && "bg-accent font-medium",
                      draggedItemId === item.id && "opacity-50"
                    )}
                    onClick={() => onSelectItem(item.id)}
                  >
                    <GripVertical className="h-4 w-4 flex-none text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {!item.is_visible && (
                      <EyeOff className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                    )}
                    {item.is_system && (
                      <span className="flex-none text-xs text-muted-foreground">
                        (system)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {orderedSections.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No menu items yet. Click "Add Item" to create one.
        </div>
      )}
    </div>
  );
}
