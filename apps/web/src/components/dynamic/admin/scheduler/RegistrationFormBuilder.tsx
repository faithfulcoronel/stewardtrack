'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import {
  Trash2,
  GripVertical,
  Settings2,
  Type,
  Mail,
  Phone,
  Hash,
  Calendar,
  List,
  ToggleLeft,
  FileText,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  Presentation,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { useFormValue, useFormValues } from '@/lib/metadata/context';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface RegistrationFormBuilderProps {
  value?: FormField[];
  onChange?: (fields: FormField[]) => void;
  className?: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'checkbox', label: 'Checkbox', icon: ToggleLeft },
  { value: 'textarea', label: 'Long Text', icon: FileText },
];

// Registration Form Templates - Frontend driven, users can customize after applying
interface RegistrationTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof BookOpen;
  fields: Omit<FormField, 'id'>[];
}

const REGISTRATION_TEMPLATES: RegistrationTemplate[] = [
  {
    id: 'seminar',
    name: 'Seminar',
    description: 'Fields for educational seminars and workshops',
    icon: BookOpen,
    fields: [
      {
        type: 'select',
        label: 'How did you hear about this seminar?',
        placeholder: 'Select an option',
        required: false,
        options: ['Social Media', 'Church Announcement', 'Friend/Family', 'Email Newsletter', 'Website', 'Other'],
        helpText: 'Help us know how to reach more people',
      },
      {
        type: 'select',
        label: 'Experience Level',
        placeholder: 'Select your level',
        required: true,
        options: ['Beginner', 'Intermediate', 'Advanced'],
        helpText: 'This helps us tailor the content',
      },
      {
        type: 'textarea',
        label: 'What do you hope to learn?',
        placeholder: 'Share your learning goals...',
        required: false,
        helpText: 'Let us know your expectations',
      },
      {
        type: 'checkbox',
        label: 'I would like to receive seminar materials via email',
        required: false,
      },
    ],
  },
  {
    id: 'conference',
    name: 'Conference',
    description: 'Fields for multi-day conferences and events',
    icon: Presentation,
    fields: [
      {
        type: 'select',
        label: 'Which days will you attend?',
        placeholder: 'Select attendance',
        required: true,
        options: ['All Days', 'Day 1 Only', 'Day 2 Only', 'Day 3 Only'],
      },
      {
        type: 'select',
        label: 'Meal Preference',
        placeholder: 'Select meal preference',
        required: true,
        options: ['Regular', 'Vegetarian', 'Vegan', 'Gluten-Free', 'No Meal Needed'],
        helpText: 'For catering purposes',
      },
      {
        type: 'text',
        label: 'Dietary Restrictions/Allergies',
        placeholder: 'e.g., Nut allergy, dairy-free',
        required: false,
        helpText: 'Please specify any food allergies',
      },
      {
        type: 'select',
        label: 'T-Shirt Size',
        placeholder: 'Select size',
        required: false,
        options: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
        helpText: 'For conference merchandise',
      },
      {
        type: 'checkbox',
        label: 'I need accommodation assistance',
        required: false,
        helpText: 'Check if you need help finding nearby accommodation',
      },
      {
        type: 'textarea',
        label: 'Special Requirements',
        placeholder: 'Accessibility needs, childcare, etc.',
        required: false,
      },
    ],
  },
  {
    id: 'fellowship',
    name: 'Fellowship',
    description: 'Fields for social gatherings and fellowship events',
    icon: Users,
    fields: [
      {
        type: 'number',
        label: 'Number of Family Members Attending',
        placeholder: 'Including yourself',
        required: true,
        helpText: 'Total number in your party',
      },
      {
        type: 'text',
        label: 'Names of Additional Guests',
        placeholder: 'e.g., John (spouse), Mary (child)',
        required: false,
        helpText: 'List names and relationship',
      },
      {
        type: 'select',
        label: 'Will you bring a dish to share?',
        placeholder: 'Select an option',
        required: false,
        options: ['Yes - Main Dish', 'Yes - Side Dish', 'Yes - Dessert', 'Yes - Drinks', 'No'],
        helpText: 'Potluck contribution (optional)',
      },
      {
        type: 'text',
        label: 'Dish Description',
        placeholder: 'What will you bring?',
        required: false,
        helpText: 'Brief description of your dish',
      },
      {
        type: 'checkbox',
        label: 'I can help with setup/cleanup',
        required: false,
      },
    ],
  },
];

