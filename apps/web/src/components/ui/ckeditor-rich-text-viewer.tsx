"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Theme-aware content styles for CKEditor-produced HTML
// Works with both light and dark modes using CSS custom properties
export const ckeditorContentStyles = `
  /* ============================================
     BASE CONTENT STYLES (Theme-Aware)
     ============================================ */
  .ckeditor-content {
    font-family: inherit;
    line-height: 1.6;
    color: hsl(var(--foreground));
  }

  .ckeditor-content > * + * {
    margin-top: 0.75em;
  }

  /* ============================================
     HEADINGS
     ============================================ */
  .ckeditor-content h1 {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: hsl(var(--foreground));
  }

  .ckeditor-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    color: hsl(var(--foreground));
  }

  .ckeditor-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: hsl(var(--foreground));
  }

  .ckeditor-content h4 {
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: hsl(var(--foreground));
  }

  /* ============================================
     PARAGRAPHS AND TEXT
     ============================================ */
  .ckeditor-content p {
    margin: 0.5rem 0;
  }

  /* ============================================
     LISTS
     ============================================ */
  .ckeditor-content ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  .ckeditor-content ol {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  .ckeditor-content li {
    margin: 0.25rem 0;
  }

  .ckeditor-content li p {
    margin: 0;
  }

  /* Todo list styling */
  .ckeditor-content .todo-list {
    list-style: none;
    padding-left: 0;
  }

  .ckeditor-content .todo-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .ckeditor-content .todo-list li input[type="checkbox"] {
    margin-top: 0.25rem;
    width: 1rem;
    height: 1rem;
    accent-color: hsl(var(--primary));
  }

  /* ============================================
     BLOCKQUOTES
     ============================================ */
  .ckeditor-content blockquote {
    border-left: 4px solid hsl(var(--primary) / 0.3);
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    background: hsl(var(--muted) / 0.3);
    padding: 0.75rem 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
    color: hsl(var(--foreground));
  }

  /* ============================================
     CODE - Theme-aware
     ============================================ */
  .ckeditor-content code {
    background: hsl(var(--muted));
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: hsl(var(--foreground));
  }

  /* Code blocks - consistent dark background for both themes */
  .ckeditor-content pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .ckeditor-content pre code {
    background: none;
    padding: 0;
    font-size: 0.875rem;
    color: inherit;
  }

  /* ============================================
     HORIZONTAL RULE
     ============================================ */
  .ckeditor-content hr {
    border: none;
    border-top: 1px solid hsl(var(--border));
    margin: 1.5rem 0;
  }

  /* ============================================
     LINKS
     ============================================ */
  .ckeditor-content a {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: opacity 0.15s ease;
  }

  .ckeditor-content a:hover {
    opacity: 0.8;
  }

  /* ============================================
     IMAGES AND FIGURES
     ============================================ */
  .ckeditor-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem auto;
    display: block;
  }

  .ckeditor-content figure {
    margin: 1rem 0;
  }

  .ckeditor-content figure.image {
    text-align: center;
  }

  .ckeditor-content figure figcaption {
    text-align: center;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.5rem;
  }

  /* ============================================
     TABLES - Theme-aware
     ============================================ */
  .ckeditor-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }

  .ckeditor-content th,
  .ckeditor-content td {
    border: 1px solid hsl(var(--border));
    padding: 0.5rem;
    text-align: left;
    color: hsl(var(--foreground));
  }

  .ckeditor-content th {
    background: hsl(var(--muted) / 0.5);
    font-weight: 600;
  }

  /* Alternating row colors for better readability */
  .ckeditor-content tbody tr:nth-child(even) {
    background: hsl(var(--muted) / 0.15);
  }

  /* ============================================
     HIGHLIGHT MARKERS - Work in both themes
     ============================================ */
  .ckeditor-content .marker-yellow,
  .ckeditor-content mark.marker-yellow {
    background-color: #fef08a;
    color: #1a1a1a;
    padding: 0.125rem 0;
    border-radius: 0.125rem;
  }

  .ckeditor-content .marker-green,
  .ckeditor-content mark.marker-green {
    background-color: #bbf7d0;
    color: #1a1a1a;
    padding: 0.125rem 0;
    border-radius: 0.125rem;
  }

  .ckeditor-content .marker-pink,
  .ckeditor-content mark.marker-pink {
    background-color: #fbcfe8;
    color: #1a1a1a;
    padding: 0.125rem 0;
    border-radius: 0.125rem;
  }

  /* ============================================
     TEXT ALIGNMENT
     ============================================ */
  .ckeditor-content .text-center,
  .ckeditor-content [style*="text-align:center"],
  .ckeditor-content [style*="text-align: center"] {
    text-align: center;
  }

  .ckeditor-content .text-right,
  .ckeditor-content [style*="text-align:right"],
  .ckeditor-content [style*="text-align: right"] {
    text-align: right;
  }

  .ckeditor-content .text-justify,
  .ckeditor-content [style*="text-align:justify"],
  .ckeditor-content [style*="text-align: justify"] {
    text-align: justify;
  }

  /* ============================================
     MEDIA EMBED
     ============================================ */
  .ckeditor-content .media {
    margin: 1rem 0;
  }

  .ckeditor-content .media iframe {
    max-width: 100%;
    border-radius: 0.5rem;
  }

  /* Responsive video wrapper */
  .ckeditor-content .media-wrapper {
    position: relative;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    height: 0;
    overflow: hidden;
  }

  .ckeditor-content .media-wrapper iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 0.5rem;
  }

  /* ============================================
     TEXT DECORATIONS
     ============================================ */
  .ckeditor-content s {
    text-decoration: line-through;
  }

  .ckeditor-content u {
    text-decoration: underline;
  }

  .ckeditor-content sub {
    vertical-align: sub;
    font-size: smaller;
  }

  .ckeditor-content sup {
    vertical-align: super;
    font-size: smaller;
  }

  /* ============================================
     FONT COLORS - Preserve inline colors
     ============================================ */
  .ckeditor-content [style*="color:"] {
    /* Preserve custom colors set in the editor */
  }

  .ckeditor-content [style*="background-color:"] {
    /* Preserve custom background colors */
    padding: 0.125rem 0.25rem;
    border-radius: 0.125rem;
  }

  /* ============================================
     RESPONSIVE ADJUSTMENTS
     ============================================ */
  @media (max-width: 640px) {
    .ckeditor-content h1 {
      font-size: 1.5rem;
    }

    .ckeditor-content h2 {
      font-size: 1.25rem;
    }

    .ckeditor-content h3 {
      font-size: 1.125rem;
    }

    .ckeditor-content pre {
      padding: 0.75rem;
      font-size: 0.8rem;
    }

    .ckeditor-content table {
      display: block;
      overflow-x: auto;
    }
  }
`;

