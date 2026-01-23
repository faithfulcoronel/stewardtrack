"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit, FolderPlus, X } from "lucide-react";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "@/components/ui/use-toast";

interface Page {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  pages: Page[];
  sort_order: number;
}

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  sections: Section[];
}

interface NotebookLayoutProps {
  notebook: Notebook;
  canEdit: boolean;
}

export function NotebookLayout({ notebook, canEdit }: NotebookLayoutProps) {
  const router = useRouter();

  // Get initial page ID from URL or fallback to first page
  const getInitialPageId = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pageIdFromUrl = params.get('pageId');

      // Validate that the page exists in the notebook
      if (pageIdFromUrl) {
        const pageExists = notebook.sections
          ?.flatMap(s => s.pages || [])
          .some(p => p?.id === pageIdFromUrl);
        if (pageExists) {
          return pageIdFromUrl;
        }
      }
    }
    // Fallback to first page
    return notebook.sections?.[0]?.pages?.[0]?.id || null;
  };

  const [selectedPageId, setSelectedPageId] = useState<string | null>(getInitialPageId());

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Expand all sections by default, or the section containing the selected page
    const allSectionIds = new Set(notebook.sections?.map(s => s.id) || []);
    return allSectionIds;
  });

  // Inline editing states
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Delete confirmation states
  const [deletingSection, setDeletingSection] = useState<{ id: string; title: string; pageCount: number } | null>(null);
  const [deletingPage, setDeletingPage] = useState<{ id: string; title: string } | null>(null);

  // Content editing state
  const [pageContent, setPageContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update URL when page is selected
  const selectPage = (pageId: string | null) => {
    setSelectedPageId(pageId);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (pageId) {
        url.searchParams.set('pageId', pageId);
      } else {
        url.searchParams.delete('pageId');
      }
      window.history.pushState({}, '', url.toString());
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
      const response = await fetch(`/api/notebooks/${notebook.id}/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editValue }),
      });

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
      const response = await fetch(`/api/notebooks/${notebook.id}/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editValue }),
      });

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
      const response = await fetch(`/api/notebooks/${notebook.id}/pages/${deletingPage.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // If the deleted page was selected, clear selection
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
      const response = await fetch(`/api/notebooks/${notebook.id}/sections/${deletingSection.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // If a page from the deleted section was selected, clear selection
        const section = notebook.sections?.find(s => s.id === deletingSection.id);
        if (section?.pages?.some(p => p.id === selectedPageId)) {
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
    ?.flatMap(s => s.pages || [])
    .find(p => p?.id === selectedPageId);

  const selectedSection = notebook.sections?.find(s =>
    s.pages?.some(p => p.id === selectedPageId)
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
  const handleContentChange = useCallback((newContent: string) => {
    setPageContent(newContent);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      if (!selectedPageId || !canEdit) return;

      setIsSaving(true);
      try {
        const response = await fetch(`/api/notebooks/${notebook.id}/pages/${selectedPageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });

        if (!response.ok) {
          console.error("Failed to save page content");
        }
      } catch (error) {
        console.error("Error saving page content:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Debounce delay of 1 second
  }, [selectedPageId, canEdit, notebook.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Left Sidebar - Sections & Pages */}
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Notebook Header */}
        <div className="p-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{notebook.title}</h1>
              {notebook.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {notebook.description}
                </p>
              )}
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                asChild
              >
                <a href={`/admin/community/planning/notebooks/manage?notebookId=${notebook.id}`}>
                  <Edit className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={handleCreateSection}
              disabled={isCreating}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              {isCreating ? "Creating..." : "New Section"}
            </Button>
          )}
        </div>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto">
          {!notebook.sections || notebook.sections.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No sections yet. Create one to get started.
            </div>
          ) : (
            <div className="p-2">
              {notebook.sections.map((section) => (
                <div key={section.id} className="mb-1">
                  {/* Section Header */}
                  <div className="flex items-center gap-1 w-full group">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md transition-colors flex-1 min-w-0"
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
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
                          className="h-6 text-sm px-1"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="text-sm font-medium truncate flex-1 text-left"
                          onDoubleClick={() => canEdit && startEditingSection(section)}
                        >
                          {section.title}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {section.pages?.length || 0}
                      </span>
                    </button>
                    {canEdit && editingSectionId !== section.id && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingSection(section);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSection({
                              id: section.id,
                              title: section.title,
                              pageCount: section.pages?.length || 0
                            });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Pages List */}
                  {expandedSections.has(section.id) && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {!section.pages || section.pages.length === 0 ? (
                        <div className="text-xs text-muted-foreground px-2 py-1">
                          No pages yet
                        </div>
                      ) : (
                        section.pages?.map((page) => (
                          <div key={page.id} className="flex items-center gap-1 group/page">
                            {editingPageId === page.id ? (
                              <div className="flex-1 flex items-center gap-1">
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
                                  className="h-6 text-sm px-1"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => selectPage(page.id)}
                                  onDoubleClick={() => canEdit && startEditingPage(page)}
                                  className={cn(
                                    "flex-1 text-left px-2 py-1.5 rounded-md text-sm transition-colors truncate",
                                    selectedPageId === page.id
                                      ? "bg-primary text-primary-foreground font-medium"
                                      : "hover:bg-accent text-foreground"
                                  )}
                                >
                                  {page.title}
                                </button>
                                {canEdit && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/page:opacity-100 transition-opacity shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingPage(page);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingPage({
                                          id: page.id,
                                          title: page.title
                                        });
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
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
                          className="w-full justify-start h-8 px-2 text-xs"
                          onClick={() => handleCreatePage(section.id)}
                          disabled={isCreating}
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          {isCreating ? "Creating..." : "Add Page"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPage ? (
          <>
            {/* Page Header */}
            <div className="border-b bg-card px-6 py-4 group/header">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground mb-1">
                    {selectedSection?.title}
                  </div>
                  <h2 className="text-2xl font-bold truncate">{selectedPage.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {isSaving && (
                    <div className="text-sm text-muted-foreground">
                      Saving...
                    </div>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeletingPage({
                        id: selectedPage.id,
                        title: selectedPage.title
                      })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Page Content - Inline Editor */}
            <div className="flex-1 overflow-hidden p-6">
              <RichTextEditor
                value={pageContent}
                onChange={handleContentChange}
                placeholder="Start typing..."
                disabled={!canEdit}
                readOnly={!canEdit}
                minHeight="calc(100vh - 16rem)"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No page selected
              </h3>
              <p className="text-sm text-muted-foreground">
                {notebook.sections.length === 0
                  ? "Create a section and add pages to get started."
                  : "Select a page from the sidebar to view its content."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSection && deletingSection.pageCount > 0 ? (
                <>
                  Are you sure you want to delete &quot;{deletingSection.title}&quot; and all{" "}
                  {deletingSection.pageCount} page(s) within it? This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete &quot;{deletingSection?.title}&quot;? This action
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSection}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Page Confirmation Dialog */}
      <AlertDialog open={!!deletingPage} onOpenChange={() => setDeletingPage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingPage?.title}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePage}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
