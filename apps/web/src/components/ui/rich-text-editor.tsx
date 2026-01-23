"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Unlink,
  Plus,
  Trash2,
  RowsIcon,
  ColumnsIcon,
  FileCode,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Initialize lowlight with common languages
const lowlight = createLowlight(common);

// Rich text styles - exported for use in viewer components
export const richTextStyles = `
  .rich-text-content {
    min-height: 100%;
  }
  .rich-text-content > * + * {
    margin-top: 0.75em;
  }
  .rich-text-content h1 {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .rich-text-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
  }
  .rich-text-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  .rich-text-content p {
    margin: 0.5rem 0;
    line-height: 1.6;
  }
  .rich-text-content ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }
  .rich-text-content ol {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }
  .rich-text-content li {
    margin: 0.25rem 0;
  }
  .rich-text-content li p {
    margin: 0;
  }
  .rich-text-content blockquote {
    border-left: 4px solid hsl(var(--primary) / 0.3);
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    background: hsl(var(--muted) / 0.3);
    padding: 0.75rem 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
  }
  .rich-text-content code {
    background: hsl(var(--muted));
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: ui-monospace, monospace;
  }
  .rich-text-content pre {
    background: #18181b;
    color: #fafafa;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  .rich-text-content pre code {
    background: none;
    padding: 0;
    font-size: 0.875rem;
    color: inherit;
  }
  .rich-text-content hr {
    border: none;
    border-top: 1px solid hsl(var(--border));
    margin: 1.5rem 0;
  }
  .rich-text-content a {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .rich-text-content a:hover {
    opacity: 0.8;
  }
  .rich-text-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem auto;
    display: block;
  }
  .rich-text-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }
  .rich-text-content th,
  .rich-text-content td {
    border: 1px solid hsl(var(--border));
    padding: 0.5rem;
    text-align: left;
  }
  .rich-text-content th {
    background: hsl(var(--muted) / 0.5);
    font-weight: 600;
  }
  .rich-text-content ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0;
  }
  .rich-text-content ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .rich-text-content ul[data-type="taskList"] li > label {
    flex-shrink: 0;
    margin-top: 0.25rem;
  }
  .rich-text-content ul[data-type="taskList"] li > label input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: hsl(var(--primary));
  }
  .rich-text-content ul[data-type="taskList"] li > div {
    flex: 1;
  }
  .rich-text-content mark {
    border-radius: 0.25rem;
    padding: 0.125rem 0;
  }
  .rich-text-content .is-empty::before {
    content: attr(data-placeholder);
    float: left;
    color: hsl(var(--muted-foreground) / 0.5);
    pointer-events: none;
    height: 0;
  }
`;

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  minHeight?: string;
}

