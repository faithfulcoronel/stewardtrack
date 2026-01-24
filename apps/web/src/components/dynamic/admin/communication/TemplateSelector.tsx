"use client";

/**
 * ================================================================================
 * TEMPLATE SELECTOR COMPONENT
 * ================================================================================
 *
 * Browse and select message templates for communication campaigns.
 * Supports filtering by category and channel, with template preview.
 *
 * ================================================================================
 */

import * as React from "react";
import {
  FileText,
  Search,
  Mail,
  Phone,
  Sparkles,
  Calendar,
  Heart,
  Bell,
  UserPlus,
  Gift,
  PartyPopper,
  Loader2,
  Check,
  Eye,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";

/** Template category types */
export type TemplateCategory =
  | "welcome"
  | "event"
  | "newsletter"
  | "prayer"
  | "announcement"
  | "follow-up"
  | "birthday"
  | "anniversary"
  | "custom";

/** Message template definition */
export interface MessageTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  channels: ("email" | "sms")[];
  subject?: string;
  contentHtml?: string;
  contentText?: string;
  isAiGenerated?: boolean;
  usageCount?: number;
  createdAt?: string;
}

export interface TemplateSelectorProps {
  /** Available templates */
  templates?: MessageTemplate[];
  /** Currently selected template ID */
  value?: string;
  /** Callback when template is selected */
  onSelect?: (template: MessageTemplate) => void;
  /** Filter by channel */
  channelFilter?: "email" | "sms" | "all";
  /** Whether templates are loading */
  isLoading?: boolean;
  /** Callback to generate AI template */
  onGenerateTemplate?: (category: TemplateCategory) => Promise<MessageTemplate>;
  /** Whether AI generation is available */
  aiEnabled?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional class name */
  className?: string;
}

interface CategoryConfig {
  category: TemplateCategory;
  label: string;
  icon: React.ElementType;
  color: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { category: "welcome", label: "Welcome", icon: UserPlus, color: "text-green-500" },
  { category: "event", label: "Event", icon: Calendar, color: "text-blue-500" },
  { category: "newsletter", label: "Newsletter", icon: FileText, color: "text-purple-500" },
  { category: "prayer", label: "Prayer", icon: Heart, color: "text-red-500" },
  { category: "announcement", label: "Announcement", icon: Bell, color: "text-orange-500" },
  { category: "follow-up", label: "Follow-up", icon: Mail, color: "text-cyan-500" },
  { category: "birthday", label: "Birthday", icon: Gift, color: "text-pink-500" },
  { category: "anniversary", label: "Anniversary", icon: PartyPopper, color: "text-amber-500" },
  { category: "custom", label: "Custom", icon: Sparkles, color: "text-gray-500" },
];

function getCategoryConfig(category: TemplateCategory): CategoryConfig {
  return (
    CATEGORY_CONFIGS.find((c) => c.category === category) || {
      category: "custom",
      label: "Custom",
      icon: FileText,
      color: "text-gray-500",
    }
  );
}

