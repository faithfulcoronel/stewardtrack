"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
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

  // Local cache for edited content - persists content changes when switching between pages
  const editedContentCache = useRef<Map<string, string>>(new Map());

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

  const startEditingSection = (section: NotebookSectionWithPages) => {
    setEditingSectionId(section.id);
    setEditValue(section.title);
  };

  const startEditingPage = (page: NotebookPage) => {
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
  // Use cached content if available (user's edits), otherwise fall back to server content
  // Note: Intentionally only depend on selectedPage?.id to avoid overwriting user edits
  // when other properties of selectedPage change
  useEffect(() => {
    if (selectedPage) {
      const cachedContent = editedContentCache.current.get(selectedPage.id);
      if (cachedContent !== undefined) {
        // Use locally cached content (user's edits)
        setPageContent(cachedContent);
      } else {
        // Fall back to server content
        setPageContent(selectedPage.content || "");
      }
    } else {
      setPageContent("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage?.id]);

  // Auto-save content with debounce
  const handleContentChange = useCallback(
    (newContent: string) => {
      setPageContent(newContent);

      // Cache the edited content immediately so it persists when switching pages
      if (selectedPageId) {
        editedContentCache.current.set(selectedPageId, newContent);
      }

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
        <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-muted/30 to-transparent">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all duration-200 rounded-lg group"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className="text-xs font-medium">All Notebooks</span>
          </Button>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-accent/80 transition-all duration-200"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-2">
                <span>Search notebook</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted/80 rounded border border-border/50 font-mono">Shift+Cmd+F</kbd>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-accent/80 transition-all duration-200"
                  onClick={() => setIsCommandOpen(true)}
                >
                  <Command className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-2">
                <span>Commands</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted/80 rounded border border-border/50 font-mono">Cmd+K</kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Notebook Header */}
      <div className="p-4 md:p-5 border-b border-border/40 bg-gradient-to-b from-background to-muted/20">
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0 group/icon">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/25 shadow-sm shadow-primary/10 transition-all duration-300 group-hover/icon:shadow-md group-hover/icon:shadow-primary/20 group-hover/icon:scale-105">
              <BookOpen className="w-7 h-7 text-primary transition-transform duration-300 group-hover/icon:scale-110" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 ring-2 ring-background flex items-center justify-center shadow-lg shadow-amber-500/20 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-base font-semibold text-foreground truncate leading-tight tracking-tight">
              {notebook.title}
            </h1>
            {notebook.description && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1.5 leading-relaxed">
                {notebook.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Badge
                variant="secondary"
                className="text-[10px] px-2 py-0.5 h-5 font-medium bg-secondary/80 hover:bg-secondary transition-colors"
              >
                <Folder className="w-3 h-3 mr-1 opacity-70" />
                {totalSections} section{totalSections !== 1 ? "s" : ""}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 h-5 font-medium border-border/60 hover:border-border transition-colors"
              >
                <FileText className="w-3 h-3 mr-1 opacity-70" />
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
                  className="h-9 w-9 shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary active:scale-95 transition-all duration-200"
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
            className="w-full mt-4 h-10 text-sm font-medium border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-[0.98] transition-all duration-200 rounded-xl group"
            onClick={handleCreateSection}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
            )}
            {isCreating ? "Creating..." : "New Section"}
          </Button>
        )}
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {!notebook.sections || notebook.sections.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-muted/80 via-muted/50 to-transparent flex items-center justify-center mx-auto mb-5 ring-1 ring-border/50">
              <Folder className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1.5">
              No sections yet
            </p>
            <p className="text-xs text-muted-foreground/80 max-w-[200px] mx-auto leading-relaxed">
              Create a section to start organizing your thoughts and ideas
            </p>
          </div>
        ) : (
          <div className="py-3 space-y-1">
            {notebook.sections.map((section) => (
              <div key={section.id} className="px-2">
                {/* Section Header */}
                <div className="flex items-center gap-1 group rounded-xl hover:bg-accent/60 active:bg-accent/80 transition-all duration-200">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center gap-2.5 px-3 py-3 flex-1 min-w-0"
                  >
                    <div
                      className={cn(
                        "transition-transform duration-300 ease-out",
                        expandedSections.has(section.id) && "rotate-90"
                      )}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                      expandedSections.has(section.id)
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/60 text-muted-foreground"
                    )}>
                      <Folder className="h-4 w-4" />
                    </div>
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
                        className="h-8 text-sm px-3 bg-background border-primary/30 focus:border-primary rounded-lg"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className={cn(
                          "text-sm font-medium truncate flex-1 text-left transition-colors duration-200",
                          expandedSections.has(section.id)
                            ? "text-foreground"
                            : "text-foreground/80"
                        )}
                        onDoubleClick={() =>
                          canEdit && startEditingSection(section)
                        }
                      >
                        {section.title}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-2 py-0.5 h-5 shrink-0 font-medium transition-all duration-200",
                        expandedSections.has(section.id)
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/80"
                      )}
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
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 mr-1 rounded-lg hover:bg-background/80"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                        <DropdownMenuItem
                          onClick={() => startEditingSection(section)}
                          className="rounded-lg"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Rename section
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCreatePage(section.id)}
                          className="rounded-lg"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add page
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
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
                    "overflow-hidden transition-all duration-300 ease-out",
                    expandedSections.has(section.id)
                      ? "max-h-[2000px] opacity-100"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <div className="ml-6 pl-4 border-l-2 border-border/40 space-y-0.5 py-2">
                    {!section.pages || section.pages.length === 0 ? (
                      <div className="text-xs text-muted-foreground/60 px-3 py-3 italic flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        No pages in this section
                      </div>
                    ) : (
                      section.pages?.map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center gap-1 group/page"
                        >
                          {editingPageId === page.id ? (
                            <div className="flex-1 px-2 py-1">
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
                                className="h-8 text-sm px-3 bg-background border-primary/30 focus:border-primary rounded-lg"
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
                                  "flex-1 flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                                  selectedPageId === page.id
                                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium shadow-md shadow-primary/20 scale-[1.02]"
                                    : "hover:bg-accent/70 active:bg-accent text-foreground/70 hover:text-foreground"
                                )}
                              >
                                <FileText
                                  className={cn(
                                    "h-4 w-4 shrink-0 transition-all duration-200",
                                    selectedPageId === page.id
                                      ? "text-primary-foreground"
                                      : "text-muted-foreground/60"
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
                                      className="h-8 w-8 opacity-0 group-hover/page:opacity-100 transition-all duration-200 mr-1 rounded-lg hover:bg-background/80"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-44 rounded-xl shadow-lg"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => startEditingPage(page)}
                                      className="rounded-lg"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
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
                        className="w-full justify-start h-9 px-3 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 rounded-xl mt-1 transition-all duration-200 group/add"
                        onClick={() => handleCreatePage(section.id)}
                        disabled={isCreating}
                      >
                        <Plus className="h-3.5 w-3.5 mr-2 transition-transform duration-200 group-hover/add:scale-110" />
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
          "flex flex-col md:flex-row bg-gradient-to-br from-background via-background to-muted/10 transition-all duration-500 ease-out",
          isFullscreen
            ? "fixed inset-0 z-50 h-screen"
            : "h-[calc(100vh-4rem)]"
        )}
      >
        {/* Desktop Sidebar - Hidden in fullscreen */}
        <aside
          className={cn(
            "hidden md:flex w-80 lg:w-[22rem] border-r border-border/30 bg-gradient-to-b from-card/80 via-card/60 to-card/40 backdrop-blur-md flex-col transition-all duration-500 ease-out shadow-[1px_0_20px_-10px_rgba(0,0,0,0.1)]",
            isFullscreen && "md:hidden"
          )}
        >
          <SidebarContent showBackButton={true} />
        </aside>

        {/* Mobile Header + Drawer */}
        <div
          className={cn(
            "md:hidden border-b border-border/40 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-md shadow-sm",
            isFullscreen && "hidden"
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 safe-area-inset-top">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl hover:bg-accent/80 active:scale-95 transition-all duration-200"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go back</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl hover:bg-accent/80 active:scale-95 transition-all duration-200"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0 px-1">
              <p className="text-[11px] text-muted-foreground/70 truncate leading-tight font-medium">
                {notebook.title}
              </p>
              <p className="text-sm font-semibold truncate leading-tight text-foreground">
                {selectedPage?.title || "Select a page"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {isSaving ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 px-2.5 py-1.5 bg-amber-500/10 rounded-full">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 rounded-full">
                  <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                </div>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-accent/80 active:scale-95 transition-all duration-200"
                onClick={() => setIsCommandOpen(true)}
              >
                <Command className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        <Drawer open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <DrawerContent className="h-[90vh] rounded-t-3xl">
            <DrawerHeader className="border-b border-border/40 px-5 py-4 bg-gradient-to-b from-muted/30 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DrawerTitle className="text-base font-semibold">Navigation</DrawerTitle>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{totalPages} pages in {totalSections} sections</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-accent/80 active:scale-95 transition-all duration-200"
                    onClick={() => {
                      setIsSearchOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-accent/80 active:scale-95 transition-all duration-200"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <X className="h-5 w-5" />
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
        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-transparent via-transparent to-muted/5">
          {selectedPage ? (
            <>
              {/* Fullscreen Header - Only visible in fullscreen mode */}
              {isFullscreen && (
                <div className="border-b border-border/30 bg-gradient-to-r from-card/90 via-card/80 to-card/90 backdrop-blur-md">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 rounded-xl hover:bg-accent/80 active:scale-95 transition-all duration-200 group"
                        onClick={() => setIsFullscreen(false)}
                      >
                        <Minimize2 className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                        <span className="text-xs font-medium">Exit Focus</span>
                      </Button>
                      <div className="h-5 w-px bg-border/50" />
                      <span className="text-sm font-semibold truncate text-foreground">
                        {selectedPage.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/40 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5">
                          <Type className="h-3.5 w-3.5 opacity-60" />
                          {contentStats.words.toLocaleString()} words
                        </span>
                        <span className="w-px h-4 bg-border/60" />
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 opacity-60" />
                          {contentStats.readingTime} min
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300",
                          isSaving
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/10"
                            : lastSaved
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : lastSaved ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : null}
                        <span>{isSaving ? "Saving" : lastSaved ? "Saved" : "Ready"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page Header - Desktop (hidden in fullscreen) */}
              <div className={cn(
                "hidden md:block border-b border-border/30 bg-gradient-to-r from-card/50 via-card/30 to-card/50 backdrop-blur-sm",
                isFullscreen && "md:hidden"
              )}>
                <div className="px-6 lg:px-8 py-5">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground/80 mb-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 text-xs font-medium">
                          <Folder className="h-3.5 w-3.5 opacity-60" />
                          <span className="truncate">{selectedSection?.title}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-40" />
                        <span className="text-foreground font-medium truncate">
                          {selectedPage.title}
                        </span>
                      </div>
                      <h2 className="text-xl lg:text-2xl font-bold text-foreground truncate tracking-tight">
                        {selectedPage.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Word Count & Reading Time */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/40 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5">
                              <Type className="h-3.5 w-3.5 opacity-60" />
                              {contentStats.words.toLocaleString()} words
                            </span>
                            <span className="w-px h-4 bg-border/60" />
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 opacity-60" />
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
                          "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-300",
                          isSaving
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/10"
                            : lastSaved
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : lastSaved ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Saved
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
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
                            className="h-10 w-10 rounded-xl hover:bg-accent/80 active:scale-95 transition-all duration-200"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                          >
                            {isFullscreen ? (
                              <Minimize2 className="h-5 w-5" />
                            ) : (
                              <Maximize2 className="h-5 w-5" />
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
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/50 hover:bg-accent/80 active:scale-95 transition-all duration-200">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                            <DropdownMenuItem
                              onClick={() => startEditingPage(selectedPage)}
                              className="rounded-lg"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Rename page
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
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
                <div className="h-full p-3 md:p-5 lg:p-6">
                  <div className="h-full bg-card/70 rounded-2xl border border-border/40 shadow-sm shadow-black/5 overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:shadow-black/5">
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
                <div className="relative mx-auto mb-8">
                  <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/20 mx-auto shadow-lg shadow-primary/10 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:scale-105">
                    <FileText className="w-14 h-14 text-primary/70 transition-transform duration-500 hover:scale-110" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 ring-4 ring-background flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
                  {notebook.sections?.length === 0
                    ? "Start your notebook"
                    : "Select a page"}
                </h3>
                <p className="text-sm text-muted-foreground/80 mb-8 leading-relaxed max-w-xs mx-auto">
                  {notebook.sections?.length === 0
                    ? "Create your first section to begin organizing your thoughts and ideas."
                    : "Choose a page from the sidebar to view and edit its content."}
                </p>
                {canEdit && notebook.sections?.length === 0 && (
                  <Button
                    onClick={handleCreateSection}
                    disabled={isCreating}
                    size="lg"
                    className="gap-2.5 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all duration-200 group"
                  >
                    {isCreating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FolderPlus className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                    )}
                    Create first section
                  </Button>
                )}
                {/* Mobile hint */}
                <p className="md:hidden text-xs text-muted-foreground/60 mt-6 flex items-center justify-center gap-2">
                  <Menu className="h-3.5 w-3.5" />
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
          <AlertDialogContent className="rounded-2xl border-border/50 shadow-2xl">
            <AlertDialogHeader>
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-destructive/20">
                <Folder className="w-7 h-7 text-destructive" />
              </div>
              <AlertDialogTitle className="text-center text-xl">Delete Section</AlertDialogTitle>
              <AlertDialogDescription className="text-center leading-relaxed">
                {deletingSection && deletingSection.pageCount > 0 ? (
                  <>
                    Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{deletingSection.title}&quot;</span> and all <span className="font-semibold text-destructive">{deletingSection.pageCount} page(s)</span> within it?
                    <br />
                    <span className="text-xs mt-2 inline-block opacity-70">This action cannot be undone.</span>
                  </>
                ) : (
                  <>
                    Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{deletingSection?.title}&quot;</span>?
                    <br />
                    <span className="text-xs mt-2 inline-block opacity-70">This action cannot be undone.</span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-3">
              <AlertDialogCancel className="rounded-xl h-11 px-6 font-medium">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteSection}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-11 px-6 font-medium shadow-lg shadow-destructive/20 active:scale-95 transition-all duration-200"
              >
                Delete Section
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Page Confirmation Dialog */}
        <AlertDialog
          open={!!deletingPage}
          onOpenChange={() => setDeletingPage(null)}
        >
          <AlertDialogContent className="rounded-2xl border-border/50 shadow-2xl">
            <AlertDialogHeader>
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-destructive/20">
                <FileText className="w-7 h-7 text-destructive" />
              </div>
              <AlertDialogTitle className="text-center text-xl">Delete Page</AlertDialogTitle>
              <AlertDialogDescription className="text-center leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{deletingPage?.title}&quot;</span>?
                <br />
                <span className="text-xs mt-2 inline-block opacity-70">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-3">
              <AlertDialogCancel className="rounded-xl h-11 px-6 font-medium">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePage}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-11 px-6 font-medium shadow-lg shadow-destructive/20 active:scale-95 transition-all duration-200"
              >
                Delete Page
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Command Palette */}
        <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
          <CommandInput placeholder="Type a command or search..." className="h-12" />
          <CommandList className="max-h-[400px]">
            <CommandEmpty className="py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No results found.</p>
            </CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => { handleBack(); setIsCommandOpen(false); }} className="rounded-lg py-3">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center mr-3">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <span>Go to all notebooks</span>
              </CommandItem>
              <CommandItem onSelect={() => { setIsSearchOpen(true); setIsCommandOpen(false); }} className="rounded-lg py-3">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center mr-3">
                  <Search className="h-4 w-4" />
                </div>
                <span>Search in notebook</span>
                <CommandShortcut className="ml-auto opacity-60">Shift+Cmd+F</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            {canEdit && (
              <>
                <CommandSeparator className="my-2" />
                <CommandGroup heading="Actions">
                  <CommandItem
                    onSelect={() => {
                      handleCreateSection();
                      setIsCommandOpen(false);
                    }}
                    className="rounded-lg py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <FolderPlus className="h-4 w-4 text-primary" />
                    </div>
                    <span>Create new section</span>
                  </CommandItem>
                  {selectedSection && (
                    <CommandItem
                      onSelect={() => {
                        handleCreatePage(selectedSection.id);
                        setIsCommandOpen(false);
                      }}
                      className="rounded-lg py-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                      <span>Create new page in current section</span>
                    </CommandItem>
                  )}
                  {selectedPage && (
                    <CommandItem
                      onSelect={() => {
                        startEditingPage(selectedPage);
                        setIsCommandOpen(false);
                      }}
                      className="rounded-lg py-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center mr-3">
                        <Edit className="h-4 w-4" />
                      </div>
                      <span>Rename current page</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
            <CommandSeparator className="my-2" />
            <CommandGroup heading="View">
              <CommandItem
                onSelect={() => {
                  setIsFullscreen(!isFullscreen);
                  setIsCommandOpen(false);
                }}
                className="rounded-lg py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center mr-3">
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </div>
                <span>{isFullscreen ? "Exit focus mode" : "Enter focus mode"}</span>
              </CommandItem>
            </CommandGroup>
            {notebook.sections && notebook.sections.length > 0 && (
              <>
                <CommandSeparator className="my-2" />
                <CommandGroup heading="Quick Navigate">
                  {notebook.sections.flatMap((section) =>
                    section.pages?.map((page) => (
                      <CommandItem
                        key={page.id}
                        onSelect={() => {
                          selectPage(page.id);
                          setIsCommandOpen(false);
                        }}
                        className="rounded-lg py-2.5"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center mr-3",
                          selectedPageId === page.id ? "bg-primary/15" : "bg-muted/50"
                        )}>
                          <FileText className={cn(
                            "h-4 w-4",
                            selectedPageId === page.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <span className="truncate">{page.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground/70 truncate px-2 py-0.5 rounded-md bg-muted/50">
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
          <DialogContent className="sm:max-w-lg rounded-2xl border-border/50 shadow-2xl p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent">
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-lg font-semibold">Search in Notebook</span>
                  <p className="text-xs text-muted-foreground/70 font-normal mt-0.5">{totalPages} pages to search</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Search pages and content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-11 rounded-xl border-border/50 focus:border-primary/50 bg-muted/30 transition-all duration-200"
                  autoFocus
                />
              </div>
              <div className="max-h-[320px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {searchQuery.trim() === "" ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                      <Keyboard className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground/70">
                      Type to search across all pages
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground/70">
                      No results found for <span className="font-medium text-foreground">&quot;{searchQuery}&quot;</span>
                    </p>
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.pageId}
                      className="w-full text-left p-4 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-accent/50 active:bg-accent transition-all duration-200 group"
                      onClick={() => {
                        selectPage(result.pageId);
                        setExpandedSections((prev) => new Set([...prev, result.sectionId]));
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-200">
                          <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold truncate block text-foreground">{result.pageTitle}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground/70">
                            <Folder className="h-3 w-3" />
                            <span>{result.sectionTitle}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-200" />
                      </div>
                      {result.preview && (
                        <p className="text-xs text-muted-foreground/60 mt-3 line-clamp-2 pl-12 leading-relaxed">
                          {result.preview}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground/60 text-center">
                    Found <span className="font-semibold text-foreground">{searchResults.length}</span> result{searchResults.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