const generateId = () => `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const getFieldIcon = (type: string) => {
  const fieldType = FIELD_TYPES.find((f) => f.value === type);
  const Icon = fieldType?.icon || Type;
  return <Icon className="w-4 h-4" />;
};

function FieldEditor({
  field,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [optionsText, setOptionsText] = useState(field.options?.join('\n') || '');

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options = text
      .split('\n')
      .map((o) => o.trim())
      .filter((o) => o);
    onUpdate({ ...field, options });
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMoveUp}
                disabled={isFirst}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMoveDown}
                disabled={isLast}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />

            <div className="flex items-center gap-2 flex-1">
              {getFieldIcon(field.type)}
              <span className="font-medium truncate">{field.label || 'Untitled Field'}</span>
              {field.required && (
                <span className="text-xs text-destructive">*Required</span>
              )}
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings2 className="w-4 h-4" />
              </Button>
            </CollapsibleTrigger>

            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(type) => onUpdate({ ...field, type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                  placeholder="Field label"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                  placeholder="Placeholder text"
                />
              </div>

              <div className="space-y-2">
                <Label>Help Text</Label>
                <Input
                  value={field.helpText || ''}
                  onChange={(e) => onUpdate({ ...field, helpText: e.target.value })}
                  placeholder="Optional help text"
                />
              </div>
            </div>

            {field.type === 'select' && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <Textarea
                  value={optionsText}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id={`required-${field.id}`}
                checked={field.required}
                onCheckedChange={(required) => onUpdate({ ...field, required })}
              />
              <Label htmlFor={`required-${field.id}`}>Required field</Label>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function RegistrationFormBuilder({
  value = [],
  onChange,
  className,
}: RegistrationFormBuilderProps) {
  // Get form context for reading/writing registration form schema
  const formContext = useFormValues();

  // Read initial value from form context or props
  const initialFields = formContext?.getValue<FormField[]>('registrationFormSchema') ?? value;
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Sync initial value from form context when it becomes available
  // (form context may be populated asynchronously after component mounts)
  React.useEffect(() => {
    if (hasInitialized) return;

    const contextValue = formContext?.getValue<FormField[]>('registrationFormSchema');
    if (contextValue && Array.isArray(contextValue) && contextValue.length > 0) {
      setFields(contextValue);
      setHasInitialized(true);
    }
  }, [formContext, hasInitialized]);

  // Only show when registration is required
  const registrationRequired = useFormValue<boolean>('registrationRequired');

  // All hooks must be called before any conditional returns
  const updateFields = useCallback(
    (newFields: FormField[]) => {
      setFields(newFields);
      onChange?.(newFields);
    },
    [onChange]
  );

  const handleAddField = useCallback((type: string) => {
    const fieldType = FIELD_TYPES.find((f) => f.value === type);
    const newField: FormField = {
      id: generateId(),
      type,
      label: fieldType?.label || 'New Field',
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields((prev) => [...prev, newField]);
  }, []);

  const handleUpdateField = useCallback((index: number, updatedField: FormField) => {
    setFields((prev) => {
      const newFields = [...prev];
      newFields[index] = updatedField;
      return newFields;
    });
  }, []);

  const handleDeleteField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const newFields = [...prev];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      return newFields;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setFields((prev) => {
      if (index === prev.length - 1) return prev;
      const newFields = [...prev];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      return newFields;
    });
  }, []);

  // Apply template - adds template fields to existing fields (or replaces if empty)
  const handleApplyTemplate = useCallback((template: RegistrationTemplate) => {
    const newFields: FormField[] = template.fields.map((field) => ({
      ...field,
      id: generateId(),
    }));

    setFields((prev) => {
      // If no existing fields, just use the template
      if (prev.length === 0) {
        return newFields;
      }
      // Otherwise append template fields to existing
      return [...prev, ...newFields];
    });
  }, []);

  // Sync changes to parent and form context
  React.useEffect(() => {
    onChange?.(fields);
    // Write back to form context so it's included in form submission
    formContext?.setValue('registrationFormSchema', fields);
  }, [fields, onChange, formContext]);

  // Hide the entire component if registration is not required
  if (!registrationRequired) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle>Registration Form Fields</CardTitle>
          <CardDescription>
            Configure custom fields for the registration form. These fields will be shown to
            registrants in addition to basic contact information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Quick Start Templates</p>
              <Badge variant="secondary" className="text-xs">Click to apply</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {REGISTRATION_TEMPLATES.map((template) => {
                const TemplateIcon = template.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="group relative flex flex-col items-start p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                        <TemplateIcon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{template.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    <span className="text-xs text-muted-foreground mt-2">
                      {template.fields.length} fields
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Templates add preconfigured fields. You can customize or remove them after applying.
            </p>
          </div>

          <div className="border-t pt-4" />

          {/* Field List */}
          {fields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No custom fields added</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add fields below to customize the registration form
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  onUpdate={(f) => handleUpdateField(index, f)}
                  onDelete={() => handleDeleteField(index)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  isFirst={index === 0}
                  isLast={index === fields.length - 1}
                />
              ))}
            </div>
          )}

          {/* Add Field Buttons */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Add Field</p>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddField(type.value)}
                >
                  <type.icon className="w-4 h-4 mr-2" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Form Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea placeholder={field.placeholder} disabled />
                  ) : field.type === 'select' ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2">
                      <Switch disabled />
                      <span className="text-sm text-muted-foreground">{field.placeholder}</span>
                    </div>
                  ) : (
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled
                    />
                  )}
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
