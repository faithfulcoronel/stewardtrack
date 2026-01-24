'use client';

/**
 * TemplateEditor Component
 *
 * Create and edit message templates with AI-powered generation.
 * Supports both email and SMS templates with variable insertion.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText,
  Mail,
  MessageSquare,
  Sparkles,
  Save,
  X,
  Plus,
  Loader2,
  ChevronDown,
  Eye,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { VariableInserter } from './VariableInserter';
import { MessageComposer } from './MessageComposer';

export type TemplateCategory =
  | 'welcome'
  | 'event'
  | 'newsletter'
  | 'prayer'
  | 'announcement'
  | 'follow-up'
  | 'birthday'
  | 'anniversary'
  | 'custom';

export type TemplateChannel = 'email' | 'sms';

export interface TemplateVariable {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}

export interface TemplateData {
  id?: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  channels: TemplateChannel[];
  subject?: string;
  contentHtml?: string;
  contentText?: string;
  variables: TemplateVariable[];
  isAiGenerated?: boolean;
  aiPrompt?: string;
}

export interface TemplateEditorProps {
  template?: Partial<TemplateData>;
  mode?: 'create' | 'edit' | 'ai-generate';
  onSave?: (data: TemplateData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string; description: string }[] = [
  { value: 'welcome', label: 'Welcome', description: 'New member welcome messages' },
  { value: 'event', label: 'Event', description: 'Event announcements and reminders' },
  { value: 'newsletter', label: 'Newsletter', description: 'Regular newsletters and updates' },
  { value: 'prayer', label: 'Prayer', description: 'Prayer requests and updates' },
  { value: 'announcement', label: 'Announcement', description: 'General announcements' },
  { value: 'follow-up', label: 'Follow-up', description: 'Follow-up messages' },
  { value: 'birthday', label: 'Birthday', description: 'Birthday greetings' },
  { value: 'anniversary', label: 'Anniversary', description: 'Anniversary greetings' },
  { value: 'custom', label: 'Custom', description: 'Custom template category' },
];

const DEFAULT_VARIABLES: TemplateVariable[] = [
  { name: 'first_name', label: 'First Name', required: false },
  { name: 'last_name', label: 'Last Name', required: false },
  { name: 'full_name', label: 'Full Name', required: false },
  { name: 'email', label: 'Email', required: false },
];

export function TemplateEditor({
  template,
  mode = 'create',
  onSave,
  onCancel,
  className,
}: TemplateEditorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);

  // Form state
  const [form, setForm] = useState<TemplateData>({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'custom',
    channels: template?.channels || ['email'],
    subject: template?.subject || '',
    contentHtml: template?.contentHtml || '',
    contentText: template?.contentText || '',
    variables: template?.variables || [...DEFAULT_VARIABLES],
    isAiGenerated: template?.isAiGenerated || mode === 'ai-generate',
    aiPrompt: template?.aiPrompt || '',
  });

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState(template?.aiPrompt || '');

  const handleChannelToggle = useCallback((channel: TemplateChannel) => {
    setForm((prev) => {
      const channels = prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel];
      // Ensure at least one channel is selected
      return { ...prev, channels: channels.length > 0 ? channels : [channel] };
    });
  }, []);

  const handleAddVariable = useCallback(() => {
    const name = `custom_var_${form.variables.length + 1}`;
    setForm((prev) => ({
      ...prev,
      variables: [
        ...prev.variables,
        { name, label: `Custom Variable ${prev.variables.length + 1}`, required: false },
      ],
    }));
  }, [form.variables.length]);

  const handleRemoveVariable = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  }, []);

  const handleUpdateVariable = useCallback(
    (index: number, updates: Partial<TemplateVariable>) => {
      setForm((prev) => ({
        ...prev,
        variables: prev.variables.map((v, i) => (i === index ? { ...v, ...updates } : v)),
      }));
    },
    []
  );

  const handleInsertVariable = useCallback((variable: string) => {
    // This will be handled by the MessageComposer
    const placeholder = `{{${variable}}}`;
    setForm((prev) => ({
      ...prev,
      contentHtml: (prev.contentHtml || '') + placeholder,
    }));
  }, []);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a description of the template you want to create.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/communication/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          category: form.category,
          channels: form.channels,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate template');
      }

      const data = await response.json();

      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        subject: data.subject || prev.subject,
        contentHtml: data.contentHtml || prev.contentHtml,
        contentText: data.contentText || prev.contentText,
        isAiGenerated: true,
        aiPrompt: aiPrompt,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Template name is required.');
      return;
    }

    if (form.channels.includes('email') && !form.subject?.trim()) {
      setError('Subject line is required for email templates.');
      return;
    }

    if (!form.contentHtml?.trim() && !form.contentText?.trim()) {
      setError('Template content is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (onSave) {
        await onSave(form);
      } else {
        // Default save behavior via API
        const response = await fetch('/api/admin/communication/templates', {
          method: template?.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            id: template?.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save template');
        }

        router.push('/admin/communication/templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/admin/communication/templates');
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === 'ai-generate'
              ? 'AI Template Generator'
              : template?.id
                ? 'Edit Template'
                : 'Create Template'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'ai-generate'
              ? 'Describe your template and let AI create it for you.'
              : 'Create a reusable message template for your campaigns.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* AI Generation Section */}
      {mode === 'ai-generate' && (
        <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 p-6 dark:from-purple-950 dark:to-blue-950">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Template Generator
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe the template you want and AI will generate it for you.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="ai-prompt">What kind of template do you need?</Label>
              <Textarea
                id="ai-prompt"
                placeholder="E.g., A warm welcome email for new members that introduces our church community and invites them to Sunday service..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleAiGenerate}
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Template
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="E.g., Welcome Email"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of when to use this template..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value as TemplateCategory })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Channels</Label>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant={form.channels.includes('email') ? 'default' : 'outline'}
                onClick={() => handleChannelToggle('email')}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button
                type="button"
                variant={form.channels.includes('sms') ? 'default' : 'outline'}
                onClick={() => handleChannelToggle('sms')}
                className="flex-1"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                SMS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Line (for email) */}
      {form.channels.includes('email') && (
        <div>
          <Label htmlFor="subject">Email Subject Line</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="subject"
              placeholder="E.g., Welcome to {{church_name}}!"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="flex-1"
            />
            <VariableInserter
              variables={form.variables}
              onInsert={(v) => setForm({ ...form, subject: (form.subject || '') + `{{${v}}}` })}
            />
          </div>
        </div>
      )}

      {/* Content Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Message Content</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={showPreview ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => setShowPreview(false)}
            >
              <Code className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button
              type="button"
              variant={showPreview ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Button>
          </div>
        </div>

        {showPreview ? (
          <div className="min-h-[300px] rounded-lg border bg-white p-4 dark:bg-gray-950">
            <div className="prose max-w-none dark:prose-invert">
              {form.channels.includes('email') ? (
                <div dangerouslySetInnerHTML={{ __html: form.contentHtml || '<p class="text-muted-foreground">No content yet</p>' }} />
              ) : (
                <p className="whitespace-pre-wrap">{form.contentText || 'No content yet'}</p>
              )}
            </div>
          </div>
        ) : (
          <MessageComposer
            initialValue={form.channels.includes('email') ? form.contentHtml : form.contentText}
            onChange={(value) =>
              form.channels.includes('email')
                ? setForm({ ...form, contentHtml: value })
                : setForm({ ...form, contentText: value })
            }
            channel={form.channels.includes('email') ? 'email' : 'sms'}
            variables={form.variables}
            placeholder={
              form.channels.includes('email')
                ? 'Write your email template content here...'
                : 'Write your SMS message here (keep it under 160 characters)...'
            }
          />
        )}
      </div>

      {/* Variables Section */}
      <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template Variables ({form.variables.length})
            </span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', variablesOpen && 'rotate-180')}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-4 rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            Variables are placeholders that get replaced with actual values when the message is sent.
            Use them as <code className="rounded bg-muted px-1">{'{{variable_name}}'}</code>.
          </p>
          <div className="space-y-3">
            {form.variables.map((variable, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center sm:gap-3 sm:p-0 sm:border-0 sm:bg-transparent"
              >
                <div className="sm:contents">
                  <Label className="text-xs text-muted-foreground sm:hidden">Variable Name</Label>
                  <Input
                    value={variable.name}
                    onChange={(e) => handleUpdateVariable(index, { name: e.target.value })}
                    placeholder="Variable name"
                  />
                </div>
                <div className="sm:contents">
                  <Label className="text-xs text-muted-foreground sm:hidden">Display Label</Label>
                  <Input
                    value={variable.label}
                    onChange={(e) => handleUpdateVariable(index, { label: e.target.value })}
                    placeholder="Display label"
                  />
                </div>
                <div className="sm:contents">
                  <Label className="text-xs text-muted-foreground sm:hidden">Default Value</Label>
                  <Input
                    value={variable.defaultValue || ''}
                    onChange={(e) => handleUpdateVariable(index, { defaultValue: e.target.value })}
                    placeholder="Default value"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveVariable(index)}
                  className="justify-self-end"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddVariable}>
            <Plus className="mr-2 h-4 w-4" />
            Add Variable
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default TemplateEditor;
