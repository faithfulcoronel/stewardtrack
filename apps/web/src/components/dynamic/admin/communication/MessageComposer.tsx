"use client";

/**
 * ================================================================================
 * MESSAGE COMPOSER COMPONENT
 * ================================================================================
 *
 * Rich text editor with variable insertion and AI assistance for composing
 * communication campaign messages. Supports both email (HTML) and SMS (text)
 * content modes.
 *
 * ================================================================================
 */

import * as React from "react";
import { Sparkles, Eye, Code, MessageSquare, Mail, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { VariableInserter, type VariableDefinition } from "./VariableInserter";

export interface MessageComposerProps {
  /** Email subject line (only used when channel includes email) */
  subject?: string;
  /** Callback when subject changes */
  onSubjectChange?: (subject: string) => void;
  /** HTML content for email channel */
  contentHtml?: string;
  /** Callback when HTML content changes */
  onContentHtmlChange?: (html: string) => void;
  /** Plain text content for SMS channel */
  contentText?: string;
  /** Callback when text content changes */
  onContentTextChange?: (text: string) => void;
  /** Which channels are enabled */
  channels?: ("email" | "sms")[];
  /** Placeholder text for the editor */
  placeholder?: string;
  /** Custom variables to add beyond defaults */
  customVariables?: VariableDefinition[];
  /** Whether the composer is disabled */
  disabled?: boolean;
  /** Callback when AI assist is requested */
  onAiAssist?: (type: "improve" | "subject" | "personalize" | "grammar") => void;
  /** Whether AI features are available */
  aiEnabled?: boolean;
  /** Minimum height of the editor */
  minHeight?: string;
  /** Optional class name */
  className?: string;
}

type ViewMode = "edit" | "preview" | "code";
type ContentTab = "email" | "sms";

/**
 * Converts HTML to plain text for SMS preview
 */
function htmlToPlainText(html: string): string {
  if (!html) return "";

  // Create a temporary div to parse HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Replace common elements with text equivalents
  temp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  temp.querySelectorAll("p").forEach((p) => {
    p.insertAdjacentText("afterend", "\n\n");
  });
  temp.querySelectorAll("li").forEach((li) => {
    li.insertAdjacentText("beforebegin", "• ");
    li.insertAdjacentText("afterend", "\n");
  });

  // Get text content
  let text = temp.textContent || temp.innerText || "";

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

/**
 * Calculates SMS segment count based on message length
 * Standard SMS is 160 chars, Unicode SMS is 70 chars
 */
function getSmsSegmentCount(text: string): number {
  if (!text) return 0;

  // Check for Unicode characters
  const hasUnicode = /[^\x00-\x7F]/.test(text);
  const maxLength = hasUnicode ? 70 : 160;
  const concatenatedMax = hasUnicode ? 67 : 153;

  if (text.length <= maxLength) return 1;

  return Math.ceil(text.length / concatenatedMax);
}

export function MessageComposer({
  subject = "",
  onSubjectChange,
  contentHtml = "",
  onContentHtmlChange,
  contentText = "",
  onContentTextChange,
  channels = ["email"],
  placeholder = "Start composing your message...",
  customVariables = [],
  disabled = false,
  onAiAssist,
  aiEnabled = true,
  minHeight = "300px",
  className,
}: MessageComposerProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("edit");
  const [activeTab, setActiveTab] = React.useState<ContentTab>(
    channels.includes("email") ? "email" : "sms"
  );

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = React.useRef<HTMLInputElement>(null);

  const hasEmail = channels.includes("email");
  const hasSms = channels.includes("sms");
  const showTabs = hasEmail && hasSms;

  // Sync plain text from HTML when only email content provided
  React.useEffect(() => {
    if (hasEmail && hasSms && contentHtml && !contentText) {
      const plainText = htmlToPlainText(contentHtml);
      onContentTextChange?.(plainText);
    }
  }, [contentHtml, contentText, hasEmail, hasSms, onContentTextChange]);

  // Handle variable insertion
  const handleVariableInsert = React.useCallback(
    (variable: string) => {
      if (activeTab === "email") {
        // For rich text editor, we need to insert at cursor
        // The editor handles this internally via onContentHtmlChange
        const newContent = contentHtml + variable;
        onContentHtmlChange?.(newContent);
      } else {
        // For textarea, insert at cursor position
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newText =
            contentText.slice(0, start) + variable + contentText.slice(end);
          onContentTextChange?.(newText);

          // Restore cursor position after variable
          requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(
              start + variable.length,
              start + variable.length
            );
          });
        } else {
          onContentTextChange?.(contentText + variable);
        }
      }
    },
    [activeTab, contentHtml, contentText, onContentHtmlChange, onContentTextChange]
  );

  // Handle subject variable insertion
  const handleSubjectVariableInsert = React.useCallback(
    (variable: string) => {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart || subject.length;
        const end = input.selectionEnd || subject.length;
        const newSubject =
          subject.slice(0, start) + variable + subject.slice(end);
        onSubjectChange?.(newSubject);

        requestAnimationFrame(() => {
          input.focus();
          input.setSelectionRange(
            start + variable.length,
            start + variable.length
          );
        });
      } else {
        onSubjectChange?.(subject + variable);
      }
    },
    [subject, onSubjectChange]
  );

  // SMS metrics
  const smsText = activeTab === "sms" ? contentText : htmlToPlainText(contentHtml);
  const smsCharCount = smsText.length;
  const smsSegments = getSmsSegmentCount(smsText);

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Subject Line (Email only) */}
        {hasEmail && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject" className="text-sm font-medium">
                Email Subject *
              </Label>
              <VariableInserter
                onInsert={handleSubjectVariableInsert}
                customVariables={customVariables}
                disabled={disabled}
                size="sm"
                variant="ghost"
              />
            </div>
            <Input
              ref={subjectInputRef}
              id="subject"
              placeholder="Enter a compelling subject line..."
              value={subject}
              onChange={(e) => onSubjectChange?.(e.target.value)}
              disabled={disabled}
              className="h-11"
            />
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-sm font-medium">Message Content *</Label>

            <div className="flex items-center gap-2">
              {/* AI Assist Button */}
              {aiEnabled && onAiAssist && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAiAssist("improve")}
                      disabled={disabled}
                      className="text-primary"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      AI Assist
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Get AI help improving your message</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Variable Inserter */}
              <VariableInserter
                onInsert={handleVariableInsert}
                customVariables={customVariables}
                disabled={disabled}
              />

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "edit" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("edit")}
                      className="h-7 px-2"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Edit mode</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "preview" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("preview")}
                      className="h-7 px-2"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Preview mode</p>
                  </TooltipContent>
                </Tooltip>

                {hasEmail && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "code" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("code")}
                        className="h-7 px-2"
                      >
                        <Code className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">HTML code view</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* Channel Tabs */}
          {showTabs ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as ContentTab)}
            >
              <TabsList className="mb-3">
                <TabsTrigger value="email" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-0">
                {renderEmailContent()}
              </TabsContent>

              <TabsContent value="sms" className="mt-0">
                {renderSmsContent()}
              </TabsContent>
            </Tabs>
          ) : hasEmail ? (
            renderEmailContent()
          ) : (
            renderSmsContent()
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  function renderEmailContent() {
    if (viewMode === "preview") {
      return (
        <div
          className="rounded-xl border border-border/50 bg-card/50 overflow-hidden"
          style={{ minHeight }}
        >
          <div className="p-4 border-b border-border/30 bg-muted/30">
            <p className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{subject || "(No subject)"}</span>
            </p>
          </div>
          <div className="p-4">
            {contentHtml ? (
              <RichTextViewer content={contentHtml} withContainer={false} />
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No content to preview
              </p>
            )}
          </div>
        </div>
      );
    }

    if (viewMode === "code") {
      return (
        <Textarea
          value={contentHtml}
          onChange={(e) => onContentHtmlChange?.(e.target.value)}
          placeholder="<p>Enter HTML content...</p>"
          disabled={disabled}
          className="font-mono text-sm"
          style={{ minHeight }}
        />
      );
    }

    return (
      <RichTextEditor
        value={contentHtml}
        onChange={onContentHtmlChange}
        placeholder={placeholder}
        disabled={disabled}
        minHeight={minHeight}
      />
    );
  }

  function renderSmsContent() {
    if (viewMode === "preview") {
      return (
        <div
          className="rounded-xl border border-border/50 bg-card/50 p-4"
          style={{ minHeight }}
        >
          <div className="max-w-xs mx-auto">
            {/* Mock SMS Bubble */}
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm p-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">
                {contentText || "No content to preview"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-right mt-2">
              {smsSegments} segment{smsSegments !== 1 ? "s" : ""} • {smsCharCount}{" "}
              characters
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={contentText}
          onChange={(e) => onContentTextChange?.(e.target.value)}
          placeholder="Type your SMS message..."
          disabled={disabled}
          className="resize-none"
          style={{ minHeight }}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {smsCharCount} chars
            </Badge>
            <Badge
              variant={smsSegments > 3 ? "destructive" : "outline"}
              className="font-mono text-[10px]"
            >
              {smsSegments} segment{smsSegments !== 1 ? "s" : ""}
            </Badge>
          </div>
          <span>160 chars per segment (standard)</span>
        </div>
      </div>
    );
  }
}
