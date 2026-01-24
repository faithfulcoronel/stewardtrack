"use client";

/**
 * ================================================================================
 * AI ASSISTANT PANEL COMPONENT
 * ================================================================================
 *
 * A comprehensive AI assistant panel for the Communication module that provides:
 * - Subject line suggestions with selection
 * - Tone-based content improvement
 * - Grammar and spelling fixes
 * - Content shortening for SMS
 * - Smart send time suggestions
 *
 * This component integrates with CommunicationAIService via the API.
 *
 * ================================================================================
 */

import * as React from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  Type,
  Wand2,
  SpellCheck,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

/** Tone types for content improvement */
type ToneType = "formal" | "friendly" | "casual" | "urgent";

/** AI assist types */
type AssistType = "improve" | "subject" | "personalize" | "grammar" | "shorten";

/** Props for the AI Assistant Panel */
export interface AIAssistantPanelProps {
  /** Current subject line */
  subject?: string;
  /** Current message content (HTML or text) */
  content?: string;
  /** Current channel selection */
  channel?: "email" | "sms" | "both";
  /** Callback when subject is updated */
  onSubjectChange?: (subject: string) => void;
  /** Callback when content is updated */
  onContentChange?: (content: string) => void;
  /** Whether AI features are enabled */
  enabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Whether to show as floating panel */
  floating?: boolean;
  /** Whether to start collapsed */
  defaultCollapsed?: boolean;
}

interface SubjectSuggestion {
  text: string;
  selected?: boolean;
}

interface AIAssistResult {
  result: string;
  suggestions?: string[];
  tokensUsed: number;
  changes?: string[];
}

