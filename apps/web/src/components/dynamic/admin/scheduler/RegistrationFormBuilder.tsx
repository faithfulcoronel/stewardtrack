'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import {
  Plus,
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
import { useFormValue } from '@/lib/metadata/context';

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
  const [fields, setFields] = useState<FormField[]>(value);

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

  // Sync changes to parent
  React.useEffect(() => {
    onChange?.(fields);
  }, [fields, onChange]);

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
