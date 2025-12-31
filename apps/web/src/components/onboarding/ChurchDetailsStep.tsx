'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ChurchDetailsStepProps {
  data: Record<string, any>;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function ChurchDetailsStep({
  data,
  onNext,
  isSaving,
}: ChurchDetailsStepProps) {
  const [formData, setFormData] = useState({
    address: '',
    contact_number: '',
    email: '',
    website: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentTenantData();
  }, []);

  async function loadCurrentTenantData() {
    try {
      // Fetch current tenant data to pre-populate form
      const response = await fetch('/api/tenant/current');
      const result = await response.json();

      if (result.success && result.data) {
        setFormData({
          address: result.data.address || '',
          contact_number: result.data.contact_number || '',
          email: result.data.email || '',
          website: result.data.website || '',
          description: data.church_details_data?.description || '',
        });
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    // Email validation (optional but must be valid if provided)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Website validation (optional but must be valid if provided)
    if (formData.website) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = 'Please enter a valid website URL (e.g., https://example.com)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleContinue() {
    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }

    // Save data via API
    try {
      const response = await fetch('/api/tenant/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save church details');
      }

      // Pass data to onboarding wizard
      await onNext({ church_details_data: formData });
    } catch (error) {
      console.error('Error saving church details:', error);
      toast.error('Failed to save church details');
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Tell us about your church
          </h3>
          <p className="text-sm text-muted-foreground">
            Help us personalize your experience (all fields are optional)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Church Address</Label>
          <Textarea
            id="address"
            placeholder="123 Main Street, City, State, ZIP"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            disabled={isSaving}
            rows={3}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Contact Number */}
          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number</Label>
            <Input
              id="contact_number"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.contact_number}
              onChange={(e) => handleInputChange('contact_number', e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Church Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="info@church.org"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isSaving}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
          </div>
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://www.church.org"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            disabled={isSaving}
            className={errors.website ? 'border-destructive' : ''}
          />
          {errors.website && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.website}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">About Your Church</Label>
          <Textarea
            id="description"
            placeholder="Share a brief description of your church mission and values..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={isSaving}
            rows={4}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
