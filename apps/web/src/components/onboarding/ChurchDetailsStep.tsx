'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Building2, AlertCircle, Upload, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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

  // Logo upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

        // Load existing logo URL
        if (result.data.logo_url) {
          setLogoUrl(result.data.logo_url);
        }
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Logo handling functions
  function handleLogoDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingLogo(true);
  }

  function handleLogoDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingLogo(false);
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleLogoFileSelect(file);
    }
  }

  function handleLogoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoFileSelect(file);
    }
  }

  function handleLogoFileSelect(file: File) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (5MB max for logos)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo size must be less than 5MB');
      return;
    }

    setSelectedLogoFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  async function handleLogoUpload() {
    if (!selectedLogoFile) return;

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedLogoFile);

      const response = await fetch('/api/onboarding/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setLogoUrl(data.url);
      setLogoPreview(null);
      setSelectedLogoFile(null);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    // If there's a preview (not yet uploaded), just clear it
    if (logoPreview && !logoUrl) {
      URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      setSelectedLogoFile(null);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
      return;
    }

    // If there's an uploaded logo, delete it
    if (logoUrl) {
      try {
        await fetch('/api/onboarding/upload-logo', {
          method: 'DELETE',
        });
        setLogoUrl(null);
        toast.success('Logo removed');
      } catch (error) {
        console.error('Error removing logo:', error);
        toast.error('Failed to remove logo');
      }
    }

    // Clean up preview if any
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    setSelectedLogoFile(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  }

  function triggerLogoInput() {
    logoInputRef.current?.click();
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

      {/* Church Logo Upload */}
      <div className="space-y-3">
        <Label>Church Logo</Label>
        <p className="text-sm text-muted-foreground">
          Upload your church logo. It will be displayed in the navigation and emails.
        </p>

        {logoUrl || logoPreview ? (
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
            {/* Logo Preview */}
            <div className="relative w-20 h-20 rounded-lg border bg-white overflow-hidden flex-shrink-0">
              <Image
                src={logoPreview || logoUrl || ''}
                alt="Church logo preview"
                fill
                className="object-contain p-2"
                sizes="80px"
              />
            </div>

            {/* Info and Actions */}
            <div className="flex-1 min-w-0">
              {selectedLogoFile && (
                <p className="text-sm text-muted-foreground truncate">
                  {selectedLogoFile.name} ({(selectedLogoFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
              {logoUrl && !logoPreview && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Logo uploaded
                </p>
              )}

              <div className="flex items-center gap-2 mt-2">
                {logoPreview && !logoUrl && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleLogoUpload}
                    disabled={isUploadingLogo || isSaving}
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </>
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoRemove}
                  disabled={isUploadingLogo || isSaving}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
              isDraggingLogo
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragOver={handleLogoDragOver}
            onDragLeave={handleLogoDragLeave}
            onDrop={handleLogoDrop}
            onClick={triggerLogoInput}
          >
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleLogoInputChange}
              className="hidden"
              disabled={isSaving}
            />
            <div className="space-y-2">
              <div className={cn(
                'mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                isDraggingLogo ? 'bg-primary/20' : 'bg-muted'
              )}>
                <ImageIcon className={cn(
                  'h-6 w-6 transition-colors',
                  isDraggingLogo ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDraggingLogo ? 'Drop your logo here' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WebP or GIF (max 5MB)
                </p>
              </div>
            </div>
          </div>
        )}
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
