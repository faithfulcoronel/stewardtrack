"use client";

import { useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkSlug from "remark-slug";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type DocsTreeNode = {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: DocsTreeNode[];
};

type DocsManagerProps = {
  tree: DocsTreeNode[];
  files: Record<string, string>;
  initialPath: string | null;
};

type MarkdownComponents = Parameters<typeof ReactMarkdown>[0]["components"];

type HeadingProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLHeadingElement>,
  HTMLHeadingElement
>;

type ParagraphProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLParagraphElement>,
  HTMLParagraphElement
>;

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>;

type ListProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLUListElement | HTMLOListElement>,
  HTMLUListElement | HTMLOListElement
>;

type ListItemProps = React.DetailedHTMLProps<
  React.LiHTMLAttributes<HTMLLIElement>,
  HTMLLIElement
>;

type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & { inline?: boolean };

type TableProps = React.DetailedHTMLProps<
  React.TableHTMLAttributes<HTMLTableElement>,
  HTMLTableElement
>;

type TableCellProps = React.DetailedHTMLProps<
  React.TdHTMLAttributes<HTMLTableCellElement>,
  HTMLTableCellElement
>;

const markdownComponents: MarkdownComponents = {
  h1: ({ className, ...props }: HeadingProps) => (
    <h1
      className={cn(
        "mt-10 scroll-m-20 text-3xl font-heading font-semibold first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: HeadingProps) => (
    <h2
      className={cn(
        "mt-8 scroll-m-20 text-2xl font-heading font-semibold first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: HeadingProps) => (
    <h3
      className={cn(
        "mt-6 scroll-m-20 text-xl font-heading font-semibold first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: HeadingProps) => (
    <h4
      className={cn(
        "mt-6 scroll-m-20 text-lg font-heading font-semibold first:mt-0",
        className
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: ParagraphProps) => (
    <p className={cn("mt-4 leading-7 text-foreground", className)} {...props} />
  ),
  a: ({ className, ...props }: AnchorProps) => (
    <a
      className={cn(
        "text-primary hover:text-primary/80 underline-offset-2 transition-colors hover:underline",
        className
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }: ListProps) => (
    <ul className={cn("mt-4 ml-6 list-disc space-y-1", className)} {...props} />
  ),
  ol: ({ className, ...props }: ListProps) => (
    <ol className={cn("mt-4 ml-6 list-decimal space-y-1", className)} {...props} />
  ),
  li: ({ className, ...props }: ListItemProps) => (
    <li className={cn("leading-7", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "mt-6 border-l-4 border-primary/40 pl-4 italic text-muted-foreground",
        className
      )}
      {...props}
    />
  ),
  code: ({ inline, className, children, ...props }: CodeProps) => {
    if (inline) {
      return (
        <code
          className={cn(
            "rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground",
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className={cn(
          "block w-full overflow-auto rounded-lg bg-muted p-4 font-mono text-sm leading-relaxed text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ className, children, ...props }) => (
    <pre
      className={cn(
        "mt-6 w-full overflow-hidden rounded-lg bg-muted p-0 text-sm shadow-inner",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ className, ...props }: TableProps) => (
    <div className="mt-6 w-full overflow-hidden rounded-lg border">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn("bg-muted/60", className)} {...props} />
  ),
  tbody: ({ className, ...props }) => (
    <tbody className={cn("divide-y", className)} {...props} />
  ),
  th: ({ className, ...props }: TableCellProps) => (
    <th className={cn("px-4 py-2 text-left font-semibold", className)} {...props} />
  ),
  td: ({ className, ...props }: TableCellProps) => (
    <td className={cn("px-4 py-2 align-top", className)} {...props} />
  ),
};

export function DocsManager({ tree, files, initialPath }: DocsManagerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(initialPath);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (!initialPath) {
      return new Set();
    }

    const segments = initialPath.split("/");
    const dirs = new Set<string>();

    for (let i = 0; i < segments.length - 1; i++) {
      const slice = segments.slice(0, i + 1).join("/");
      dirs.add(slice);
    }

    return dirs;
  });

  const selectedContent = selectedPath ? files[selectedPath] : null;

  const handleSelectFile = (path: string) => {
    setSelectedPath(path);
    setExpanded((prev) => {
      const next = new Set(prev);
      const segments = path.split("/");

      for (let i = 0; i < segments.length - 1; i++) {
        const slice = segments.slice(0, i + 1).join("/");
        next.add(slice);
      }

      return next;
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
      <div className="rounded-xl border bg-card shadow-sm lg:sticky lg:top-24 lg:flex lg:flex-col">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Documentation explorer</h2>
          <p className="text-sm text-muted-foreground">
            Browse the Markdown files stored in the project’s docs directory.
          </p>
        </div>
        <ScrollArea className="h-[60vh] lg:flex-1 lg:h-auto lg:max-h-[calc(100vh-13rem)]">
          <div className="space-y-1 p-3">
            {tree.length > 0 ? (
              tree.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggleDirectory={(path) => toggleDirectory(path, setExpanded)}
                  onSelectFile={handleSelectFile}
                  activePath={selectedPath}
                />
              ))
            ) : (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                No Markdown files were found in the docs directory.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
      <div className="flex min-h-[60vh] flex-col rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Document viewer</h2>
              <p className="text-sm text-muted-foreground">
                {selectedPath
                  ? selectedPath
                  : "Select a document from the explorer to preview its contents."}
              </p>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-6 py-6">
            {selectedContent ? (
              <article className="max-w-3xl pb-10">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkSlug]}
                  components={markdownComponents}
                >
                  {selectedContent}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="flex h-full min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
                Select a Markdown file to view its formatted content.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

type TreeNodeProps = {
  node: DocsTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggleDirectory: (path: string) => void;
  onSelectFile: (path: string) => void;
  activePath: string | null;
};

function TreeNode({ node, depth, expanded, onToggleDirectory, onSelectFile, activePath }: TreeNodeProps) {
  if (node.type === "directory") {
    const isExpanded = expanded.has(node.path);

    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onToggleDirectory(node.path)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/70",
            activePath?.startsWith(node.path + "/") && "bg-muted/70"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 transition-transform",
              isExpanded ? "rotate-90" : "rotate-0"
            )}
          />
          {isExpanded ? (
            <FolderOpen className="size-4 shrink-0" />
          ) : (
            <Folder className="size-4 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children && node.children.length > 0 ? (
          <div className="space-y-1 border-l border-border/60 pl-2">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggleDirectory={onToggleDirectory}
                onSelectFile={onSelectFile}
                activePath={activePath}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const isActive = activePath === node.path;

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/70",
        isActive && "bg-primary/10 text-primary"
      )}
      style={{ paddingLeft: `${depth * 16 + 32}px` }}
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function toggleDirectory(path: string, setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>) {
  setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    return next;
  });
}