export function TemplateSelector({
  templates = [],
  value,
  onSelect,
  channelFilter = "all",
  isLoading = false,
  onGenerateTemplate,
  aiEnabled = true,
  disabled = false,
  className,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<TemplateCategory | "all">("all");
  const [previewTemplate, setPreviewTemplate] = React.useState<MessageTemplate | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatingCategory, setGeneratingCategory] = React.useState<TemplateCategory | null>(null);

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((template) => {
      // Channel filter
      if (channelFilter !== "all" && !template.channels.includes(channelFilter)) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && template.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = template.name.toLowerCase().includes(query);
        const matchesDescription = template.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [templates, channelFilter, categoryFilter, searchQuery]);

  // Group templates by category
  const groupedTemplates = React.useMemo(() => {
    const groups: Record<string, MessageTemplate[]> = {};

    filteredTemplates.forEach((template) => {
      const cat = template.category;
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(template);
    });

    return groups;
  }, [filteredTemplates]);

  // Handle template selection
  const handleSelect = React.useCallback(
    (template: MessageTemplate) => {
      onSelect?.(template);
    },
    [onSelect]
  );

  // Handle AI template generation
  const handleGenerate = React.useCallback(
    async (category: TemplateCategory) => {
      if (!onGenerateTemplate || isGenerating) return;

      setIsGenerating(true);
      setGeneratingCategory(category);

      try {
        const newTemplate = await onGenerateTemplate(category);
        handleSelect(newTemplate);
      } catch (error) {
        console.error("Failed to generate template:", error);
      } finally {
        setIsGenerating(false);
        setGeneratingCategory(null);
      }
    },
    [onGenerateTemplate, isGenerating, handleSelect]
  );

  // Get unique categories from templates
  const availableCategories = React.useMemo(() => {
    const categories = new Set(templates.map((t) => t.category));
    return CATEGORY_CONFIGS.filter((c) => categories.has(c.category));
  }, [templates]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium">Message Templates</span>
        <Badge variant="outline">{templates.length}</Badge>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
            disabled={disabled}
          />
        </div>

        {/* Category Filter */}
        {availableCategories.length > 1 && (
          <Tabs
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as TemplateCategory | "all")}
          >
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              {availableCategories.map((config) => {
                const Icon = config.icon;
                return (
                  <TabsTrigger key={config.category} value={config.category} className="text-xs gap-1">
                    <Icon className={cn("h-3 w-3", config.color)} />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          <div>
            <p className="font-medium text-muted-foreground">No templates found</p>
            <p className="text-sm text-muted-foreground/70">
              {searchQuery
                ? "Try a different search term"
                : "Create your first template to get started"}
            </p>
          </div>
          {aiEnabled && onGenerateTemplate && (
            <Button
              variant="outline"
              onClick={() => handleGenerate("custom")}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate with AI
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea className="h-80">
          <div className="space-y-4 pr-4">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
              const config = getCategoryConfig(category as TemplateCategory);
              const Icon = config.icon;

              return (
                <div key={category} className="space-y-2">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    {config.label}
                  </div>

                  {/* Template Cards */}
                  <div className="grid gap-2">
                    {categoryTemplates.map((template) => {
                      const isSelected = value === template.id;

                      return (
                        <div
                          key={template.id}
                          className={cn(
                            "relative border rounded-lg p-3 transition-all cursor-pointer",
                            "hover:border-primary/50 hover:bg-muted/30",
                            isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                            disabled && "opacity-50 pointer-events-none"
                          )}
                          onClick={() => handleSelect(template)}
                        >
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}

                          {/* Template info */}
                          <div className="space-y-1.5 pr-8">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{template.name}</span>
                              {template.isAiGenerated && (
                                <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              )}
                            </div>

                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Channel badges */}
                              {template.channels.map((channel) => (
                                <Badge
                                  key={channel}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {channel === "email" ? (
                                    <Mail className="h-2.5 w-2.5 mr-1" />
                                  ) : (
                                    <Phone className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {channel}
                                </Badge>
                              ))}

                              {/* Usage count */}
                              {template.usageCount !== undefined && template.usageCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  Used {template.usageCount}x
                                </span>
                              )}

                              {/* Preview button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewTemplate(template);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Generate for this category */}
                  {aiEnabled && onGenerateTemplate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => handleGenerate(category as TemplateCategory)}
                      disabled={isGenerating}
                    >
                      {isGenerating && generatingCategory === category ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate {config.label} Template
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTemplate?.name}
              {previewTemplate?.isAiGenerated && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Generated
                </Badge>
              )}
            </DialogTitle>
            {previewTemplate?.description && (
              <DialogDescription>{previewTemplate.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Subject */}
            {previewTemplate?.subject && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">Subject</span>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{previewTemplate.subject}</p>
              </div>
            )}

            {/* Content */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">Content</span>
              {previewTemplate?.contentHtml ? (
                <RichTextViewer content={previewTemplate.contentHtml} />
              ) : previewTemplate?.contentText ? (
                <div className="bg-muted/50 rounded-lg p-3 whitespace-pre-wrap text-sm">
                  {previewTemplate.contentText}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No content available</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  handleSelect(previewTemplate);
                  setPreviewTemplate(null);
                }
              }}
            >
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
