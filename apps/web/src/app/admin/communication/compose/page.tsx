"use client";

/**
 * ================================================================================
 * COMPOSE MESSAGE PAGE
 * ================================================================================
 *
 * Create and edit communication campaigns with rich text editor and AI assistance.
 *
 * Uses the CampaignComposer component for the main UI.
 *
 * SECURITY: No permission check during testing phase.
 *
 * ================================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  CampaignComposer,
  type Recipient,
  type RecipientGroup,
  type MessageTemplate,
  type TemplateCategory,
} from "@/components/dynamic/admin/communication";

interface CampaignFormData {
  name: string;
  description: string;
  campaignType: "individual" | "bulk" | "scheduled" | "recurring";
  channels: ("email" | "sms" | "facebook")[];
  subject: string;
  contentHtml: string;
  contentText: string;
  // Facebook-specific fields
  facebookText: string;
  facebookMediaUrl: string;
  facebookMediaType: "image" | "video" | "none";
  facebookLinkUrl: string;
  templateId?: string;
  recipients: Recipient[];
  scheduledAt?: string;
}

export default function ComposePage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<CampaignFormData>>();

  // Data for selectors
  const [members, setMembers] = useState<Recipient[]>([]);
  const [families, setFamilies] = useState<RecipientGroup[]>([]);
  const [events, setEvents] = useState<RecipientGroup[]>([]);
  const [ministries, setMinistries] = useState<RecipientGroup[]>([]);
  const [customLists, setCustomLists] = useState<RecipientGroup[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Load campaign data if editing
        if (campaignId) {
          const response = await fetch(`/api/admin/communication/campaigns/${campaignId}`);
          if (response.ok) {
            const json = await response.json();
            // API returns { success: true, data: campaign }
            const campaign = json.data || json;
            setInitialData({
              name: campaign.name,
              description: campaign.description,
              campaignType: campaign.campaign_type,
              channels: campaign.channels,
              subject: campaign.subject,
              contentHtml: campaign.content_html,
              contentText: campaign.content_text,
              templateId: campaign.template_id,
              scheduledAt: campaign.scheduled_at,
            });
          }
        }

        // Load members (limited for initial view)
        const membersResponse = await fetch("/api/admin/communication/recipients/members?limit=50");
        if (membersResponse.ok) {
          const data = await membersResponse.json();
          setMembers(data.members || []);
        }

        // Load recipient groups
        const groupsResponse = await fetch("/api/admin/communication/recipients/groups");
        if (groupsResponse.ok) {
          const data = await groupsResponse.json();
          setFamilies(data.families || []);
          setEvents(data.events || []);
          setMinistries(data.ministries || []);
          setCustomLists(data.customLists || []);
        }

        // Load templates
        const templatesResponse = await fetch("/api/admin/communication/templates");
        if (templatesResponse.ok) {
          const data = await templatesResponse.json();
          // API returns { success: true, data: templates[] }
          const templateList = data.data || data.templates || [];
          setTemplates(
            templateList.map((t: Record<string, unknown>) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              category: t.category,
              channels: t.channels,
              subject: t.subject,
              contentHtml: t.content_html,
              contentText: t.content_text,
              isAiGenerated: t.is_ai_generated,
              usageCount: t.usage_count,
              createdAt: t.created_at,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [campaignId]);

  // Search members
  const handleSearchMembers = useCallback(async (query: string): Promise<Recipient[]> => {
    try {
      const response = await fetch(
        `/api/admin/communication/recipients/members/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.members || [];
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
    return [];
  }, []);

  // Load group members
  const handleLoadGroupMembers = useCallback(
    async (source: string, groupId: string): Promise<Recipient[]> => {
      try {
        const response = await fetch(
          `/api/admin/communication/recipients/${source}/${groupId}/members`
        );
        if (response.ok) {
          const data = await response.json();
          return data.members || [];
        }
      } catch (error) {
        console.error("Load group members failed:", error);
      }
      return [];
    },
    []
  );

  // Generate AI template
  const handleGenerateTemplate = useCallback(
    async (category: TemplateCategory): Promise<MessageTemplate> => {
      const response = await fetch("/api/admin/communication/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create a ${category} message template for a church communication.`,
          category,
          channels: ["email"],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate template");
      }

      const data = await response.json();
      // API returns { success: true, template: { subject, contentHtml, contentText } }
      return {
        id: `ai-${Date.now()}`,
        name: `AI Generated ${category} Template`,
        category,
        channels: ["email"],
        ...data.template,
        isAiGenerated: true,
      };
    },
    []
  );

  // Save campaign as draft
  const handleSaveDraft = useCallback(
    async (data: CampaignFormData): Promise<{ id: string }> => {
      const url = campaignId
        ? `/api/admin/communication/campaigns/${campaignId}`
        : "/api/admin/communication/campaigns";

      const response = await fetch(url, {
        method: campaignId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          campaign_type: data.campaignType,
          channels: data.channels,
          subject: data.subject,
          content_html: data.contentHtml,
          content_text: data.contentText,
          template_id: data.templateId,
          scheduled_at: data.scheduledAt,
          recipients: data.recipients,
          status: "draft",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save campaign");
      }

      const json = await response.json();
      // API returns { success: true, data: campaign, id: string }
      return { id: json.id || json.data?.id || campaignId || "" };
    },
    [campaignId]
  );

  // Send campaign
  const handleSend = useCallback(
    async (data: CampaignFormData): Promise<void> => {
      // First save the campaign
      const saved = await handleSaveDraft(data);

      // Then trigger send
      const response = await fetch(
        `/api/admin/communication/campaigns/${saved.id}/send`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send campaign");
      }
    },
    [handleSaveDraft]
  );

  // AI assist with image support
  const handleAiAssist = useCallback(
    async (type: string, content: string): Promise<string> => {
      // Enable image extraction for content that may contain images
      // This allows the AI to analyze embedded images (e.g., event posters)
      const extractImages = type !== 'personalize'; // Skip for personalization which doesn't need AI

      const response = await fetch("/api/admin/communication/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content,
          extractImages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI assist failed");
      }

      const data = await response.json();
      // API returns { success: true, result: string, suggestions?: string[] }
      return data.result;
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <CampaignComposer
      campaignId={campaignId ?? undefined}
      initialData={initialData}
      members={members}
      families={families}
      events={events}
      ministries={ministries}
      customLists={customLists}
      templates={templates}
      onSearchMembers={handleSearchMembers}
      onLoadGroupMembers={handleLoadGroupMembers}
      onGenerateTemplate={handleGenerateTemplate}
      onSaveDraft={handleSaveDraft}
      onSend={handleSend}
      onAiAssist={handleAiAssist}
      aiEnabled={true}
      backUrl="/admin/communication"
    />
  );
}
