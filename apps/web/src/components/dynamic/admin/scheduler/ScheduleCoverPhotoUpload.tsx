'use client';

import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useFormValue, useFormValues } from '@/lib/metadata/context';

export interface ScheduleCoverPhotoUploadProps {
  scheduleId?: string;
  className?: string;
}

export function ScheduleCoverPhotoUpload({
  scheduleId,
  className,
}: ScheduleCoverPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Only show when registration is required
  const registrationRequired = useFormValue<boolean>('registrationRequired');

  // Get form context to store cover photo URL
  const formContext = useFormValues();

  // Get existing cover photo URL from form
  const existingCoverPhotoUrl = useFormValue<string>('coverPhotoUrl');

  // Initialize preview from existing value
  React.useEffect(() => {
    if (existingCoverPhotoUrl && !previewUrl) {
      setPreviewUrl(existingCoverPhotoUrl);
    }
  }, [existingCoverPhotoUrl, previewUrl]);

  const uploadFile = useCallback(async (file: File) => {
    if (!scheduleId) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/community/scheduler/schedules/${scheduleId}/cover-photo`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const result = await response.json();

      // Update form context with new URL
      if (formContext) {
        formContext.setValue('coverPhotoUrl', result.url);
      }

      setPendingFile(null);
      toast({
        title: 'Cover photo uploaded',
        description: 'Your event cover photo has been saved.',
      });
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload cover photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [scheduleId, formContext, toast]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file (JPEG, PNG, GIF, WebP)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Image must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Store file for upload on save
      setPendingFile(file);

      // If we have a schedule ID, upload immediately
      if (scheduleId) {
        await uploadFile(file);
      } else {
        // For new schedules, store file for later upload
        // The form will need to handle this when saving
        toast({
          title: 'Cover photo selected',
          description: 'The image will be uploaded when you save the schedule.',
        });
      }
    },
    [scheduleId, toast, uploadFile]
  );

  const handleRemove = useCallback(async () => {
    if (scheduleId && existingCoverPhotoUrl) {
      try {
        setIsUploading(true);
        const response = await fetch(
          `/api/community/scheduler/schedules/${scheduleId}/cover-photo`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error('Failed to remove cover photo');
        }

        // Update form context
        if (formContext) {
          formContext.setValue('coverPhotoUrl', null);
        }

        toast({
          title: 'Cover photo removed',
        });
      } catch (error) {
        console.error('Error removing cover photo:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove cover photo',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    }

    setPreviewUrl(null);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [scheduleId, existingCoverPhotoUrl, formContext, toast]);

  // Hide if registration is not required
  if (!registrationRequired) {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Event Cover Photo
        </CardTitle>
        <CardDescription>
          Add a cover photo for your event. This will be displayed on the registration page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {previewUrl ? (
          <div className="relative">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Cover photo preview"
                className="h-full w-full object-cover"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
            {pendingFile && !scheduleId && (
              <p className="text-sm text-muted-foreground mt-2">
                Image will be uploaded when you save the schedule.
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="w-10 h-10 mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium">Click to upload cover photo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, GIF, or WebP (max 5MB)
                </p>
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
