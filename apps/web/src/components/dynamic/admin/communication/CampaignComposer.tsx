"use client";

/**
 * ================================================================================
 * CAMPAIGN COMPOSER COMPONENT
 * ================================================================================
 *
 * Full campaign composition page component that combines:
 * - Message composer with rich text editor
 * - Recipient selector with multi-source selection
 * - Template selector with AI generation
 * - Channel selection (Email/SMS)
 * - Campaign scheduling options
 * - AI assistance panel
 *
 * This component is registered in the metadata component registry for use
 * in XML-driven pages.
 *
 * ================================================================================
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Save,
  Clock,
  Mail,
  Phone,
  Users,
  FileText,
  Sparkles,
  ArrowLeft,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Facebook,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { MessageComposer } from "./MessageComposer";
import { RecipientSelector, type Recipient, type RecipientGroup } from "./RecipientSelector";
import { TemplateSelector, type MessageTemplate, type TemplateCategory } from "./TemplateSelector";
import { AIAssistantPanel } from "./AIAssistantPanel";
import type { CommunicationChannel, FacebookMediaType, FacebookPostData } from "@/models/communication/campaign.model";

/** Campaign types */
export type CampaignType = "individual" | "bulk" | "scheduled" | "recurring";

/** Campaign form data */
interface CampaignFormData {
  name: string;
  description: string;
  campaignType: CampaignType;
  channels: CommunicationChannel[];
  subject: string;
  contentHtml: string;
  contentText: string;
  // Facebook-specific fields
  facebookText: string;
  facebookMediaUrl: string;
  facebookMediaType: FacebookMediaType;
  facebookLinkUrl: string;
  templateId?: string;
  recipients: Recipient[];
  scheduledAt?: string;
}

export interface CampaignComposerProps {
  /** Campaign ID if editing */
  campaignId?: string;
  /** Initial form data */
  initialData?: Partial<CampaignFormData>;
  /** Available members for recipient selection */
  members?: Recipient[];
  /** Available families for recipient selection */
  families?: RecipientGroup[];
  /** Available events for recipient selection */
  events?: RecipientGroup[];
  /** Available ministries for recipient selection */
  ministries?: RecipientGroup[];
  /** Available custom lists for recipient selection */
  customLists?: RecipientGroup[];
  /** Available templates */
  templates?: MessageTemplate[];
  /** Callback to load group members */
  onLoadGroupMembers?: (source: string, groupId: string) => Promise<Recipient[]>;
  /** Callback to search members */
  onSearchMembers?: (query: string) => Promise<Recipient[]>;
  /** Callback to load templates */
  onLoadTemplates?: () => Promise<MessageTemplate[]>;
  /** Callback to generate AI template */
  onGenerateTemplate?: (category: TemplateCategory) => Promise<MessageTemplate>;
  /** Callback to save campaign as draft */
  onSaveDraft?: (data: CampaignFormData) => Promise<{ id: string }>;
  /** Callback to send campaign */
  onSend?: (data: CampaignFormData) => Promise<void>;
  /** Callback for AI assist */
  onAiAssist?: (type: string, content: string) => Promise<string>;
  /** Whether AI features are enabled */
  aiEnabled?: boolean;
  /** Whether the component is loading */
  isLoading?: boolean;
  /** Back URL */
  backUrl?: string;
  /** Optional class name */
  className?: string;
}

type AiAssistType = "improve" | "subject" | "personalize" | "grammar" | "shorten";

