"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

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

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={isActive}
          onPressedChange={() => onClick()}
          disabled={disabled}
          aria-label={tooltip}
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={5}>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
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
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/30 px-2 py-1.5">
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

        <Separator orientation="vertical" className="mx-1 h-6" />

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

        <Separator orientation="vertical" className="mx-1 h-6" />

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

        <Separator orientation="vertical" className="mx-1 h-6" />

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
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          tooltip="Horizontal rule"
        >
          <Minus className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

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
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none",
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
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
          "prose-p:my-2 prose-p:leading-relaxed",
          "prose-ul:my-2 prose-ol:my-2",
          "prose-li:my-0.5",
          "prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-4 prose-blockquote:italic",
          "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
          "prose-hr:my-4 prose-hr:border-border"
        ),
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
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {isInteractive && <EditorToolbar editor={editor} disabled={disabled} />}
      <div
        className={cn("overflow-y-auto", disabled && "pointer-events-none")}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

export { RichTextEditor };
