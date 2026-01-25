'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Mail,
  MessageSquare,
  Bell,
  Webhook,
  Smartphone,
  Crown,
  FileText,
  EyeOff,
  Check,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CKEditorRichText } from '@/components/ui/ckeditor-rich-text';
import { CKEditorRichTextViewerInline } from '@/components/ui/ckeditor-rich-text-viewer';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AdminNotificationTemplatesProps {
  title?: string;
  description?: string;
}

interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

interface NotificationTemplate {
  id: string;
  tenant_id?: string;
  event_type: string;
  channel: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  name: string;
  subject?: string;
  title_template?: string;
  body_template: string;
  is_active: boolean;
  is_system: boolean;
  variables: TemplateVariable[];
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  event_type: string;
  channel: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  name: string;
  subject: string;
  title_template: string;
  body_template: string;
  is_active: boolean;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_app: Bell,
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  webhook: Webhook,
};

const CHANNEL_COLORS: Record<string, string> = {
  in_app: 'text-blue-600 bg-blue-500/10',
  email: 'text-emerald-600 bg-emerald-500/10',
  sms: 'text-purple-600 bg-purple-500/10',
  push: 'text-orange-600 bg-orange-500/10',
  webhook: 'text-amber-600 bg-amber-500/10',
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  webhook: 'Webhook',
};

function formatEventType(eventType: string): string {
  return eventType
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, ' '))
    .join(' › ');
}

const initialFormData: TemplateFormData = {
  event_type: '',
  channel: 'email',
  name: '',
  subject: '',
  title_template: '',
  body_template: '',
  is_active: true,
};

export function AdminNotificationTemplates({
  title = 'Notification Templates',
  description = 'Customize notification content for different channels and events',
}: AdminNotificationTemplatesProps) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [filterChannel, setFilterChannel] = useState<string>('all');

  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const result = await response.json();
      setTemplates(result.data || []);
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      event_type: template.event_type,
      channel: template.channel,
      name: template.name,
      subject: template.subject || '',
      title_template: template.title_template || '',
      body_template: template.body_template,
      is_active: template.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.event_type || !formData.name || !formData.body_template) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const url = editingTemplate
        ? `/api/notifications/templates/${editingTemplate.id}`
        : '/api/notifications/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      toast({
        title: editingTemplate ? 'Template Updated' : 'Template Created',
        description: `Template "${formData.name}" has been ${editingTemplate ? 'updated' : 'created'}`,
      });

      setDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (template: NotificationTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/notifications/templates/${templateToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      toast({
        title: 'Template Deleted',
        description: 'The template has been deleted',
      });

      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete template',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedTemplates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredTemplates = filterChannel === 'all'
    ? templates
    : templates.filter((t) => t.channel === filterChannel);

  // Group templates by event type
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.event_type]) {
      acc[template.event_type] = [];
    }
    acc[template.event_type].push(template);
    return acc;
  }, {} as Record<string, NotificationTemplate[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Crown className="h-3 w-3 mr-1" />
              Enterprise
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="in_app">In-App</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleOpenCreate} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No Templates</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Create custom templates to personalize your notification content.
            </p>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Template List - Grouped by Event Type */
        <div className="space-y-4">
          {Object.entries(groupedTemplates).map(([eventType, eventTemplates]) => (
            <Card key={eventType}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  {formatEventType(eventType)}
                  <Badge variant="secondary" className="text-xs">
                    {eventTemplates.length} template{eventTemplates.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {eventTemplates.map((template, idx) => {
                    const ChannelIcon = CHANNEL_ICONS[template.channel] || Bell;
                    const channelColor = CHANNEL_COLORS[template.channel] || 'text-gray-600 bg-gray-500/10';
                    const isExpanded = expandedTemplates.has(template.id);
                    // Use composite key to ensure uniqueness even if there are duplicate IDs
                    const uniqueKey = `${template.id}-${template.channel}-${idx}`;

                    return (
                      <div
                        key={uniqueKey}
                        className="border rounded-lg overflow-hidden"
                      >
                        {/* Template Header */}
                        <div
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleExpanded(template.id)}
                        >
                          <div className={`p-2 rounded-lg ${channelColor} shrink-0`}>
                            <ChannelIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{template.name}</span>
                              {template.is_system && (
                                <Badge variant="outline" className="text-xs">System</Badge>
                              )}
                              {!template.is_active && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {CHANNEL_LABELS[template.channel]}
                              {template.subject && ` • ${template.subject}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!template.is_system && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(template);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(template);
                                  }}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Template Content (Expanded) */}
                        {isExpanded && (
                          <div className="border-t bg-muted/30 p-3 space-y-3">
                            {template.title_template && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Title</Label>
                                <p className="text-sm font-mono bg-background rounded p-2 mt-1">
                                  {template.title_template}
                                </p>
                              </div>
                            )}
                            <div>
                              <Label className="text-xs text-muted-foreground">Body</Label>
                              {/* Render HTML for email/in_app, plain text for others */}
                              {template.channel === 'email' || template.channel === 'in_app' ? (
                                <CKEditorRichTextViewerInline
                                  content={template.body_template}
                                  className="text-sm bg-background rounded p-2 mt-1 max-w-none"
                                />
                              ) : (
                                <pre className="text-sm font-mono bg-background rounded p-2 mt-1 whitespace-pre-wrap overflow-x-auto">
                                  {template.body_template}
                                </pre>
                              )}
                            </div>
                            {template.variables && template.variables.length > 0 && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Variables</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {template.variables.map((v) => (
                                    <Badge key={v.name} variant="outline" className="text-xs font-mono">
                                      {`{{${v.name}}}`}
                                      {v.required && <span className="text-red-500">*</span>}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update the notification template content'
                : 'Create a new notification template for customized messaging'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type *</Label>
                <Input
                  id="event_type"
                  placeholder="e.g., member.created"
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  disabled={!!editingTemplate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value as TemplateFormData['channel'] })}
                  disabled={!!editingTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome Email"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {formData.channel === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject line"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
            )}

            {(formData.channel === 'in_app' || formData.channel === 'push') && (
              <div className="space-y-2">
                <Label htmlFor="title_template">Title</Label>
                <Input
                  id="title_template"
                  placeholder="Notification title"
                  value={formData.title_template}
                  onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="body_template">Body Template *</Label>
              {/* Use CKEditorRichText for email and in_app channels, plain textarea for SMS/push/webhook */}
              {formData.channel === 'email' || formData.channel === 'in_app' ? (
                <CKEditorRichText
                  value={formData.body_template}
                  onChange={(value) => setFormData({ ...formData, body_template: value })}
                  placeholder="Write your notification content here. Use {{variable}} for dynamic values."
                  minHeight="180px"
                />
              ) : (
                <Textarea
                  id="body_template"
                  placeholder="Use {{variable}} syntax for dynamic content"
                  value={formData.body_template}
                  onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Use {"{{variable}}"} syntax for dynamic content. E.g., {"{{member_name}}"}, {"{{church_name}}"}
                {(formData.channel === 'sms' || formData.channel === 'push') && (
                  <span className="block mt-1 text-amber-600">
                    Note: {formData.channel === 'sms' ? 'SMS' : 'Push'} notifications use plain text only.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template "{templateToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