export function CampaignComposer({
  campaignId,
  initialData,
  members = [],
  families = [],
  events = [],
  ministries = [],
  customLists = [],
  templates = [],
  onLoadGroupMembers,
  onSearchMembers,
  onLoadTemplates,
  onGenerateTemplate,
  onSaveDraft,
  onSend,
  onAiAssist,
  aiEnabled = true,
  isLoading = false,
  backUrl = "/admin/communication",
  className,
}: CampaignComposerProps) {
  const router = useRouter();

  // Form state
  const [form, setForm] = React.useState<CampaignFormData>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    campaignType: initialData?.campaignType ?? "bulk",
    channels: initialData?.channels ?? ["email"],
    subject: initialData?.subject ?? "",
    contentHtml: initialData?.contentHtml ?? "",
    contentText: initialData?.contentText ?? "",
    facebookText: initialData?.facebookText ?? "",
    facebookMediaUrl: initialData?.facebookMediaUrl ?? "",
    facebookMediaType: initialData?.facebookMediaType ?? "none",
    facebookLinkUrl: initialData?.facebookLinkUrl ?? "",
    templateId: initialData?.templateId,
    recipients: initialData?.recipients ?? [],
    scheduledAt: initialData?.scheduledAt,
  });

  // Link preview state for Facebook
  const [facebookLinkPreview, setFacebookLinkPreview] = React.useState<{
    title?: string;
    description?: string;
    image?: string;
  } | null>(null);

  // UI state
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [showRecipients, setShowRecipients] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

  // Derived state
  const isEditing = Boolean(campaignId);
  const hasEmail = form.channels.includes("email");
  const hasSms = form.channels.includes("sms");
  const hasFacebook = form.channels.includes("facebook");

  // Channel toggle
  const toggleChannel = React.useCallback((channel: CommunicationChannel) => {
    setForm((prev) => {
      const channels = prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel];
      return { ...prev, channels };
    });
  }, []);

  // Fetch Facebook link preview
  const handleFetchLinkPreview = React.useCallback(
    async (url: string): Promise<{ title?: string; description?: string; image?: string } | null> => {
      try {
        const response = await fetch("/api/admin/communication/facebook/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        const preview = data.preview || null;
        setFacebookLinkPreview(preview);
        return preview;
      } catch (error) {
        console.error("Failed to fetch link preview:", error);
        return null;
      }
    },
    []
  );

  // Validate form
  const validate = React.useCallback((): string[] => {
    const errors: string[] = [];

    if (!form.name.trim()) {
      errors.push("Campaign name is required");
    }

    if (form.channels.length === 0) {
      errors.push("Select at least one channel (Email, SMS, or Facebook)");
    }

    if (hasEmail && !form.subject.trim()) {
      errors.push("Email subject is required");
    }

    if (!form.contentHtml.trim() && !form.contentText.trim()) {
      errors.push("Message content is required");
    }

    if (form.recipients.length === 0) {
      errors.push("Add at least one recipient");
    }

    return errors;
  }, [form, hasEmail]);

  // Handle template selection
  const handleTemplateSelect = React.useCallback((template: MessageTemplate) => {
    setForm((prev) => ({
      ...prev,
      templateId: template.id,
      subject: template.subject ?? prev.subject,
      contentHtml: template.contentHtml ?? prev.contentHtml,
      contentText: template.contentText ?? prev.contentText,
    }));
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied`);
  }, []);

  // AI assist type descriptions for user feedback
  const getAiAssistDescription = (type: AiAssistType): { action: string; result: string } => {
    switch (type) {
      case "subject":
        return { action: "Generating subject line suggestions", result: "Subject line updated" };
      case "improve":
        return { action: "Improving your content (analyzing text and images)", result: "Content improved" };
      case "grammar":
        return { action: "Checking grammar and spelling", result: "Grammar fixed" };
      case "shorten":
        return { action: "Shortening your message", result: "Content shortened" };
      case "personalize":
        return { action: "Adding personalization placeholders", result: "Personalization added" };
      default:
        return { action: "Processing with AI", result: "AI suggestion applied" };
    }
  };

  // Extract images from HTML content to preserve them after AI processing
  // This captures both standalone <img> tags and <figure> wrapped images (CKEditor format)
  // which includes sizing, alignment, and caption information
  const extractImagesFromContent = (html: string): string[] => {
    const images: string[] = [];

    // First, extract <figure> elements containing images (CKEditor's format for resized images)
    // This preserves width, height, alignment, and any captions
    const figureRegex = /<figure[^>]*class="[^"]*image[^"]*"[^>]*>[\s\S]*?<\/figure>/gi;
    const figures = html.match(figureRegex) || [];
    images.push(...figures);

    // Then extract standalone <img> tags that are NOT inside figures
    // Remove figures temporarily to find standalone images
    const htmlWithoutFigures = html.replace(figureRegex, "");
    const imgRegex = /<img[^>]+>/gi;
    const standaloneImages = htmlWithoutFigures.match(imgRegex) || [];
    images.push(...standaloneImages);

    return images;
  };

  // Merge AI-improved text with preserved images
  const mergeContentWithImages = (improvedContent: string, originalImages: string[]): string => {
    if (originalImages.length === 0) {
      return improvedContent;
    }

    // Append preserved images at the end, maintaining their original structure
    // (including figure wrappers with sizing)
    const imagesHtml = originalImages.join("\n");

    // Check if improved content ends with a closing tag
    if (improvedContent.trim().endsWith(">")) {
      return improvedContent + "\n" + imagesHtml;
    }

    return improvedContent + "\n" + imagesHtml;
  };

  // Handle AI assist
  const handleAiAssist = React.useCallback(
    async (type: AiAssistType) => {
      if (!onAiAssist) return;

      const content = type === "subject" ? form.subject : form.contentHtml || form.contentText;

      // Validate content before making API call
      if (!content?.trim()) {
        toast.error("Please write some content first to use AI assistance");
        return;
      }

      const aiDescription = getAiAssistDescription(type);

      // Extract images from original content to preserve them
      const originalImages = type !== "subject" ? extractImagesFromContent(form.contentHtml || "") : [];

      setAiLoading(true);

      // Show a loading toast with the action being performed
      const loadingToastId = toast.loading(aiDescription.action + "...", {
        description: originalImages.length > 0
          ? "Analyzing your content and images..."
          : "This may take a moment",
      });

      try {
        const result = await onAiAssist(type, content);

        // Dismiss the loading toast
        toast.dismiss(loadingToastId);

        if (type === "subject") {
          setForm((prev) => ({ ...prev, subject: result }));
        } else {
          // Merge the AI result with preserved images
          const mergedContent = mergeContentWithImages(result, originalImages);
          setForm((prev) => ({
            ...prev,
            contentHtml: mergedContent,
          }));
        }

        toast.success(aiDescription.result, {
          description: type === "improve" && originalImages.length > 0
            ? "Your images have been preserved"
            : type === "improve"
              ? "Review the changes in the editor"
              : undefined,
        });
      } catch (error) {
        // Dismiss the loading toast on error
        toast.dismiss(loadingToastId);
        console.error("AI assist failed:", error);
        toast.error(error instanceof Error ? error.message : "Failed to get AI suggestion");
      } finally {
        setAiLoading(false);
      }
    },
    [onAiAssist, form.subject, form.contentHtml, form.contentText]
  );

  // Handle save draft
  const handleSaveDraft = React.useCallback(async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    if (!onSaveDraft) {
      toast.error("Save functionality not available");
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSaveDraft(form);
      toast.success("Campaign saved as draft");
      router.push(`/admin/communication/campaigns/${result.id}`);
    } catch (error) {
      console.error("Failed to save campaign:", error);
      toast.error("Failed to save campaign");
    } finally {
      setIsSaving(false);
    }
  }, [form, onSaveDraft, router]);

  // Handle send
  const handleSend = React.useCallback(async () => {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the errors before sending");
      return;
    }

    setValidationErrors([]);

    if (!onSend) {
      toast.error("Send functionality not available");
      return;
    }

    setIsSending(true);
    try {
      await onSend(form);
      toast.success("Campaign sent successfully!");
      router.push("/admin/communication/campaigns");
    } catch (error) {
      console.error("Failed to send campaign:", error);
      toast.error("Failed to send campaign");
    } finally {
      setIsSending(false);
    }
  }, [form, validate, onSend, router]);

  return (
    <TooltipProvider>
      <div className={cn("container mx-auto py-6 px-4 space-y-6", className)}>
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link
            href={backUrl}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Communication
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isEditing ? "Edit Campaign" : "Compose Message"}
              </h1>
              <p className="text-muted-foreground">
                Create a new campaign to reach your congregation
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || isSending || isLoading}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSaving || isSending || isLoading}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Now
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Please fix the following errors</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>Basic information about your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Weekly Newsletter - January 25"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this campaign..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Campaign Type</Label>
                  <Select
                    value={form.campaignType}
                    onValueChange={(value: CampaignType) =>
                      setForm({ ...form, campaignType: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Message</SelectItem>
                      <SelectItem value="bulk">Bulk Campaign</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scheduled date */}
                {form.campaignType === "scheduled" && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">Schedule For</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={form.scheduledAt ?? ""}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Content Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Message Content</CardTitle>
                    <CardDescription>Compose your message with personalization</CardDescription>
                  </div>

                  {/* Template button */}
                  <Sheet open={showTemplates} onOpenChange={setShowTemplates}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-lg">
                      <SheetHeader>
                        <SheetTitle>Message Templates</SheetTitle>
                        <SheetDescription>
                          Choose a template to get started quickly
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6">
                        <TemplateSelector
                          templates={templates}
                          value={form.templateId}
                          onSelect={handleTemplateSelect}
                          channelFilter={form.channels.length === 1 ? form.channels[0] : "all"}
                          aiEnabled={aiEnabled}
                          onGenerateTemplate={onGenerateTemplate}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardHeader>
              <CardContent>
                <MessageComposer
                  subject={form.subject}
                  onSubjectChange={(subject) => setForm({ ...form, subject })}
                  contentHtml={form.contentHtml}
                  onContentHtmlChange={(contentHtml) => setForm({ ...form, contentHtml })}
                  contentText={form.contentText}
                  onContentTextChange={(contentText) => setForm({ ...form, contentText })}
                  facebookText={form.facebookText}
                  onFacebookTextChange={(facebookText) => setForm({ ...form, facebookText })}
                  facebookMediaUrl={form.facebookMediaUrl}
                  onFacebookMediaUrlChange={(facebookMediaUrl) => setForm({ ...form, facebookMediaUrl })}
                  facebookMediaType={form.facebookMediaType}
                  onFacebookMediaTypeChange={(facebookMediaType) => setForm({ ...form, facebookMediaType })}
                  facebookLinkUrl={form.facebookLinkUrl}
                  onFacebookLinkUrlChange={(facebookLinkUrl) => setForm({ ...form, facebookLinkUrl })}
                  facebookLinkPreview={facebookLinkPreview}
                  onFetchLinkPreview={handleFetchLinkPreview}
                  channels={form.channels}
                  placeholder="Write your message here..."
                  disabled={isLoading}
                  aiEnabled={aiEnabled}
                  onAiAssist={handleAiAssist}
                  minHeight="250px"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Channels Card */}
            <Card>
              <CardHeader>
                <CardTitle>Channels</CardTitle>
                <CardDescription>Select delivery methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="email"
                    checked={hasEmail}
                    onCheckedChange={() => toggleChannel("email")}
                    disabled={isLoading}
                  />
                  <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="sms"
                    checked={hasSms}
                    onCheckedChange={() => toggleChannel("sms")}
                    disabled={isLoading}
                  />
                  <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer">
                    <Phone className="h-4 w-4" />
                    SMS
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="facebook"
                    checked={hasFacebook}
                    onCheckedChange={() => toggleChannel("facebook")}
                    disabled={isLoading}
                  />
                  <Label htmlFor="facebook" className="flex items-center gap-2 cursor-pointer">
                    <Facebook className="h-4 w-4" />
                    Facebook Page
                  </Label>
                </div>
                {hasFacebook && (
                  <p className="text-xs text-muted-foreground pl-6">
                    Posts to your connected Facebook Page. Max 63,206 characters.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recipients Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recipients</CardTitle>
                    <CardDescription>Select who receives this message</CardDescription>
                  </div>
                  {form.recipients.length > 0 && (
                    <Badge variant="secondary">{form.recipients.length}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {form.recipients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No recipients selected
                    </p>
                    <Sheet open={showRecipients} onOpenChange={setShowRecipients}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm">
                          Add Recipients
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>Select Recipients</SheetTitle>
                          <SheetDescription>
                            Choose who will receive this campaign
                          </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6">
                          <RecipientSelector
                            value={form.recipients}
                            onChange={(recipients) => setForm({ ...form, recipients })}
                            members={members}
                            families={families}
                            events={events}
                            ministries={ministries}
                            customLists={customLists}
                            onLoadGroupMembers={onLoadGroupMembers}
                            onSearchMembers={onSearchMembers}
                            channels={form.channels}
                            disabled={isLoading}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {form.recipients.slice(0, 5).map((recipient) => (
                        <Badge key={`${recipient.source}-${recipient.id}`} variant="secondary">
                          {recipient.name}
                        </Badge>
                      ))}
                      {form.recipients.length > 5 && (
                        <Badge variant="outline">+{form.recipients.length - 5} more</Badge>
                      )}
                    </div>
                    <Sheet open={showRecipients} onOpenChange={setShowRecipients}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          Manage Recipients
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>Select Recipients</SheetTitle>
                          <SheetDescription>
                            Choose who will receive this campaign
                          </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6">
                          <RecipientSelector
                            value={form.recipients}
                            onChange={(recipients) => setForm({ ...form, recipients })}
                            members={members}
                            families={families}
                            events={events}
                            ministries={ministries}
                            customLists={customLists}
                            onLoadGroupMembers={onLoadGroupMembers}
                            onSearchMembers={onSearchMembers}
                            channels={form.channels}
                            disabled={isLoading}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Assistant Panel */}
            {aiEnabled && (
              <AIAssistantPanel
                subject={form.subject}
                content={form.contentHtml || form.contentText}
                channel={form.channels.length === 1 ? form.channels[0] : "both"}
                onSubjectChange={(subject) => setForm({ ...form, subject })}
                onContentChange={(content) => setForm({ ...form, contentHtml: content })}
                enabled={aiEnabled}
              />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