export function AIAssistantPanel({
  subject = "",
  content = "",
  channel = "email",
  onSubjectChange,
  onContentChange,
  enabled = true,
  className,
  floating = false,
  defaultCollapsed = false,
}: AIAssistantPanelProps) {
  // State
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isLoading, setIsLoading] = React.useState<AssistType | null>(null);
  const [selectedTone, setSelectedTone] = React.useState<ToneType>("friendly");
  const [subjectSuggestions, setSubjectSuggestions] = React.useState<SubjectSuggestion[]>([]);
  const [lastChanges, setLastChanges] = React.useState<string[]>([]);
  const [creditsWarning, setCreditsWarning] = React.useState(false);
  const [sendTimeSuggestion, setSendTimeSuggestion] = React.useState<{
    time: string;
    reasoning: string;
  } | null>(null);

  // Reset warning when content changes
  React.useEffect(() => {
    setCreditsWarning(false);
  }, [content, subject]);

  // API call helper
  const callAIAssist = React.useCallback(
    async (
      type: AssistType,
      inputContent: string,
      context?: Record<string, unknown>
    ): Promise<AIAssistResult | null> => {
      try {
        const response = await fetch("/api/admin/communication/ai/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            content: inputContent,
            context: {
              channel,
              tone: selectedTone,
              ...context,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 402) {
            setCreditsWarning(true);
            toast.error("Insufficient AI credits");
            return null;
          }
          throw new Error(data.error || "AI assist failed");
        }

        return data as AIAssistResult;
      } catch (error) {
        console.error("AI assist error:", error);
        toast.error(error instanceof Error ? error.message : "AI assist failed");
        return null;
      }
    },
    [channel, selectedTone]
  );

  // Handle subject line suggestions
  const handleSuggestSubjects = React.useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    setIsLoading("subject");
    const result = await callAIAssist("subject", content);
    setIsLoading(null);

    if (result?.suggestions) {
      setSubjectSuggestions(result.suggestions.map((text) => ({ text })));
      toast.success(`Generated ${result.suggestions.length} subject line suggestions`);
    }
  }, [content, callAIAssist]);

  // Handle selecting a subject suggestion
  const handleSelectSubject = React.useCallback(
    (suggestion: SubjectSuggestion) => {
      onSubjectChange?.(suggestion.text);
      setSubjectSuggestions((prev) =>
        prev.map((s) => ({ ...s, selected: s.text === suggestion.text }))
      );
      toast.success("Subject line applied");
    },
    [onSubjectChange]
  );

  // Handle content improvement
  const handleImproveContent = React.useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    setIsLoading("improve");
    const result = await callAIAssist("improve", content, { tone: selectedTone });
    setIsLoading(null);

    if (result?.result) {
      onContentChange?.(result.result);
      setLastChanges(result.changes ?? []);
      toast.success("Content improved");
    }
  }, [content, selectedTone, callAIAssist, onContentChange]);

  // Handle grammar fix
  const handleFixGrammar = React.useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    setIsLoading("grammar");
    const result = await callAIAssist("grammar", content);
    setIsLoading(null);

    if (result?.result) {
      onContentChange?.(result.result);
      toast.success("Grammar and spelling fixed");
    }
  }, [content, callAIAssist, onContentChange]);

  // Handle content shortening
  const handleShortenContent = React.useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    const maxLength = channel === "sms" ? 160 : 500;
    setIsLoading("shorten");
    const result = await callAIAssist("shorten", content, { maxLength });
    setIsLoading(null);

    if (result?.result) {
      onContentChange?.(result.result);
      toast.success(`Content shortened to ${result.result.length} characters`);
    }
  }, [content, channel, callAIAssist, onContentChange]);

  // Handle personalization
  const handleAddPersonalization = React.useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    setIsLoading("personalize");
    const result = await callAIAssist("personalize", content);
    setIsLoading(null);

    if (result?.result) {
      onContentChange?.(result.result);
      toast.success("Personalization placeholders added");
    }
  }, [content, callAIAssist, onContentChange]);

  // Handle send time suggestion
  const handleSuggestSendTime = React.useCallback(async () => {
    try {
      const response = await fetch("/api/admin/communication/ai/send-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType: channel === "sms" ? "SMS" : "Email",
          audience: "general",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 402) {
          setCreditsWarning(true);
          toast.error("Insufficient AI credits");
          return;
        }
        throw new Error(data.error || "Failed to get suggestion");
      }

      const data = await response.json();
      setSendTimeSuggestion({
        time: data.suggestedTime,
        reasoning: data.reasoning,
      });
      toast.success("Send time suggestion ready");
    } catch (error) {
      console.error("Send time suggestion error:", error);
      // Silently fail - this is an optional feature
    }
  }, [channel]);

  if (!enabled) {
    return null;
  }

  const panelContent = (
    <>
      {/* Credits Warning */}
      {creditsWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Insufficient AI credits.{" "}
            <a href="/admin/ai-credits" className="underline font-medium">
              Add credits
            </a>{" "}
            to continue using AI features.
          </AlertDescription>
        </Alert>
      )}

      {/* Subject Line Suggestions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Subject Lines</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSuggestSubjects}
            disabled={isLoading !== null}
          >
            {isLoading === "subject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {subjectSuggestions.length > 0 && (
          <div className="space-y-2">
            {subjectSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelectSubject(suggestion)}
                className={cn(
                  "w-full text-left p-2 rounded-md text-sm border transition-colors",
                  suggestion.selected
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted border-transparent"
                )}
              >
                <div className="flex items-start gap-2">
                  {suggestion.selected && (
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  )}
                  <span className={cn(suggestion.selected && "text-primary")}>
                    {suggestion.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Separator className="my-4" />

      {/* Content Improvement */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Improve Content</span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedTone}
            onValueChange={(value: ToneType) => setSelectedTone(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleImproveContent}
          disabled={isLoading !== null}
        >
          {isLoading === "improve" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Improve with AI
        </Button>

        {lastChanges.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Changes made:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {lastChanges.slice(0, 3).map((change, index) => (
                <li key={index}>{change}</li>
              ))}
              {lastChanges.length > 3 && (
                <li>...and {lastChanges.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <Separator className="my-4" />

      {/* Quick Actions */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-muted-foreground">Quick Actions</span>

        <div className="grid gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleFixGrammar}
                  disabled={isLoading !== null}
                >
                  {isLoading === "grammar" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SpellCheck className="mr-2 h-4 w-4" />
                  )}
                  Fix Grammar & Spelling
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Correct grammar, spelling, and punctuation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleAddPersonalization}
                  disabled={isLoading !== null}
                >
                  {isLoading === "personalize" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Add Personalization
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add {"{{first_name}}"} and other placeholders</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {channel === "sms" || channel === "both" ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleShortenContent}
                    disabled={isLoading !== null}
                  >
                    {isLoading === "shorten" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Shorten for SMS
                    <Badge variant="secondary" className="ml-auto">
                      160 chars
                    </Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Condense message to fit SMS limits</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Send Time Suggestion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Optimal Send Time</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSuggestSendTime}
            disabled={isLoading !== null}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>

        {sendTimeSuggestion && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="font-medium text-sm">{sendTimeSuggestion.time}</p>
            <p className="text-xs text-muted-foreground">{sendTimeSuggestion.reasoning}</p>
          </div>
        )}
      </div>
    </>
  );

  // Floating panel variant
  if (floating) {
    return (
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <Card className={cn("fixed bottom-4 right-4 w-80 shadow-lg z-50", className)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Assistant
                </CardTitle>
                {isCollapsed ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">{panelContent}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  // Standard sidebar card variant
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Assistant
        </CardTitle>
        <CardDescription>Get help composing your message</CardDescription>
      </CardHeader>
      <CardContent>{panelContent}</CardContent>
    </Card>
  );
}
