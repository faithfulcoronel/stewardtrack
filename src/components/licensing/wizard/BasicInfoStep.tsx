'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight } from 'lucide-react';
import type { WizardData } from '../FeaturePermissionWizard';

interface BasicInfoStepProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
}

const LICENSE_TIERS = [
  { value: 'essential', label: 'Essential', description: 'Basic features for small churches' },
  { value: 'professional', label: 'Professional', description: 'Advanced features for growing churches' },
  { value: 'enterprise', label: 'Enterprise', description: 'Full features for large organizations' },
  { value: 'premium', label: 'Premium', description: 'Premium features and support' },
];

const CATEGORIES = [
  { value: 'membership', label: 'Membership' },
  { value: 'finance', label: 'Finance' },
  { value: 'events', label: 'Events' },
  { value: 'communications', label: 'Communications' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'administration', label: 'Administration' },
  { value: 'other', label: 'Other' },
];

export function BasicInfoStep({ data, onUpdate, onNext }: BasicInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!data.name.trim()) {
      newErrors.name = 'Feature name is required';
    }

    if (!data.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!data.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Feature Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Feature Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Members Directory"
          value={data.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
        <p className="text-sm text-muted-foreground">
          A clear, descriptive name for this feature
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="e.g., Manage church member information, profiles, and relationships"
          value={data.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Explain what this feature does and its purpose
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.category}
          onValueChange={(value) => onUpdate({ category: value })}
        >
          <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Feature category for organization
        </p>
      </div>

      {/* License Tier */}
      <div className="space-y-2">
        <Label htmlFor="tier">
          License Tier <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.tier}
          onValueChange={(value: any) => onUpdate({ tier: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LICENSE_TIERS.map((tier) => (
              <SelectItem key={tier.value} value={tier.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{tier.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {tier.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Minimum license tier required for this feature
        </p>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleNext}>
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
