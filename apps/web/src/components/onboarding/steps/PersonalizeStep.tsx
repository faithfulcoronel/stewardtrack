'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ImageIcon,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Camera,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface PersonalizeStepProps {
  onComplete: () => void;
  tenantName?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function PersonalizeStep({ onComplete, tenantName }: PersonalizeStepProps) {
  // Hero image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploadedUrl, setLogoUploadedUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load existing logo on mount
  useEffect(() => {
    async function loadExistingLogo() {
      try {
        const response = await fetch('/api/onboarding/upload-logo');
        const data = await response.json();
        if (data.success && data.url) {
          setLogoUploadedUrl(data.url);
        }
      } catch (error) {
        console.error('Error loading existing logo:', error);
      }
    }
    loadExistingLogo();
  }, []);

  // ============================================================================
  // File Handlers
  // ============================================================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadedUrl(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/onboarding/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedUrl(data.url);
      toast.success('Image uploaded successfully!');
      onComplete();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (uploadedUrl) {
      try {
        await fetch('/api/onboarding/upload-image', {
          method: 'DELETE',
        });
        toast.success('Image removed');
      } catch (error) {
        console.error('Error removing image:', error);
      }
    }

    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ============================================================================
  // Logo File Handlers
  // ============================================================================

  const handleLogoDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  }, []);

  const handleLogoDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
  }, []);

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleLogoFileSelect(file);
    }
  }, []);

  const handleLogoFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoFileSelect(file);
    }
  };

  const handleLogoFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreviewUrl(url);
    setLogoUploadedUrl(null);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', logoFile);

      const response = await fetch('/api/onboarding/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setLogoUploadedUrl(data.url);
      setLogoPreviewUrl(null);
      setLogoFile(null);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    if (logoUploadedUrl) {
      try {
        await fetch('/api/onboarding/upload-logo', {
          method: 'DELETE',
        });
        setLogoUploadedUrl(null);
        toast.success('Logo removed');
      } catch (error) {
        console.error('Error removing logo:', error);
        toast.error('Failed to remove logo');
      }
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(null);
    setLogoPreviewUrl(null);

    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const triggerLogoInput = () => {
    logoInputRef.current?.click();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-8">
      {/* Church Logo Section */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Church Logo</h3>
            <p className="text-muted-foreground text-sm">
              Upload your church logo. It will appear in the navigation bar and emails.
            </p>
          </div>
        </div>

        {logoUploadedUrl || logoPreviewUrl ? (
          <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/30">
            <div className="relative w-20 h-20 rounded-lg border bg-white overflow-hidden flex-shrink-0">
              <Image
                src={logoPreviewUrl || logoUploadedUrl || ''}
                alt="Church logo preview"
                fill
                className="object-contain p-2"
                sizes="80px"
              />
            </div>
            <div className="flex-1 min-w-0">
              {logoFile && (
                <p className="text-sm text-muted-foreground truncate">
                  {logoFile.name} ({(logoFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
              {logoUploadedUrl && !logoPreviewUrl && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Logo uploaded
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {logoPreviewUrl && !logoUploadedUrl && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleLogoUpload}
                    disabled={isUploadingLogo}
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
                  disabled={isUploadingLogo}
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
              'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
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
              onChange={handleLogoFileInputChange}
              className="hidden"
            />
            <div className="space-y-2">
              <div className={cn(
                'mx-auto w-14 h-14 rounded-full flex items-center justify-center transition-colors',
                isDraggingLogo ? 'bg-primary/20' : 'bg-muted'
              )}>
                <Building2 className={cn(
                  'h-7 w-7 transition-colors',
                  isDraggingLogo ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {isDraggingLogo ? 'Drop your logo here' : 'Click or drag to upload logo'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WebP or GIF (max 5MB)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Dashboard Hero Image Section */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <ImageIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Dashboard Hero Image</h3>
            <p className="text-muted-foreground text-sm">
              Upload a photo of your church building. This will be displayed as the
              background on your dashboard.
            </p>
          </div>
        </div>

      {/* Image Preview / Upload Zone */}
      {previewUrl || uploadedUrl ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Preview */}
            <div className="relative aspect-[16/9] bg-muted">
              <Image
                src={uploadedUrl || previewUrl || ''}
                alt="Church preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />

              {/* Overlay with Hero Preview */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium opacity-80">
                      Dashboard Preview
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">
                    Welcome to {tenantName || 'Your Church'}
                  </h2>
                  <p className="text-sm opacity-80 mt-1">
                    Your church management dashboard
                  </p>
                </motion.div>
              </div>

              {/* Status Badge */}
              {uploadedUrl && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1 bg-green-500 text-white text-sm px-3 py-1 rounded-full">
                    <CheckCircle className="h-4 w-4" />
                    Uploaded
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 flex items-center justify-between border-t">
              <div className="text-sm text-muted-foreground">
                {selectedFile?.name}
                {selectedFile && (
                  <span className="ml-2">
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                {!uploadedUrl && (
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Upload Zone
        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="space-y-4">
            <div className={cn(
              'mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-colors',
              isDragging ? 'bg-primary/20' : 'bg-muted'
            )}>
              <Camera className={cn(
                'h-10 w-10 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <div>
              <p className="font-medium">
                {isDragging ? 'Drop your image here' : 'Click or drag to upload'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                JPEG, PNG, WebP, or GIF • Max 10MB
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: 1920×1080 for best results
              </p>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips:</strong>
          <ul className="list-disc list-inside mt-1 text-sm">
            <li><strong>Logo:</strong> Use a square or horizontal logo (PNG with transparent background works best)</li>
            <li><strong>Dashboard image:</strong> Use a high-quality landscape photo (16:9 ratio, 1920×1080)</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Completion Note */}
      <p className="text-center text-sm text-muted-foreground">
        Both uploads are optional. You can add or change them later from your settings.
      </p>
    </div>
  );
}
