"use client";

/**
 * ================================================================================
 * MESSAGE COMPOSER COMPONENT
 * ================================================================================
 *
 * Rich text editor with variable insertion and AI assistance for composing
 * communication campaign messages. Supports both email (HTML) and SMS (text)
 * content modes with fullscreen editing support.
 *
 * ================================================================================
 */

import * as React from "react";
import {
  Sparkles,
  Eye,
  Code,
  MessageSquare,
  Mail,
  Phone,
  Maximize2,
  Minimize2,
  Facebook,
  Image,
  Video,
  Link2,
  AlertCircle,
  Loader2,
} from "lucide-react";

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
import { CKEditorRichText } from "@/components/ui/ckeditor-rich-text";
import { CKEditorRichTextViewer } from "@/components/ui/ckeditor-rich-text-viewer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VariableInserter, type VariableDefinition } from "./VariableInserter";
import type { CommunicationChannel, FacebookMediaType } from "@/models/communication/campaign.model";
import { FACEBOOK_LIMITS } from "@/models/communication/campaign.model";

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
  /** Facebook post text (plain text only) */
  facebookText?: string;
  /** Callback when Facebook text changes */
  onFacebookTextChange?: (text: string) => void;
  /** Facebook media URL (image or video) */
  facebookMediaUrl?: string;
  /** Callback when Facebook media URL changes */
  onFacebookMediaUrlChange?: (url: string) => void;
  /** Facebook media type */
  facebookMediaType?: FacebookMediaType;
  /** Callback when Facebook media type changes */
  onFacebookMediaTypeChange?: (type: FacebookMediaType) => void;
  /** Facebook link URL for preview */
  facebookLinkUrl?: string;
  /** Callback when Facebook link URL changes */
  onFacebookLinkUrlChange?: (url: string) => void;
  /** Link preview data */
  facebookLinkPreview?: { title?: string; description?: string; image?: string } | null;
  /** Callback to fetch link preview */
  onFetchLinkPreview?: (url: string) => Promise<{ title?: string; description?: string; image?: string } | null>;
  /** Which channels are enabled */
  channels?: CommunicationChannel[];
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
type ContentTab = "email" | "sms" | "facebook";

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
  facebookText = "",
  onFacebookTextChange,
  facebookMediaUrl = "",
  onFacebookMediaUrlChange,
  facebookMediaType = "none",
  onFacebookMediaTypeChange,
  facebookLinkUrl = "",
  onFacebookLinkUrlChange,
  facebookLinkPreview,
  onFetchLinkPreview,
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
    channels.includes("email") ? "email" : channels.includes("sms") ? "sms" : "facebook"
  );
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [localLinkPreview, setLocalLinkPreview] = React.useState<{ title?: string; description?: string; image?: string } | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const facebookTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = React.useRef<HTMLInputElement>(null);

  const hasEmail = channels.includes("email");
  const hasSms = channels.includes("sms");
  const hasFacebook = channels.includes("facebook");
  const channelCount = [hasEmail, hasSms, hasFacebook].filter(Boolean).length;
  const showTabs = channelCount > 1;

  // Update activeTab when channels change
  // If current tab is no longer available, switch to an available one
  React.useEffect(() => {
    const isCurrentTabAvailable =
      (activeTab === "email" && hasEmail) ||
      (activeTab === "sms" && hasSms) ||
      (activeTab === "facebook" && hasFacebook);

    if (!isCurrentTabAvailable) {
      if (hasEmail) setActiveTab("email");
      else if (hasSms) setActiveTab("sms");
      else if (hasFacebook) setActiveTab("facebook");
    }
  }, [activeTab, hasEmail, hasSms, hasFacebook]);

  // Reset viewMode when switching to SMS-only (code view not available)
  React.useEffect(() => {
    if (!hasEmail && viewMode === "code") {
      setViewMode("edit");
    }
  }, [hasEmail, viewMode]);

  // Handle ESC key to exit fullscreen
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Sync plain text from HTML when only email content provided
  React.useEffect(() => {
    if (hasEmail && hasSms && contentHtml && !contentText) {
      const plainText = htmlToPlainText(contentHtml);
      onContentTextChange?.(plainText);
    }
  }, [contentHtml, contentText, hasEmail, hasSms, onContentTextChange]);

  // Handle link preview fetching for Facebook
  const handleFetchLinkPreview = React.useCallback(
    async (url: string) => {
      if (!url || !onFetchLinkPreview) {
        setLocalLinkPreview(null);
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        setLocalLinkPreview(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const preview = await onFetchLinkPreview(url);
        setLocalLinkPreview(preview);
      } catch (error) {
        console.error("Failed to fetch link preview:", error);
        setLocalLinkPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [onFetchLinkPreview]
  );

  // Debounced link preview fetch
  React.useEffect(() => {
    if (!facebookLinkUrl) {
      setLocalLinkPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      handleFetchLinkPreview(facebookLinkUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [facebookLinkUrl, handleFetchLinkPreview]);

  // Handle variable insertion
  const handleVariableInsert = React.useCallback(
    (variable: string) => {
      if (activeTab === "email") {
        // For rich text editor, we need to insert at cursor
        // The editor handles this internally via onContentHtmlChange
        const newContent = contentHtml + variable;
        onContentHtmlChange?.(newContent);
      } else if (activeTab === "facebook") {
        // For Facebook textarea, insert at cursor position
        const textarea = facebookTextareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newText =
            facebookText.slice(0, start) + variable + facebookText.slice(end);
          onFacebookTextChange?.(newText);

          requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(
              start + variable.length,
              start + variable.length
            );
          });
        } else {
          onFacebookTextChange?.(facebookText + variable);
        }
      } else {
        // For SMS textarea, insert at cursor position
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
    [activeTab, contentHtml, contentText, facebookText, onContentHtmlChange, onContentTextChange, onFacebookTextChange]
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

  // Toolbar component (shared between normal and fullscreen views)
  const renderToolbar = (inFullscreen = false) => (
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

      {/* Fullscreen Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 px-2"
          >
            {inFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{inFullscreen ? "Exit fullscreen" : "Fullscreen editor"}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // Editor content based on current tab/view mode
  const renderEditorContent = (fullscreenHeight?: string) => {
    const height = fullscreenHeight || minHeight;

    if (showTabs) {
      return (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ContentTab)}
        >
          <TabsList className="mb-3">
            {hasEmail && (
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email
              </TabsTrigger>
            )}
            {hasSms && (
              <TabsTrigger value="sms" className="gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                SMS
              </TabsTrigger>
            )}
            {hasFacebook && (
              <TabsTrigger value="facebook" className="gap-1.5">
                <Facebook className="h-3.5 w-3.5" />
                Facebook
              </TabsTrigger>
            )}
          </TabsList>

          {hasEmail && (
            <TabsContent value="email" className="mt-0">
              {renderEmailContent(height)}
            </TabsContent>
          )}

          {hasSms && (
            <TabsContent value="sms" className="mt-0">
              {renderSmsContent(height)}
            </TabsContent>
          )}

          {hasFacebook && (
            <TabsContent value="facebook" className="mt-0">
              {renderFacebookContent(height)}
            </TabsContent>
          )}
        </Tabs>
      );
    }

    // Single channel - render directly without tabs
    if (hasEmail) return renderEmailContent(height);
    if (hasSms) return renderSmsContent(height);
    if (hasFacebook) return renderFacebookContent(height);
    return null;
  };

  function renderEmailContent(height: string = minHeight) {
    if (viewMode === "preview") {
      return (
        <div
          className="rounded-xl border border-border/50 bg-card/50 overflow-hidden"
          style={{ minHeight: height }}
        >
          <div className="p-4 border-b border-border/30 bg-muted/30">
            <p className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{subject || "(No subject)"}</span>
            </p>
          </div>
          <div className="p-4">
            {contentHtml ? (
              <CKEditorRichTextViewer content={contentHtml} withContainer={false} />
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
          style={{ minHeight: height }}
        />
      );
    }

    return (
      <CKEditorRichText
        value={contentHtml}
        onChange={onContentHtmlChange}
        placeholder={placeholder}
        disabled={disabled}
        minHeight={height}
        toolbar="standard"
      />
    );
  }

  function renderSmsContent(height: string = minHeight) {
    if (viewMode === "preview") {
      return (
        <div
          className="rounded-xl border border-border/50 bg-card/50 p-4"
          style={{ minHeight: height }}
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
          style={{ minHeight: height }}
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

  // Facebook character count
  const facebookCharCount = facebookText.length;
  const isOverFacebookLimit = facebookCharCount > FACEBOOK_LIMITS.MAX_TEXT_LENGTH;
  const isNearFacebookRecommended = facebookCharCount > FACEBOOK_LIMITS.RECOMMENDED_TEXT_LENGTH;

  // Use provided preview or local preview
  const effectiveLinkPreview = facebookLinkPreview ?? localLinkPreview;

  function renderFacebookContent(height: string = minHeight) {
    if (viewMode === "preview") {
      return (
        <div
          className="rounded-xl border border-border/50 bg-card/50 overflow-hidden"
          style={{ minHeight: height }}
        >
          {/* Facebook Post Preview */}
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Your Church Page</p>
                <p className="text-xs text-muted-foreground">Just now · 🌐</p>
              </div>
            </div>

            {/* Post text */}
            <p className="text-sm whitespace-pre-wrap">
              {facebookText || "No content to preview"}
            </p>

            {/* Media preview */}
            {facebookMediaUrl && facebookMediaType === "image" && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={facebookMediaUrl}
                  alt="Post media"
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext fill='%239ca3af' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
            )}

            {facebookMediaUrl && facebookMediaType === "video" && (
              <div className="rounded-lg overflow-hidden border bg-muted/50 p-8 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Video: {facebookMediaUrl}</p>
              </div>
            )}

            {/* Link preview */}
            {facebookLinkUrl && effectiveLinkPreview && (
              <div className="rounded-lg border overflow-hidden">
                {effectiveLinkPreview.image && (
                  <img
                    src={effectiveLinkPreview.image}
                    alt="Link preview"
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {new URL(facebookLinkUrl).hostname}
                  </p>
                  <p className="font-semibold text-sm mt-1">
                    {effectiveLinkPreview.title || "Link Preview"}
                  </p>
                  {effectiveLinkPreview.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {effectiveLinkPreview.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {facebookLinkUrl && !effectiveLinkPreview && !isLoadingPreview && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <Link2 className="h-4 w-4 inline mr-2 text-muted-foreground" />
                <span className="text-sm text-blue-600">{facebookLinkUrl}</span>
              </div>
            )}

            {/* Engagement buttons mock */}
            <div className="flex items-center gap-4 pt-2 border-t text-muted-foreground">
              <span className="text-xs">👍 Like</span>
              <span className="text-xs">💬 Comment</span>
              <span className="text-xs">↗️ Share</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Plain text content */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Post Content</Label>
          <Textarea
            ref={facebookTextareaRef}
            value={facebookText}
            onChange={(e) => onFacebookTextChange?.(e.target.value)}
            placeholder="What's on your mind? Write your Facebook post here..."
            disabled={disabled}
            className="resize-none"
            style={{ minHeight: height }}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge
                variant={isOverFacebookLimit ? "destructive" : isNearFacebookRecommended ? "secondary" : "outline"}
                className="font-mono text-[10px]"
              >
                {facebookCharCount.toLocaleString()} / {FACEBOOK_LIMITS.MAX_TEXT_LENGTH.toLocaleString()}
              </Badge>
            </div>
            {isNearFacebookRecommended && !isOverFacebookLimit && (
              <span className="text-amber-600">
                Recommended: under {FACEBOOK_LIMITS.RECOMMENDED_TEXT_LENGTH} chars for best engagement
              </span>
            )}
            {isOverFacebookLimit && (
              <span className="text-destructive">Over character limit!</span>
            )}
          </div>
        </div>

        {/* Media attachment */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Media (Optional)</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={facebookMediaType === "image" ? "secondary" : "outline"}
              size="sm"
              onClick={() => onFacebookMediaTypeChange?.(facebookMediaType === "image" ? "none" : "image")}
              disabled={disabled}
            >
              <Image className="h-4 w-4 mr-1.5" />
              Image
            </Button>
            <Button
              type="button"
              variant={facebookMediaType === "video" ? "secondary" : "outline"}
              size="sm"
              onClick={() => onFacebookMediaTypeChange?.(facebookMediaType === "video" ? "none" : "video")}
              disabled={disabled}
            >
              <Video className="h-4 w-4 mr-1.5" />
              Video
            </Button>
          </div>

          {facebookMediaType !== "none" && (
            <div className="space-y-2">
              <Input
                value={facebookMediaUrl}
                onChange={(e) => onFacebookMediaUrlChange?.(e.target.value)}
                placeholder={
                  facebookMediaType === "image"
                    ? "https://example.com/image.jpg"
                    : "https://example.com/video.mp4"
                }
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                {facebookMediaType === "image" ? (
                  <>
                    Supported formats: {FACEBOOK_LIMITS.SUPPORTED_IMAGE_FORMATS.join(", ")} •
                    Max size: {(FACEBOOK_LIMITS.MAX_IMAGE_SIZE / 1024 / 1024).toFixed(0)}MB
                  </>
                ) : (
                  <>
                    Supported formats: {FACEBOOK_LIMITS.SUPPORTED_VIDEO_FORMATS.join(", ")} •
                    Max size: {(FACEBOOK_LIMITS.MAX_VIDEO_SIZE / 1024 / 1024 / 1024).toFixed(0)}GB
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Link attachment */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Link Preview (Optional)</Label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={facebookLinkUrl}
              onChange={(e) => onFacebookLinkUrlChange?.(e.target.value)}
              placeholder="https://example.com/article"
              disabled={disabled}
              className="pl-9"
            />
            {isLoadingPreview && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Add a URL to generate a link preview in your post
          </p>

          {/* Link preview card */}
          {effectiveLinkPreview && (
            <div className="rounded-lg border overflow-hidden">
              {effectiveLinkPreview.image && (
                <img
                  src={effectiveLinkPreview.image}
                  alt="Link preview"
                  className="w-full h-24 object-cover"
                />
              )}
              <div className="p-3 bg-muted/30">
                <p className="font-medium text-sm">{effectiveLinkPreview.title || "Link"}</p>
                {effectiveLinkPreview.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {effectiveLinkPreview.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Facebook posts are plain text only. HTML formatting is not supported.
            You can add one image, one video, OR one link preview per post.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col bg-background transition-all duration-300 ease-out",
          isFullscreen ? "fixed inset-0 z-50 h-screen" : "space-y-4",
          className
        )}
      >
        {/* Fullscreen Header */}
        {isFullscreen && (
          <div className="px-6 py-4 border-b border-border/30 bg-gradient-to-r from-card/90 via-card/80 to-card/90 backdrop-blur-md shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {hasEmail ? "Compose Email" : hasSms ? "Compose SMS" : "Compose Facebook Post"}
              </h2>
              <div className="flex items-center gap-4">
                {renderToolbar(true)}
              </div>
            </div>
            {/* Subject in fullscreen for email */}
            {hasEmail && (
              <div className="mt-4 flex items-center gap-3">
                <Label htmlFor="fullscreen-subject" className="text-sm font-medium shrink-0">
                  Subject:
                </Label>
                <Input
                  id="fullscreen-subject"
                  placeholder="Enter a compelling subject line..."
                  value={subject}
                  onChange={(e) => onSubjectChange?.(e.target.value)}
                  disabled={disabled}
                  className="h-9 flex-1"
                />
                <VariableInserter
                  onInsert={handleSubjectVariableInsert}
                  customVariables={customVariables}
                  disabled={disabled}
                  size="sm"
                  variant="ghost"
                />
              </div>
            )}
          </div>
        )}

        {/* Normal (non-fullscreen) view */}
        {!isFullscreen && (
          <>
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
                {renderToolbar(false)}
              </div>

              {/* Channel Tabs / Editor */}
              {renderEditorContent()}
            </div>
          </>
        )}

        {/* Fullscreen Editor Content */}
        {isFullscreen && (
          <div className="flex-1 overflow-auto p-6">
            {renderEditorContent("calc(100vh - 180px)")}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
