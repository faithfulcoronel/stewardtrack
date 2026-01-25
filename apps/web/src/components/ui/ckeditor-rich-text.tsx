"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// CKEditor styles override for theme-aware styling (light and dark mode)
const ckeditorStyles = `
  /* ============================================
     BASE THEME VARIABLES
     ============================================ */
  .ck-editor-container {
    --ck-border-radius: 0.75rem;
    --ck-spacing-standard: 0.5rem;
    --ck-inner-shadow: none;
    --ck-drop-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

    /* Light mode colors (default) */
    --ck-color-base-foreground: hsl(var(--card));
    --ck-color-base-background: hsl(var(--card));
    --ck-color-base-border: hsl(var(--border));
    --ck-color-base-text: hsl(var(--foreground));
    --ck-color-base-active: hsl(var(--primary));
    --ck-color-base-active-focus: hsl(var(--primary));

    /* Focus states */
    --ck-focus-ring: 2px solid hsl(var(--primary) / 0.2);
    --ck-color-focus-border: hsl(var(--primary) / 0.5);
    --ck-color-focus-outer-shadow: hsl(var(--primary) / 0.2);

    /* Toolbar */
    --ck-color-toolbar-background: hsl(var(--muted) / 0.4);
    --ck-color-toolbar-border: hsl(var(--border) / 0.5);

    /* Buttons */
    --ck-color-button-default-background: transparent;
    --ck-color-button-default-hover-background: hsl(var(--muted));
    --ck-color-button-default-active-background: hsl(var(--muted));
    --ck-color-button-default-disabled-background: transparent;
    --ck-color-button-on-background: hsl(var(--primary) / 0.15);
    --ck-color-button-on-hover-background: hsl(var(--primary) / 0.25);
    --ck-color-button-on-active-background: hsl(var(--primary) / 0.3);
    --ck-color-button-on-color: hsl(var(--primary));
    --ck-color-button-on-disabled-background: hsl(var(--muted) / 0.5);
    --ck-color-button-action-background: hsl(var(--primary));
    --ck-color-button-action-hover-background: hsl(var(--primary) / 0.9);
    --ck-color-button-action-active-background: hsl(var(--primary) / 0.8);
    --ck-color-button-action-text: hsl(var(--primary-foreground));
    --ck-color-button-save: hsl(142.1 76.2% 36.3%);
    --ck-color-button-cancel: hsl(0 84.2% 60.2%);

    /* Dropdowns */
    --ck-color-dropdown-panel-background: hsl(var(--popover));
    --ck-color-dropdown-panel-border: hsl(var(--border));

    /* Inputs */
    --ck-color-input-background: hsl(var(--background));
    --ck-color-input-border: hsl(var(--input));
    --ck-color-input-text: hsl(var(--foreground));
    --ck-color-input-disabled-background: hsl(var(--muted) / 0.5);
    --ck-color-input-disabled-border: hsl(var(--border));
    --ck-color-input-disabled-text: hsl(var(--muted-foreground));

    /* Lists and panels */
    --ck-color-list-background: hsl(var(--popover));
    --ck-color-list-button-hover-background: hsl(var(--muted));
    --ck-color-list-button-on-background: hsl(var(--primary) / 0.15);
    --ck-color-list-button-on-background-focus: hsl(var(--primary) / 0.2);
    --ck-color-list-button-on-text: hsl(var(--primary));
    --ck-color-panel-background: hsl(var(--popover));
    --ck-color-panel-border: hsl(var(--border));

    /* Labels and text */
    --ck-color-labeled-field-label-background: hsl(var(--background));
    --ck-color-text: hsl(var(--foreground));
    --ck-color-engine-placeholder-text: hsl(var(--muted-foreground) / 0.5);

    /* Split button */
    --ck-color-split-button-hover-background: hsl(var(--muted));
    --ck-color-split-button-hover-border: hsl(var(--border));

    /* Widget */
    --ck-color-widget-blurred-border: hsl(var(--border));
    --ck-color-widget-hover-border: hsl(var(--primary) / 0.5);
    --ck-color-widget-editable-focus-background: hsl(var(--background));

    /* Link */
    --ck-color-link-default: hsl(var(--primary));

    /* Table */
    --ck-color-table-focused-cell-background: hsl(var(--primary) / 0.1);
  }

  /* ============================================
     DARK MODE OVERRIDES
     ============================================ */
  .dark .ck-editor-container,
  [data-theme="dark"] .ck-editor-container {
    --ck-color-base-foreground: hsl(var(--card));
    --ck-color-base-background: hsl(var(--card));
    --ck-color-base-border: hsl(var(--border));
    --ck-color-base-text: hsl(var(--foreground));

    /* Toolbar in dark mode */
    --ck-color-toolbar-background: hsl(var(--muted) / 0.3);
    --ck-color-toolbar-border: hsl(var(--border) / 0.5);

    /* Buttons in dark mode */
    --ck-color-button-default-hover-background: hsl(var(--muted) / 0.8);
    --ck-color-button-on-background: hsl(var(--primary) / 0.2);
    --ck-color-button-on-hover-background: hsl(var(--primary) / 0.3);

    /* Dropdowns in dark mode */
    --ck-color-dropdown-panel-background: hsl(var(--popover));
    --ck-color-dropdown-panel-border: hsl(var(--border));

    /* Inputs in dark mode */
    --ck-color-input-background: hsl(var(--background));
    --ck-color-input-border: hsl(var(--input));
    --ck-color-input-text: hsl(var(--foreground));

    /* Lists in dark mode */
    --ck-color-list-background: hsl(var(--popover));
    --ck-color-list-button-hover-background: hsl(var(--muted) / 0.8);

    /* Panels in dark mode */
    --ck-color-panel-background: hsl(var(--popover));
    --ck-color-panel-border: hsl(var(--border));

    /* Code blocks in dark mode */
    --ck-color-code-block-background: #1e1e1e;
    --ck-color-code-block-text: #d4d4d4;

    /* Drop shadow in dark mode */
    --ck-drop-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2);
  }

  /* ============================================
     EDITOR STRUCTURE
     ============================================ */

  /* Main editor wrapper */
  .ck-editor-container .ck.ck-editor {
    border-radius: var(--ck-border-radius);
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  /* Toolbar styling */
  .ck-editor-container .ck.ck-toolbar {
    border-top-left-radius: var(--ck-border-radius);
    border-top-right-radius: var(--ck-border-radius);
    border-color: var(--ck-color-toolbar-border);
    background: linear-gradient(
      to right,
      var(--ck-color-toolbar-background),
      hsl(var(--muted) / 0.2),
      var(--ck-color-toolbar-background)
    );
    padding: 0.5rem;
  }

  .ck-editor-container .ck.ck-toolbar .ck-toolbar__separator {
    background: var(--ck-color-base-border);
  }

  .ck-editor-container .ck.ck-toolbar .ck-toolbar__line-break {
    height: 0.5rem;
  }

  /* Editor content area */
  .ck-editor-container .ck.ck-editor__main > .ck-editor__editable {
    border-color: var(--ck-color-toolbar-border);
    border-top: none;
    border-bottom-left-radius: var(--ck-border-radius);
    border-bottom-right-radius: var(--ck-border-radius);
    background: var(--ck-color-base-background);
    color: var(--ck-color-base-text);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .ck-editor-container .ck.ck-editor__main > .ck-editor__editable:focus {
    border-color: var(--ck-color-focus-border);
    box-shadow: 0 0 0 2px var(--ck-color-focus-outer-shadow);
  }

  /* ============================================
     BUTTON STYLING
     ============================================ */
  .ck-editor-container .ck.ck-button {
    border-radius: 0.375rem;
    transition: all 0.15s ease;
  }

  .ck-editor-container .ck.ck-button:not(.ck-disabled):hover {
    background: var(--ck-color-button-default-hover-background);
  }

  .ck-editor-container .ck.ck-button.ck-on {
    background: var(--ck-color-button-on-background);
    color: var(--ck-color-button-on-color);
  }

  .ck-editor-container .ck.ck-button.ck-on:not(.ck-disabled):hover {
    background: var(--ck-color-button-on-hover-background);
  }

  /* Icon color inheritance */
  .ck-editor-container .ck.ck-button .ck-icon {
    color: inherit;
  }

  /* ============================================
     DROPDOWN STYLING
     ============================================ */
  .ck-editor-container .ck.ck-dropdown__panel {
    border-radius: 0.5rem;
    border-color: var(--ck-color-dropdown-panel-border);
    background: var(--ck-color-dropdown-panel-background);
    box-shadow: var(--ck-drop-shadow);
    overflow: hidden;
  }

  .ck-editor-container .ck.ck-dropdown__panel .ck-list {
    background: var(--ck-color-list-background);
  }

  .ck-editor-container .ck.ck-dropdown__panel .ck-list__item .ck-button:hover {
    background: var(--ck-color-list-button-hover-background);
  }

  .ck-editor-container .ck.ck-dropdown__panel .ck-list__item .ck-button.ck-on {
    background: var(--ck-color-list-button-on-background);
    color: var(--ck-color-list-button-on-text);
  }

  /* ============================================
     INPUT STYLING
     ============================================ */
  .ck-editor-container .ck.ck-input {
    background: var(--ck-color-input-background);
    border-color: var(--ck-color-input-border);
    color: var(--ck-color-input-text);
    border-radius: 0.375rem;
  }

  .ck-editor-container .ck.ck-input:focus {
    border-color: var(--ck-color-focus-border);
    box-shadow: 0 0 0 2px var(--ck-color-focus-outer-shadow);
  }

  /* ============================================
     BALLOON PANEL STYLING
     ============================================ */
  .ck-editor-container .ck.ck-balloon-panel {
    background: var(--ck-color-panel-background);
    border-color: var(--ck-color-panel-border);
    border-radius: 0.5rem;
    box-shadow: var(--ck-drop-shadow);
  }

  .ck-editor-container .ck.ck-balloon-panel .ck-balloon-panel__arrow {
    --ck-balloon-arrow-background: var(--ck-color-panel-background);
    --ck-balloon-arrow-border: var(--ck-color-panel-border);
  }

  /* ============================================
     CONTENT STYLING
     ============================================ */
  .ck-editor-container .ck-content {
    font-family: inherit;
    line-height: 1.6;
    padding: 1rem;
    color: var(--ck-color-base-text);
  }

  .ck-editor-container .ck-content h1 {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--ck-color-base-text);
  }

  .ck-editor-container .ck-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--ck-color-base-text);
  }

  .ck-editor-container .ck-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: var(--ck-color-base-text);
  }

  .ck-editor-container .ck-content h4 {
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: var(--ck-color-base-text);
  }

  .ck-editor-container .ck-content p {
    margin: 0.5rem 0;
  }

  .ck-editor-container .ck-content ul,
  .ck-editor-container .ck-content ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  .ck-editor-container .ck-content li {
    margin: 0.25rem 0;
  }

  .ck-editor-container .ck-content blockquote {
    border-left: 4px solid hsl(var(--primary) / 0.3);
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    background: hsl(var(--muted) / 0.3);
    padding: 0.75rem 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
    color: var(--ck-color-base-text);
  }

  .ck-editor-container .ck-content code {
    background: hsl(var(--muted));
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: var(--ck-color-base-text);
  }

  .ck-editor-container .ck-content pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .ck-editor-container .ck-content pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  .ck-editor-container .ck-content hr {
    border: none;
    border-top: 1px solid var(--ck-color-base-border);
    margin: 1.5rem 0;
  }

  .ck-editor-container .ck-content a {
    color: var(--ck-color-link-default);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .ck-editor-container .ck-content a:hover {
    opacity: 0.8;
  }

  .ck-editor-container .ck-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem auto;
    display: block;
  }

  .ck-editor-container .ck-content figure {
    margin: 1rem 0;
  }

  .ck-editor-container .ck-content figure figcaption {
    text-align: center;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.5rem;
  }

  .ck-editor-container .ck-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }

  .ck-editor-container .ck-content th,
  .ck-editor-container .ck-content td {
    border: 1px solid var(--ck-color-base-border);
    padding: 0.5rem;
    text-align: left;
  }

  .ck-editor-container .ck-content th {
    background: hsl(var(--muted) / 0.5);
    font-weight: 600;
  }

  /* ============================================
     TODO LIST STYLING
     ============================================ */
  .ck-editor-container .ck-content .todo-list {
    list-style: none;
    padding-left: 0;
  }

  .ck-editor-container .ck-content .todo-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .ck-editor-container .ck-content .todo-list li label input[type="checkbox"] {
    accent-color: hsl(var(--primary));
  }

  /* ============================================
     WORD COUNT STYLING
     ============================================ */
  .ck-editor-container .ck.ck-word-count {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    border-top: 1px solid var(--ck-color-toolbar-border);
    background: hsl(var(--muted) / 0.2);
    border-bottom-left-radius: var(--ck-border-radius);
    border-bottom-right-radius: var(--ck-border-radius);
  }

  /* ============================================
     PLACEHOLDER STYLING
     ============================================ */
  .ck-editor-container .ck.ck-editor__editable > .ck-placeholder::before {
    color: var(--ck-color-engine-placeholder-text);
  }

  /* ============================================
     STATE STYLES
     ============================================ */

  /* Disabled state */
  .ck-editor-container.disabled {
    opacity: 0.5;
    pointer-events: none;
    cursor: not-allowed;
  }

  /* Read-only state */
  .ck-editor-container .ck.ck-editor__editable.ck-read-only {
    background: hsl(var(--muted) / 0.2);
  }

  /* ============================================
     MEDIA EMBED STYLING
     ============================================ */
  .ck-editor-container .ck-content .media {
    margin: 1rem 0;
  }

  .ck-editor-container .ck-content .media iframe {
    max-width: 100%;
    border-radius: 0.5rem;
  }

  /* ============================================
     SOURCE EDITING MODE
     ============================================ */
  .ck-editor-container .ck-source-editing-area {
    background: hsl(var(--muted) / 0.3);
    border-radius: 0 0 var(--ck-border-radius) var(--ck-border-radius);
  }

  .ck-editor-container .ck-source-editing-area textarea {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875rem;
    background: transparent;
    color: var(--ck-color-base-text);
  }

  /* ============================================
     HIGHLIGHT MARKERS
     ============================================ */
  .ck-editor-container .ck-content .marker-yellow,
  .ck-editor-container .ck-content mark.marker-yellow {
    background-color: #fef08a;
  }

  .ck-editor-container .ck-content .marker-green,
  .ck-editor-container .ck-content mark.marker-green {
    background-color: #bbf7d0;
  }

  .ck-editor-container .ck-content .marker-pink,
  .ck-editor-container .ck-content mark.marker-pink {
    background-color: #fbcfe8;
  }

  /* ============================================
     RESPONSIVE ADJUSTMENTS
     ============================================ */
  @media (max-width: 640px) {
    .ck-editor-container .ck.ck-toolbar {
      padding: 0.375rem;
    }

    .ck-editor-container .ck-content {
      padding: 0.75rem;
    }
  }
`;

