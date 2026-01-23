"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { richTextStyles } from "./rich-text-editor";

export interface RichTextViewerProps {
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
 * RichTextViewer - Displays HTML content from the rich text editor with proper styling
 *
 * Use this component to display content created with the RichTextEditor.
 * It includes all the necessary CSS styles for headings, lists, blockquotes,
 * code blocks, tables, task lists, and other formatted content.
 *
 * @example
 * ```tsx
 * <RichTextViewer content={page.content} />
 *
 * // Without container styling
 * <RichTextViewer content={page.content} withContainer={false} />
 * ```
 */
export function RichTextViewer({
  content,
  className,
  withContainer = true,
}: RichTextViewerProps) {
  // Don't render if no content
  if (!content || content === "<p></p>") {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: richTextStyles }} />
      <div
        className={cn(
          "rich-text-content",
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
 * RichTextViewerInline - A lighter version without container styles
 *
 * Use when you want to embed rich text content within another styled container.
 */
export function RichTextViewerInline({
  content,
  className,
}: Omit<RichTextViewerProps, "withContainer">) {
  return (
    <RichTextViewer content={content} className={className} withContainer={false} />
  );
}
