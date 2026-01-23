"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  FolderPlus,
  X,
  Menu,
  BookOpen,
  FileText,
  Folder,
  MoreHorizontal,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Search,
  Command,
  Keyboard,
  Clock,
  Type,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  NotebookPage,
  NotebookSectionWithPages,
  NotebookWithSections,
} from "@/models/notebook.model";

interface NotebookLayoutProps {
  notebook: NotebookWithSections;
  canEdit: boolean;
}

// Utility function to count words and estimate reading time
function getContentStats(content: string) {
  // Strip HTML tags for word count
  const textContent = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = textContent ? textContent.split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(words / 200)); // Assume 200 wpm
  return { words, readingTime };
}

export function NotebookLayout({ notebook, canEdit }: NotebookLayoutProps) {
  const router = useRouter();

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Command palette state
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get initial page ID from URL or fallback to first page
  const getInitialPageId = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pageIdFromUrl = params.get("pageId");

      // Validate that the page exists in the notebook
      if (pageIdFromUrl) {
        const pageExists = notebook.sections
          ?.flatMap((s) => s.pages || [])
          .some((p) => p?.id === pageIdFromUrl);
        if (pageExists) {
          return pageIdFromUrl;
        }
      }
    }
    // Fallback to first page
    return notebook.sections?.[0]?.pages?.[0]?.id || null;
  };

  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    getInitialPageId()
  );

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Expand all sections by default
    const allSectionIds = new Set(notebook.sections?.map((s) => s.id) || []);
    return allSectionIds;
  });

  // Inline editing states
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Delete confirmation states
  const [deletingSection, setDeletingSection] = useState<{
    id: string;
    title: string;
    pageCount: number;
  } | null>(null);
  const [deletingPage, setDeletingPage] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Content editing state
  const [pageContent, setPageContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update URL when page is selected
  const selectPage = (pageId: string | null) => {
    setSelectedPageId(pageId);
    setIsMobileSidebarOpen(false);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (pageId) {
        url.searchParams.set("pageId", pageId);
      } else {
        url.searchParams.delete("pageId");
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleCreateSection = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/notebooks/${notebook.id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Section",
          description: null,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Section created successfully");
      } else {
        toast.error("Failed to create section");
      }
    } catch (error) {
      console.error("Error creating section:", error);
      toast.error("Failed to create section");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreatePage = async (sectionId: string) => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/notebooks/${notebook.id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          title: "Untitled Page",
        }),
      });

      if (response.ok) {
        const newPage = await response.json();
        selectPage(newPage.id);
        router.refresh();
        toast.success("Page created successfully");
      } else {
        toast.error("Failed to create page");
      }
    } catch (error) {
      console.error("Error creating page:", error);
      toast.error("Failed to create page");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditingSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditValue(section.title);
  };

  const startEditingPage = (page: Page) => {
    setEditingPageId(page.id);
    setEditValue(page.title);
  };

  const saveSection = async (sectionId: string) => {
    if (!editValue.trim()) {
      setEditingSectionId(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/notebooks/${notebook.id}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editValue }),
        }
      );

      if (response.ok) {
        setEditingSectionId(null);
        router.refresh();
      } else {
        toast.error("Failed to update section");
      }
    } catch (error) {
      console.error("Error updating section:", error);
      toast.error("Failed to update section");
    }
  };

  const savePage = async (pageId: string) => {
    if (!editValue.trim()) {
      setEditingPageId(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/notebooks/${notebook.id}/pages/${pageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editValue }),
        }
      );

      if (response.ok) {
        setEditingPageId(null);
        router.refresh();
      } else {
        toast.error("Failed to update page");
      }
    } catch (error) {
      console.error("Error updating page:", error);
      toast.error("Failed to update page");
    }
  };

  const cancelEdit = () => {
    setEditingSectionId(null);
    setEditingPageId(null);
    setEditValue("");
  };

  const confirmDeletePage = async () => {
    if (!deletingPage) return;

    try {
      const response = await fetch(
        `/api/notebooks/${notebook.id}/pages/${deletingPage.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        if (selectedPageId === deletingPage.id) {
          selectPage(null);
        }
        setDeletingPage(null);
        router.refresh();
        toast.success("Page deleted successfully");
      } else {
        toast.error("Failed to delete page");
      }
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error("Failed to delete page");
    }
  };

  const confirmDeleteSection = async () => {
    if (!deletingSection) return;

    try {
      const response = await fetch(
        `/api/notebooks/${notebook.id}/sections/${deletingSection.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const section = notebook.sections?.find(
          (s) => s.id === deletingSection.id
        );
        if (section?.pages?.some((p) => p.id === selectedPageId)) {
          selectPage(null);
        }
        setDeletingSection(null);
        router.refresh();
        toast.success("Section deleted successfully");
      } else {
        toast.error("Failed to delete section");
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
    }
  };

  const selectedPage = notebook.sections
    ?.flatMap((s: NotebookSectionWithPages) => s.pages || [])
    .find((p: NotebookPage) => p?.id === selectedPageId);

  const selectedSection = notebook.sections?.find((s: NotebookSectionWithPages) =>
    s.pages?.some((p: NotebookPage) => p.id === selectedPageId)
  );

  // Sync content when selected page changes
  useEffect(() => {
    if (selectedPage) {
      setPageContent(selectedPage.content || "");
    } else {
      setPageContent("");
    }
  }, [selectedPage?.id, selectedPage?.content]);

  // Auto-save content with debounce
  const handleContentChange = useCallback(
    (newContent: string) => {
      setPageContent(newContent);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!selectedPageId || !canEdit) return;

        setIsSaving(true);
        try {
          const response = await fetch(
            `/api/notebooks/${notebook.id}/pages/${selectedPageId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: newContent }),
            }
          );

          if (response.ok) {
            setLastSaved(new Date());
          } else {
            console.error("Failed to save page content");
          }
        } catch (error) {
          console.error("Error saving page content:", error);
        } finally {
          setIsSaving(false);
        }
      }, 1000);
    },
    [selectedPageId, canEdit, notebook.id]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen(true);
      }
      // Cmd/Ctrl + F - Open search (within notebook)
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && e.shiftKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape - Close fullscreen
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: { sectionId: string; sectionTitle: string; pageId: string; pageTitle: string; preview: string }[] = [];

    notebook.sections?.forEach((section: NotebookSectionWithPages) => {
      section.pages?.forEach((page: NotebookPage) => {
        const titleMatch = page.title.toLowerCase().includes(query);
        const contentText = ((page.content as string) || "").replace(/<[^>]*>/g, " ").toLowerCase();
        const contentMatch = contentText.includes(query);

        if (titleMatch || contentMatch) {
          // Extract preview around the match
          let preview = "";
          if (contentMatch) {
            const index = contentText.indexOf(query);
            const start = Math.max(0, index - 30);
            const end = Math.min(contentText.length, index + query.length + 50);
            preview = (start > 0 ? "..." : "") + contentText.slice(start, end).trim() + (end < contentText.length ? "..." : "");
          }

          results.push({
            sectionId: section.id,
            sectionTitle: section.title,
            pageId: page.id,
            pageTitle: page.title,
            preview,
          });
        }
      });
    });

    return results;
  }, [searchQuery, notebook.sections]);

  // Content stats
  const contentStats = useMemo(() => {
    return getContentStats(pageContent);
  }, [pageContent]);

  // Handle back navigation
  const handleBack = () => {
    router.push("/admin/community/planning/notebooks");
  };

  // Calculate total pages
  const totalPages =
    notebook.sections?.reduce((sum, s) => sum + (s.pages?.length || 0), 0) || 0;
  const totalSections = notebook.sections?.length || 0;

  // Sidebar content - reusable for both desktop and mobile
  const SidebarContent = ({ showBackButton = true }: { showBackButton?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Back Button + Quick Actions */}
      {showBackButton && (
        <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span className="text-xs">All Notebooks</span>
          </Button>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Search notebook <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted rounded">Shift+Cmd+F</kbd></p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsCommandOpen(true)}
                >
                  <Command className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Commands <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted rounded">Cmd+K</kbd></p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Notebook Header */}
      <div className="p-4 md:p-5 border-b border-border/50">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center ring-1 ring-primary/20">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background ring-2 ring-background flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate leading-tight">
              {notebook.title}
            </h1>
            {notebook.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                {notebook.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-5 font-normal"
              >
                {totalSections} section{totalSections !== 1 ? "s" : ""}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 font-normal"
              >
                {totalPages} page{totalPages !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                  asChild
                >
                  <a
                    href={`/admin/community/planning/notebooks/manage?notebookId=${notebook.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Edit notebook settings</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4 h-9 text-sm font-medium border-dashed hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
            onClick={handleCreateSection}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4 mr-2" />
            )}
            {isCreating ? "Creating..." : "New Section"}
          </Button>
        )}
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto">
        {!notebook.sections || notebook.sections.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              No sections yet
            </p>
            <p className="text-xs text-muted-foreground">
              Create a section to start organizing your notes
            </p>
          </div>
        ) : (
          <div className="py-2">
            {notebook.sections.map((section, sectionIndex) => (
              <div key={section.id} className="px-2">
                {/* Section Header */}
                <div className="flex items-center gap-1 group rounded-lg hover:bg-accent/50 transition-colors">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center gap-2 px-3 py-2.5 flex-1 min-w-0"
                  >
                    <div
                      className={cn(
                        "transition-transform duration-200",
                        expandedSections.has(section.id) && "rotate-90"
                      )}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Folder
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        expandedSections.has(section.id)
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    {editingSectionId === section.id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveSection(section.id);
                          } else if (e.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                        onBlur={() => saveSection(section.id)}
                        className="h-7 text-sm px-2 bg-background"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="text-sm font-medium truncate flex-1 text-left text-foreground"
                        onDoubleClick={() =>
                          canEdit && startEditingSection(section)
                        }
                      >
                        {section.title}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-5 shrink-0 font-normal"
                    >
                      {section.pages?.length || 0}
                    </Badge>
                  </button>
                  {canEdit && editingSectionId !== section.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => startEditingSection(section)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Rename section
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCreatePage(section.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add page
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            setDeletingSection({
                              id: section.id,
                              title: section.title,
                              pageCount: section.pages?.length || 0,
                            })
                          }
                        >
                          <X className="h-4 w-4 mr-2" />
                          Delete section
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Pages List */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    expandedSections.has(section.id)
                      ? "max-h-[1000px] opacity-100"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <div className="ml-5 pl-4 border-l border-border/50 space-y-0.5 py-1">
                    {!section.pages || section.pages.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-3 py-2 italic">
                        No pages in this section
                      </div>
                    ) : (
                      section.pages?.map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center gap-1 group/page"
                        >
                          {editingPageId === page.id ? (
                            <div className="flex-1 px-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    savePage(page.id);
                                  } else if (e.key === "Escape") {
                                    cancelEdit();
                                  }
                                }}
                                onBlur={() => savePage(page.id)}
                                className="h-7 text-sm px-2 bg-background"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => selectPage(page.id)}
                                onDoubleClick={() =>
                                  canEdit && startEditingPage(page)
                                }
                                className={cn(
                                  "flex-1 flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-all",
                                  selectedPageId === page.id
                                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                    : "hover:bg-accent text-foreground/80 hover:text-foreground"
                                )}
                              >
                                <FileText
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    selectedPageId === page.id
                                      ? "text-primary-foreground"
                                      : "text-muted-foreground"
                                  )}
                                />
                                <span className="truncate">{page.title}</span>
                              </button>
                              {canEdit && selectedPageId !== page.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover/page:opacity-100 transition-opacity mr-1"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-40"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => startEditingPage(page)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() =>
                                        setDeletingPage({
                                          id: page.id,
                                          title: page.title,
                                        })
                                      }
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleCreatePage(section.id)}
                        disabled={isCreating}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Add page
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col md:flex-row bg-gradient-to-br from-background via-background to-muted/20 transition-all duration-300",
          isFullscreen
            ? "fixed inset-0 z-50 h-screen"
            : "h-[calc(100vh-4rem)]"
        )}
      >
        {/* Desktop Sidebar - Hidden in fullscreen */}
        <aside
          className={cn(
            "hidden md:flex w-80 lg:w-96 border-r border-border/50 bg-card/50 backdrop-blur-sm flex-col transition-all duration-300",
            isFullscreen && "md:hidden"
          )}
        >
          <SidebarContent showBackButton={true} />
        </aside>

        {/* Mobile Header + Drawer */}
        <div
          className={cn(
            "md:hidden border-b border-border/50 bg-card/80 backdrop-blur-sm",
            isFullscreen && "hidden"
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go back</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground truncate leading-tight">
                {notebook.title}
              </p>
              <p className="text-sm font-medium truncate leading-tight">
                {selectedPage?.title || "Select a page"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {isSaving ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
              ) : lastSaved ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsCommandOpen(true)}
              >
                <Command className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        <Drawer open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <DrawerContent className="h-[85vh]">
            <DrawerHeader className="border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-base">Navigation</DrawerTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setIsSearchOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <SidebarContent showBackButton={false} />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedPage ? (
            <>
              {/* Fullscreen Header - Only visible in fullscreen mode */}
              {isFullscreen && (
                <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setIsFullscreen(false)}
                      >
                        <Minimize2 className="h-4 w-4 mr-1.5" />
                        <span className="text-xs">Exit Focus</span>
                      </Button>
                      <span className="text-sm font-medium truncate">
                        {selectedPage.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        <span>{contentStats.words.toLocaleString()} words</span>
                        <span className="w-px h-3 bg-border" />
                        <span>{contentStats.readingTime} min</span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                          isSaving
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : lastSaved
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : lastSaved ? (
                          <Check className="h-3 w-3" />
                        ) : null}
                        <span>{isSaving ? "Saving" : lastSaved ? "Saved" : "Ready"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page Header - Desktop (hidden in fullscreen) */}
              <div className={cn(
                "hidden md:block border-b border-border/50 bg-card/30 backdrop-blur-sm",
                isFullscreen && "md:hidden"
              )}>
                <div className="px-6 lg:px-8 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Folder className="h-3.5 w-3.5" />
                        <span className="truncate">{selectedSection?.title}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="text-foreground font-medium truncate">
                          {selectedPage.title}
                        </span>
                      </div>
                      <h2 className="text-xl lg:text-2xl font-bold text-foreground truncate">
                        {selectedPage.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Word Count & Reading Time */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Type className="h-3 w-3" />
                              {contentStats.words.toLocaleString()} words
                            </span>
                            <span className="w-px h-3 bg-border" />
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {contentStats.readingTime} min read
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Word count and estimated reading time</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Save Status Indicator */}
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          isSaving
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : lastSaved
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving...
                          </>
                        ) : lastSaved ? (
                          <>
                            <Check className="h-3 w-3" />
                            Saved
                          </>
                        ) : (
                          <>
                            <div className="h-1.5 w-1.5 rounded-full bg-current" />
                            Ready
                          </>
                        )}
                      </div>

                      {/* Fullscreen Toggle */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                          >
                            {isFullscreen ? (
                              <Minimize2 className="h-4 w-4" />
                            ) : (
                              <Maximize2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isFullscreen ? "Exit fullscreen" : "Focus mode"}</p>
                        </TooltipContent>
                      </Tooltip>

                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => startEditingPage(selectedPage)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Rename page
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setDeletingPage({
                                  id: selectedPage.id,
                                  title: selectedPage.title,
                                })
                              }
                            >
                              <X className="h-4 w-4 mr-2" />
                              Delete page
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Content - Inline Editor */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full p-4 md:p-6 lg:p-8">
                  <div className="h-full bg-card/50 rounded-xl border border-border/50 shadow-sm overflow-hidden">
                    <RichTextEditor
                      value={pageContent}
                      onChange={handleContentChange}
                      placeholder="Start writing your notes..."
                      disabled={!canEdit}
                      readOnly={!canEdit}
                      minHeight="100%"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="relative mx-auto mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center ring-1 ring-primary/20 mx-auto">
                    <FileText className="w-12 h-12 text-primary/60" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-background ring-4 ring-background flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {notebook.sections?.length === 0
                    ? "Start your notebook"
                    : "Select a page"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {notebook.sections?.length === 0
                    ? "Create your first section to begin organizing your thoughts and ideas."
                    : "Choose a page from the sidebar to view and edit its content."}
                </p>
                {canEdit && notebook.sections?.length === 0 && (
                  <Button
                    onClick={handleCreateSection}
                    disabled={isCreating}
                    className="gap-2"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderPlus className="h-4 w-4" />
                    )}
                    Create first section
                  </Button>
                )}
                {/* Mobile hint */}
                <p className="md:hidden text-xs text-muted-foreground mt-4">
                  Tap the menu icon to browse pages
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Delete Section Confirmation Dialog */}
        <AlertDialog
          open={!!deletingSection}
          onOpenChange={() => setDeletingSection(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingSection && deletingSection.pageCount > 0 ? (
                  <>
                    Are you sure you want to delete &quot;{deletingSection.title}
                    &quot; and all {deletingSection.pageCount} page(s) within it?
                    This action cannot be undone.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete &quot;
                    {deletingSection?.title}&quot;? This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteSection}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Page Confirmation Dialog */}
        <AlertDialog
          open={!!deletingPage}
          onOpenChange={() => setDeletingPage(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Page</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingPage?.title}
                &quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePage}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Command Palette */}
        <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => { handleBack(); setIsCommandOpen(false); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span>Go to all notebooks</span>
              </CommandItem>
              <CommandItem onSelect={() => { setIsSearchOpen(true); setIsCommandOpen(false); }}>
                <Search className="mr-2 h-4 w-4" />
                <span>Search in notebook</span>
                <CommandShortcut>Shift+Cmd+F</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            {canEdit && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Actions">
                  <CommandItem
                    onSelect={() => {
                      handleCreateSection();
                      setIsCommandOpen(false);
                    }}
                  >
                    <FolderPlus className="mr-2 h-4 w-4" />
                    <span>Create new section</span>
                  </CommandItem>
                  {selectedSection && (
                    <CommandItem
                      onSelect={() => {
                        handleCreatePage(selectedSection.id);
                        setIsCommandOpen(false);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Create new page in current section</span>
                    </CommandItem>
                  )}
                  {selectedPage && (
                    <CommandItem
                      onSelect={() => {
                        startEditingPage(selectedPage);
                        setIsCommandOpen(false);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Rename current page</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            <CommandGroup heading="View">
              <CommandItem
                onSelect={() => {
                  setIsFullscreen(!isFullscreen);
                  setIsCommandOpen(false);
                }}
              >
                {isFullscreen ? (
                  <Minimize2 className="mr-2 h-4 w-4" />
                ) : (
                  <Maximize2 className="mr-2 h-4 w-4" />
                )}
                <span>{isFullscreen ? "Exit focus mode" : "Enter focus mode"}</span>
              </CommandItem>
            </CommandGroup>
            {notebook.sections && notebook.sections.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Quick Navigate">
                  {notebook.sections.flatMap((section) =>
                    section.pages?.map((page) => (
                      <CommandItem
                        key={page.id}
                        onSelect={() => {
                          selectPage(page.id);
                          setIsCommandOpen(false);
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span className="truncate">{page.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground truncate">
                          {section.title}
                        </span>
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandDialog>

        {/* Search Dialog */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search in Notebook
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search pages and content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10"
                autoFocus
              />
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {searchQuery.trim() === "" ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Type to search across all pages in this notebook
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No results found for &quot;{searchQuery}&quot;
                  </p>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.pageId}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                      onClick={() => {
                        selectPage(result.pageId);
                        // Expand the section
                        setExpandedSections((prev) => new Set([...prev, result.sectionId]));
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{result.pageTitle}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Folder className="h-3 w-3" />
                        <span>{result.sectionTitle}</span>
                      </div>
                      {result.preview && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {result.preview}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
              {searchResults.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