export interface CKEditorRichTextProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  minHeight?: string;
  showWordCount?: boolean;
  /**
   * Toolbar configuration preset
   * - "full": All features (default)
   * - "standard": Common features without advanced ones
   * - "basic": Minimal toolbar for simple editing
   */
  toolbar?: "full" | "standard" | "basic";
}

// Toolbar configurations
const toolbarConfigs = {
  full: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "fontFamily",
      "fontSize",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "code",
      "subscript",
      "superscript",
      "removeFormat",
      "|",
      "fontColor",
      "fontBackgroundColor",
      "highlight",
      "|",
      "alignment",
      "|",
      "bulletedList",
      "numberedList",
      "todoList",
      "|",
      "outdent",
      "indent",
      "|",
      "blockQuote",
      "codeBlock",
      "horizontalLine",
      "|",
      "link",
      "insertImage",
      "insertTable",
      "mediaEmbed",
      "|",
      "specialCharacters",
      "findAndReplace",
      "|",
      "sourceEditing",
    ],
    shouldNotGroupWhenFull: false,
  },
  standard: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "|",
      "fontColor",
      "highlight",
      "|",
      "alignment",
      "|",
      "bulletedList",
      "numberedList",
      "todoList",
      "|",
      "blockQuote",
      "codeBlock",
      "|",
      "link",
      "insertImage",
      "insertTable",
    ],
    shouldNotGroupWhenFull: false,
  },
  basic: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "|",
      "bulletedList",
      "numberedList",
      "|",
      "link",
      "insertImage",
    ],
    shouldNotGroupWhenFull: true,
  },
};