interface ToolbarButtonProps {
  editor: Editor | null;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

// Color palette for text and highlights
const TEXT_COLORS = [
  { name: "Default", color: "inherit" },
  { name: "Gray", color: "#6b7280" },
  { name: "Red", color: "#dc2626" },
  { name: "Orange", color: "#ea580c" },
  { name: "Amber", color: "#d97706" },
  { name: "Green", color: "#16a34a" },
  { name: "Blue", color: "#2563eb" },
  { name: "Purple", color: "#9333ea" },
  { name: "Pink", color: "#db2777" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", color: "" },
  { name: "Yellow", color: "#fef08a" },
  { name: "Green", color: "#bbf7d0" },
  { name: "Blue", color: "#bfdbfe" },
  { name: "Purple", color: "#ddd6fe" },
  { name: "Pink", color: "#fbcfe8" },
  { name: "Orange", color: "#fed7aa" },
  { name: "Gray", color: "#e5e7eb" },
];

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
}: ToolbarButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
          onClick={handleClick}
          disabled={disabled}
          aria-label={tooltip}
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            isActive && "bg-primary/15 text-primary",
            !isActive && "bg-transparent"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={5}>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Link input popover component
function LinkPopover({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const [url, setUrl] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSetLink = () => {
    if (!editor || !url) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setUrl("");
    setIsOpen(false);
  };

  const handleUnlink = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          aria-label="Insert link"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            editor?.isActive("link") && "bg-primary/15 text-primary"
          )}
        >
          <LinkIcon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">URL</label>
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetLink()}
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSetLink} className="flex-1 h-8">
              <LinkIcon className="size-3.5 mr-1.5" />
              Set Link
            </Button>
            {editor?.isActive("link") && (
              <Button size="sm" variant="outline" onClick={handleUnlink} className="h-8">
                <Unlink className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Image input popover component
function ImagePopover({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const [url, setUrl] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const handleAddImage = () => {
    if (!editor || !url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setUrl("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          aria-label="Insert image"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <ImageIcon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
            <Input
              placeholder="https://example.com/image.png"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddImage()}
              className="h-9"
            />
          </div>
          <Button size="sm" onClick={handleAddImage} className="w-full h-8">
            <ImageIcon className="size-3.5 mr-1.5" />
            Insert Image
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Table dropdown menu
function TableDropdown({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          aria-label="Table options"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            editor?.isActive("table") && "bg-primary/15 text-primary"
          )}
        >
          <TableIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {!editor?.isActive("table") ? (
          <DropdownMenuItem onClick={insertTable}>
            <Plus className="size-4 mr-2" />
            Insert Table
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => editor?.chain().focus().addColumnAfter().run()}>
              <ColumnsIcon className="size-4 mr-2" />
              Add Column After
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().addColumnBefore().run()}>
              <ColumnsIcon className="size-4 mr-2" />
              Add Column Before
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().deleteColumn().run()}>
              <X className="size-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor?.chain().focus().addRowAfter().run()}>
              <RowsIcon className="size-4 mr-2" />
              Add Row After
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().addRowBefore().run()}>
              <RowsIcon className="size-4 mr-2" />
              Add Row Before
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().deleteRow().run()}>
              <X className="size-4 mr-2" />
              Delete Row
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => editor?.chain().focus().deleteTable().run()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              Delete Table
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Text color picker
function ColorPicker({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          aria-label="Text color"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <Palette className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-5 gap-1">
          {TEXT_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => {
                if (color.color === "inherit") {
                  editor?.chain().focus().unsetColor().run();
                } else {
                  editor?.chain().focus().setColor(color.color).run();
                }
              }}
              className={cn(
                "w-7 h-7 rounded-md border border-border/50 transition-all hover:scale-110 hover:border-primary/50",
                color.color === "inherit" && "bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-500"
              )}
              style={{ backgroundColor: color.color !== "inherit" ? color.color : undefined }}
              title={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Highlight color picker
function HighlightPicker({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          aria-label="Highlight"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            editor?.isActive("highlight") && "bg-primary/15 text-primary"
          )}
        >
          <Highlighter className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => {
                if (color.color === "") {
                  editor?.chain().focus().unsetHighlight().run();
                } else {
                  editor?.chain().focus().toggleHighlight({ color: color.color }).run();
                }
              }}
              className={cn(
                "w-7 h-7 rounded-md border border-border/50 transition-all hover:scale-110 hover:border-primary/50",
                color.color === "" && "bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-500 relative after:content-['✕'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[10px] after:text-muted-foreground"
              )}
              style={{ backgroundColor: color.color || undefined }}
              title={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Text alignment dropdown
function AlignmentDropdown({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const currentAlignment =
    editor?.isActive({ textAlign: "center" }) ? "center" :
    editor?.isActive({ textAlign: "right" }) ? "right" :
    editor?.isActive({ textAlign: "justify" }) ? "justify" : "left";

  const AlignIcon =
    currentAlignment === "center" ? AlignCenter :
    currentAlignment === "right" ? AlignRight :
    currentAlignment === "justify" ? AlignJustify : AlignLeft;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          aria-label="Text alignment"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <AlignIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="size-4 mr-2" />
          Left
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="size-4 mr-2" />
          Center
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="size-4 mr-2" />
          Right
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="size-4 mr-2" />
          Justify
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled?: boolean;
}) {
  if (!editor) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/50 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 px-2 py-2">
        {/* Text formatting */}
        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          disabled={disabled}
          tooltip="Bold (Ctrl+B)"
        >
          <Bold className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          disabled={disabled}
          tooltip="Italic (Ctrl+I)"
        >
          <Italic className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          disabled={disabled}
          tooltip="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          disabled={disabled}
          tooltip="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          disabled={disabled}
          tooltip="Inline code"
        >
          <Code className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        {/* Colors */}
        <ColorPicker editor={editor} disabled={disabled} />
        <HighlightPicker editor={editor} disabled={disabled} />

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        {/* Headings */}
        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          disabled={disabled}
          tooltip="Heading 1"
        >
          <Heading1 className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          tooltip="Heading 2"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          tooltip="Heading 3"
        >
          <Heading3 className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        {/* Alignment */}
        <AlignmentDropdown editor={editor} disabled={disabled} />

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        {/* Lists */}
        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          disabled={disabled}
          tooltip="Bullet list"
        >
          <List className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          disabled={disabled}
          tooltip="Numbered list"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          disabled={disabled}
          tooltip="Task list"
        >
          <CheckSquare className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        {/* Block elements */}
        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          disabled={disabled}
          tooltip="Quote"
        >
          <Quote className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          disabled={disabled}
          tooltip="Code block"
        >
          <FileCode className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          tooltip="Horizontal rule"
        >
          <Minus className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        {/* Links and Media */}
        <LinkPopover editor={editor} disabled={disabled} />
        <ImagePopover editor={editor} disabled={disabled} />
        <TableDropdown editor={editor} disabled={disabled} />

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        {/* Undo/Redo */}
        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          tooltip="Undo (Ctrl+Z)"
        >
          <Undo className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          tooltip="Redo (Ctrl+Y)"
        >
          <Redo className="size-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}

function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Start typing...",
  disabled = false,
  readOnly = false,
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default codeBlock, using CodeBlockLowlight instead
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground/50 before:float-left before:h-0 before:pointer-events-none",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto shadow-sm border border-border/50",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full my-4",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "bg-muted/50 font-semibold text-left p-2 border border-border",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border p-2 align-top",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0 space-y-1",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "rounded-lg bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 my-4 overflow-x-auto text-sm font-mono",
        },
      }),
    ],
    content: value,
    editable: !disabled && !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Return empty string if editor only contains empty paragraph
      const isEmpty = html === "<p></p>" || html === "";
      onChange?.(isEmpty ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "rich-text-content focus:outline-none px-4 py-3",
      },
    },
    immediatelyRender: false,
  });

  // Sync external value changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const isEmpty = value === "" || value === "<p></p>";
      if (isEmpty && editor.isEmpty) {
        return;
      }
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  // Update editable state
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled && !readOnly);
    }
  }, [editor, disabled, readOnly]);

  const isInteractive = !disabled && !readOnly;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: richTextStyles }} />
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border/50 bg-card/50 shadow-sm transition-all duration-200",
          "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-md",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {isInteractive && <EditorToolbar editor={editor} disabled={disabled} />}
        <div
          className={cn(
            "overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
            disabled && "pointer-events-none"
          )}
          style={{ minHeight }}
        >
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </>
  );
}

export { RichTextEditor };