export interface CKEditorRichTextViewerProps {
  /**
   * The HTML content to display
   */
  content: string;
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
  /**
   * Whether to include default container styling (border, padding, etc.)
   * Defaults to true
   */
  withContainer?: boolean;
}

/**
 * CKEditorRichTextViewer - Displays HTML content from the CKEditor rich text editor with proper styling
 *
 * Use this component to display content created with the CKEditorRichText component.
 * It includes all the necessary CSS styles for headings, lists, blockquotes,
 * code blocks, tables, media embeds, and other formatted content.
 *
 * @example
 * ```tsx
 * <CKEditorRichTextViewer content={page.content} />
 *
 * // Without container styling
 * <CKEditorRichTextViewer content={page.content} withContainer={false} />
 * ```
 */
export function CKEditorRichTextViewer({
  content,
  className,
  withContainer = true,
}: CKEditorRichTextViewerProps) {
  // Don't render if no content
  if (!content || content === "<p></p>" || content === "<p>&nbsp;</p>") {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ckeditorContentStyles }} />
      <div
        className={cn(
          "ckeditor-content",
          withContainer && [
            "bg-card/50 rounded-xl border border-border/50",
            "p-4 sm:p-6",
            "shadow-sm",
            // Mobile-friendly text sizing
            "text-sm sm:text-base",
            // Ensure content is responsive
            "[&_img]:max-w-full [&_table]:overflow-x-auto [&_pre]:overflow-x-auto",
          ],
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
}

/**
 * CKEditorRichTextViewerInline - A lighter version without container styles
 *
 * Use when you want to embed rich text content within another styled container.
 */
export function CKEditorRichTextViewerInline({
  content,
  className,
}: Omit<CKEditorRichTextViewerProps, "withContainer">) {
  return (
    <CKEditorRichTextViewer content={content} className={className} withContainer={false} />
  );
}