function CKEditorRichText({
  value = "",
  onChange,
  placeholder = "Start typing...",
  disabled = false,
  readOnly = false,
  className,
  minHeight = "200px",
  toolbar = "full",
}: CKEditorRichTextProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [editorInstance, setEditorInstance] = React.useState<any>(null);
  const [CKEditorReact, setCKEditorReact] = React.useState<any>(null);
  const [editorClass, setEditorClass] = React.useState<any>(null);
  const [editorConfig, setEditorConfig] = React.useState<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Load CKEditor modules dynamically on client-side only
  React.useEffect(() => {
    let mounted = true;

    const loadEditor = async () => {
      try {
        // Dynamic imports to avoid SSR issues
        const [{ CKEditor }, ckeditorModule] = await Promise.all([
          import("@ckeditor/ckeditor5-react"),
          import("ckeditor5"),
        ]);

        // Import CSS (no type declarations for CSS modules)
        // @ts-expect-error - CSS import has no type declarations
        await import("ckeditor5/ckeditor5.css");

        if (!mounted) return;

        const {
          ClassicEditor,
          Essentials,
          Paragraph,
          Bold,
          Italic,
          Underline,
          Strikethrough,
          Code,
          Subscript,
          Superscript,
          Heading,
          Font,
          FontFamily,
          FontSize,
          FontColor,
          FontBackgroundColor,
          Highlight,
          Alignment,
          List,
          ListProperties,
          TodoList,
          Indent,
          IndentBlock,
          BlockQuote,
          CodeBlock,
          HorizontalLine,
          Link,
          AutoLink,
          Image,
          ImageBlock,
          ImageInline,
          ImageCaption,
          ImageResize,
          ImageStyle,
          ImageToolbar,
          ImageUpload,
          ImageInsert,
          ImageInsertViaUrl,
          Table,
          TableToolbar,
          TableProperties,
          TableCellProperties,
          TableCaption,
          TableColumnResize,
          MediaEmbed,
          Undo,
          FindAndReplace,
          SpecialCharacters,
          SpecialCharactersEssentials,
          RemoveFormat,
          SourceEditing,
          GeneralHtmlSupport,
          HtmlEmbed,
          WordCount,
          Autoformat,
          TextTransformation,
          PasteFromOffice,
          Clipboard,
          ClipboardPipeline,
          DragDrop,
        } = ckeditorModule;

        // Create upload adapter plugin
        function CustomUploadAdapterPlugin(editor: any): void {
          editor.plugins.get("FileRepository").createUploadAdapter = (loader: any) => {
            return {
              upload: async () => {
                const file = await loader.file;
                if (!file) throw new Error("No file to upload");

                const formData = new FormData();
                formData.append("file", file);

                const response = await fetch("/api/editor/upload-image", {
                  method: "POST",
                  body: formData,
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || "Upload failed");
                }

                const result = await response.json();
                return { default: result.url };
              },
              abort: () => {},
            };
          };
        }

        const config = {
          licenseKey: "GPL",
          plugins: [
            Essentials,
            Paragraph,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            Code,
            Subscript,
            Superscript,
            Heading,
            Font,
            FontFamily,
            FontSize,
            FontColor,
            FontBackgroundColor,
            Highlight,
            Alignment,
            List,
            ListProperties,
            TodoList,
            Indent,
            IndentBlock,
            BlockQuote,
            CodeBlock,
            HorizontalLine,
            Link,
            AutoLink,
            Image,
            ImageBlock,
            ImageInline,
            ImageCaption,
            ImageResize,
            ImageStyle,
            ImageToolbar,
            ImageUpload,
            ImageInsert,
            ImageInsertViaUrl,
            ClipboardPipeline,
            DragDrop,
            Table,
            TableToolbar,
            TableProperties,
            TableCellProperties,
            TableCaption,
            TableColumnResize,
            MediaEmbed,
            Undo,
            FindAndReplace,
            SpecialCharacters,
            SpecialCharactersEssentials,
            RemoveFormat,
            SourceEditing,
            GeneralHtmlSupport,
            HtmlEmbed,
            WordCount,
            Autoformat,
            TextTransformation,
            PasteFromOffice,
            Clipboard,
            CustomUploadAdapterPlugin,
          ],
          toolbar: toolbarConfigs[toolbar],
          placeholder,
          heading: {
            options: [
              { model: "paragraph" as const, title: "Paragraph", class: "ck-heading_paragraph" },
              { model: "heading1" as const, view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
              { model: "heading2" as const, view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
              { model: "heading3" as const, view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
              { model: "heading4" as const, view: "h4", title: "Heading 4", class: "ck-heading_heading4" },
            ],
          },
          fontFamily: {
            options: [
              "default",
              "Arial, Helvetica, sans-serif",
              "Courier New, Courier, monospace",
              "Georgia, serif",
              "Times New Roman, Times, serif",
              "Verdana, Geneva, sans-serif",
            ],
            supportAllValues: true,
          },
          fontSize: {
            options: [10, 12, 14, "default", 18, 20, 22, 24, 26, 28, 36, 48],
            supportAllValues: true,
          },
          image: {
            toolbar: [
              "imageTextAlternative",
              "toggleImageCaption",
              "|",
              "imageStyle:inline",
              "imageStyle:wrapText",
              "imageStyle:breakText",
              "|",
              "resizeImage",
            ],
            insert: {
              integrations: ["upload", "url"],
              type: "auto" as const,
            },
          },
          table: {
            contentToolbar: [
              "tableColumn",
              "tableRow",
              "mergeTableCells",
              "tableProperties",
              "tableCellProperties",
            ],
          },
          link: {
            decorators: {
              openInNewTab: {
                mode: "manual" as const,
                label: "Open in a new tab",
                attributes: {
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
              },
            },
          },
          htmlSupport: {
            allow: [
              {
                name: /.*/,
                attributes: true,
                classes: true,
                styles: true,
              },
            ],
          },
          initialData: value,
        };

        setCKEditorReact(() => CKEditor);
        setEditorClass(() => ClassicEditor);
        setEditorConfig(config);
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load CKEditor:", error);
      }
    };

    loadEditor();

    return () => {
      mounted = false;
    };
  }, [placeholder, toolbar, value]);

  // Update read-only state
  React.useEffect(() => {
    if (editorInstance) {
      if (readOnly) {
        editorInstance.enableReadOnlyMode("readonly-mode");
      } else {
        editorInstance.disableReadOnlyMode("readonly-mode");
      }
    }
  }, [editorInstance, readOnly]);

  // Sync external value changes to the editor
  // This enables programmatic updates (e.g., AI assist, template application)
  React.useEffect(() => {
    if (editorInstance && value !== undefined) {
      const currentData = editorInstance.getData();
      // Only update if the value actually changed (avoid cursor jumps)
      if (currentData !== value) {
        editorInstance.setData(value);
      }
    }
  }, [editorInstance, value]);

  const handleReady = (editor: any) => {
    setEditorInstance(editor);

    if (readOnly) {
      editor.enableReadOnlyMode("readonly-mode");
    }

    const editableElement = editor.ui.view.editable?.element;
    if (editableElement) {
      editableElement.style.minHeight = minHeight;
    }
  };

  const handleChange = (_event: any, editor: any) => {
    const data = editor.getData();
    const isEmpty = data === "" || data === "<p>&nbsp;</p>" || data === "<p></p>";
    onChange?.(isEmpty ? "" : data);
  };

  // Loading skeleton
  if (!isLoaded || !CKEditorReact || !editorClass || !editorConfig) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: ckeditorStyles }} />
        <div
          className={cn(
            "ck-editor-container overflow-hidden rounded-xl border border-border/50 bg-card/50 animate-pulse",
            className
          )}
          style={{ minHeight }}
        >
          <div className="h-12 bg-muted/40 border-b border-border/50" />
          <div className="p-4">
            <div className="h-4 bg-muted/40 rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted/40 rounded w-1/2" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ckeditorStyles }} />
      <div
        ref={containerRef}
        className={cn(
          "ck-editor-container overflow-hidden rounded-xl shadow-sm transition-all duration-200",
          disabled && "disabled",
          className
        )}
      >
        <CKEditorReact
          editor={editorClass}
          config={editorConfig}
          disabled={disabled}
          onReady={handleReady}
          onChange={handleChange}
        />
      </div>
    </>
  );
}

export { CKEditorRichText };
