'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  X,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  Sparkles,
  Play,
  FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// Facebook limits
const FACEBOOK_LIMITS = {
  MAX_IMAGE_SIZE: 4 * 1024 * 1024, // 4MB
  MAX_VIDEO_SIZE: 1024 * 1024 * 1024, // 1GB
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'm4v'],
};

type MediaType = 'image' | 'video' | 'none';

interface SocialMediaUploaderProps {
  mediaType: MediaType;
  mediaUrl: string;
  onMediaTypeChange: (type: MediaType) => void;
  onMediaUrlChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  filename?: string;
  error?: string;
}

export function SocialMediaUploader({
  mediaType,
  mediaUrl,
  onMediaTypeChange,
  onMediaUrlChange,
  disabled = false,
  className,
}: SocialMediaUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(mediaUrl || null);
  const [showContent, setShowContent] = useState(mediaType !== 'none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animate content visibility
  useEffect(() => {
    if (mediaType !== 'none') {
      setShowContent(true);
    } else {
      const timer = setTimeout(() => setShowContent(false), 300);
      return () => clearTimeout(timer);
    }
  }, [mediaType]);

  // Sync preview URL with prop
  useEffect(() => {
    if (mediaUrl && mediaUrl !== previewUrl) {
      setPreviewUrl(mediaUrl);
    }
  }, [mediaUrl]);

  const acceptedTypes = mediaType === 'image'
    ? 'image/jpeg,image/png,image/gif,image/webp'
    : 'video/mp4,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/x-flv,video/x-m4v';

  const maxSize = mediaType === 'image'
    ? FACEBOOK_LIMITS.MAX_IMAGE_SIZE
    : FACEBOOK_LIMITS.MAX_VIDEO_SIZE;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const validateFile = useCallback((file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const supportedFormats = mediaType === 'image'
      ? FACEBOOK_LIMITS.SUPPORTED_IMAGE_FORMATS
      : FACEBOOK_LIMITS.SUPPORTED_VIDEO_FORMATS;

    if (!supportedFormats.includes(extension)) {
      return `Unsupported format. Use: ${supportedFormats.join(', ')}`;
    }

    if (file.size > maxSize) {
      return `File too large. Max: ${formatFileSize(maxSize)}`;
    }

    return null;
  }, [mediaType, maxSize]);

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState({ status: 'error', progress: 0, error: validationError });
      toast.error(validationError);
      return;
    }

    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    setUploadState({ status: 'uploading', progress: 0, filename: file.name });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', mediaType);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 15, 90),
        }));
      }, 200);

      const response = await fetch('/api/communication/media/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      setUploadState({ status: 'success', progress: 100, filename: file.name });
      onMediaUrlChange(result.url);
      toast.success('Media uploaded successfully!');

      URL.revokeObjectURL(localPreview);
      setPreviewUrl(result.url);

      // Reset to idle after success animation
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, status: 'idle' }));
      }, 2000);
    } catch (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    }
  }, [mediaType, validateFile, onMediaUrlChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && mediaType !== 'none') {
      setIsDragging(true);
    }
  }, [disabled, mediaType]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || mediaType === 'none') return;

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }, [disabled, mediaType, uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    e.target.value = '';
  }, [uploadFile]);

  const handleRemoveMedia = useCallback(() => {
    setPreviewUrl(null);
    setUploadState({ status: 'idle', progress: 0 });
    onMediaUrlChange('');
  }, [onMediaUrlChange]);

  const handleMediaTypeSelect = useCallback((type: MediaType) => {
    if (type === mediaType) {
      onMediaTypeChange('none');
      handleRemoveMedia();
    } else {
      onMediaTypeChange(type);
      if (mediaUrl) {
        handleRemoveMedia();
      }
    }
  }, [mediaType, mediaUrl, onMediaTypeChange, handleRemoveMedia]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Media Type Selector */}
      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileUp className="h-4 w-4 text-muted-foreground" />
          Attach Media
          <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* Image Button */}
          <button
            type="button"
            onClick={() => handleMediaTypeSelect('image')}
            disabled={disabled}
            className={cn(
              'relative flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl font-medium text-sm',
              'transition-all duration-300 ease-out',
              'border-2',
              'active:scale-[0.98]',
              mediaType === 'image'
                ? 'bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/5 border-violet-400/60 text-violet-700 dark:text-violet-300 shadow-lg shadow-violet-500/10'
                : 'border-border/60 text-muted-foreground hover:border-violet-400/40 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 hover:shadow-md',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className={cn(
              'p-2 rounded-xl transition-all duration-300',
              mediaType === 'image'
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg'
                : 'bg-muted/60 text-muted-foreground group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30'
            )}>
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">Image</span>
              <span className="text-[10px] opacity-60">JPG, PNG, GIF</span>
            </div>
            {mediaType === 'image' && (
              <Sparkles className="absolute top-2 right-2 h-4 w-4 text-violet-500 animate-pulse" />
            )}
          </button>

          {/* Video Button */}
          <button
            type="button"
            onClick={() => handleMediaTypeSelect('video')}
            disabled={disabled}
            className={cn(
              'relative flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl font-medium text-sm',
              'transition-all duration-300 ease-out',
              'border-2',
              'active:scale-[0.98]',
              mediaType === 'video'
                ? 'bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-orange-500/5 border-rose-400/60 text-rose-700 dark:text-rose-300 shadow-lg shadow-rose-500/10'
                : 'border-border/60 text-muted-foreground hover:border-rose-400/40 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 hover:shadow-md',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className={cn(
              'p-2 rounded-xl transition-all duration-300',
              mediaType === 'video'
                ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg'
                : 'bg-muted/60 text-muted-foreground'
            )}>
              <Video className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">Video</span>
              <span className="text-[10px] opacity-60">MP4, MOV</span>
            </div>
            {mediaType === 'video' && (
              <Sparkles className="absolute top-2 right-2 h-4 w-4 text-rose-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          showContent && mediaType !== 'none' ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'
        )}
      >
        {previewUrl ? (
          /* Media Preview */
          <div className="relative group rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 shadow-sm">
            {/* Preview Content */}
            <div className="relative aspect-video w-full flex items-center justify-center bg-black/5 dark:bg-white/5">
              {mediaType === 'image' ? (
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={previewUrl}
                    className="max-h-full max-w-full object-contain"
                    controls={false}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-16 h-16 rounded-full bg-white/95 dark:bg-black/90 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                      <Play className="h-7 w-7 text-rose-500 ml-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Progress Overlay */}
              {uploadState.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <CloudUpload className="h-12 w-12 text-white animate-bounce" />
                    <div className="absolute -inset-2 border-2 border-white/30 rounded-full animate-ping" />
                  </div>
                  <div className="w-56">
                    <Progress value={uploadState.progress} className="h-2 bg-white/20" />
                  </div>
                  <p className="text-white text-sm font-medium">
                    Uploading... {Math.round(uploadState.progress)}%
                  </p>
                </div>
              )}

              {/* Success Overlay */}
              {uploadState.status === 'success' && (
                <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                  <div className="bg-emerald-500 rounded-full p-4 shadow-xl animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={handleRemoveMedia}
              disabled={disabled || uploadState.status === 'uploading'}
              className={cn(
                'absolute top-3 right-3 p-2.5 rounded-xl',
                'bg-black/60 hover:bg-red-500 backdrop-blur-md',
                'text-white transition-all duration-200',
                'opacity-0 group-hover:opacity-100 focus:opacity-100',
                'hover:scale-110 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <X className="h-4 w-4" />
            </button>

            {/* File Info Footer */}
            {uploadState.filename && uploadState.status !== 'uploading' && (
              <div className="px-4 py-3 bg-gradient-to-r from-muted/80 to-muted/50 border-t border-border/30 backdrop-blur-sm">
                <p className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {uploadState.filename}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 ml-6">
                  Ready to post
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Drop Zone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={cn(
              'relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300',
              'bg-gradient-to-br from-muted/30 via-muted/20 to-muted/5',
              'hover:shadow-lg hover:border-primary/40',
              'group overflow-hidden',
              isDragging && 'border-primary bg-primary/10 scale-[1.01] shadow-xl shadow-primary/20',
              uploadState.status === 'error' && 'border-destructive/50 bg-destructive/5',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
              }} />
            </div>

            {/* Gradient Glow Effect */}
            <div className={cn(
              'absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none',
              'bg-gradient-to-r',
              mediaType === 'image'
                ? 'from-violet-500/10 via-purple-500/5 to-fuchsia-500/10'
                : 'from-rose-500/10 via-pink-500/5 to-orange-500/10',
              (isDragging || uploadState.status === 'idle') && 'group-hover:opacity-100'
            )} />

            {/* Content */}
            <div className="relative px-6 py-12 sm:py-14 flex flex-col items-center justify-center gap-5 text-center">
              {/* Icon Container */}
              <div
                className={cn(
                  'w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500',
                  'bg-gradient-to-br shadow-xl',
                  'group-hover:scale-110 group-hover:rotate-3',
                  isDragging && 'scale-110 -translate-y-2',
                  mediaType === 'image'
                    ? 'from-violet-500 via-purple-500 to-fuchsia-600 shadow-violet-500/30'
                    : 'from-rose-500 via-pink-500 to-orange-500 shadow-rose-500/30'
                )}
              >
                {mediaType === 'image' ? (
                  <ImageIcon className="h-10 w-10 text-white drop-shadow-lg" />
                ) : (
                  <Video className="h-10 w-10 text-white drop-shadow-lg" />
                )}
              </div>

              {/* Text */}
              <div className="space-y-2">
                <p className="text-lg font-bold text-foreground">
                  {isDragging ? 'Drop to upload' : `Upload ${mediaType}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or{' '}
                  <span className={cn(
                    'font-semibold underline underline-offset-4 decoration-2 decoration-dotted cursor-pointer',
                    'transition-colors',
                    mediaType === 'image'
                      ? 'text-violet-600 dark:text-violet-400 decoration-violet-400/50 hover:decoration-violet-500'
                      : 'text-rose-600 dark:text-rose-400 decoration-rose-400/50 hover:decoration-rose-500'
                  )}>
                    browse files
                  </span>
                </p>
              </div>

              {/* Format Info Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium',
                  'bg-muted/80 text-muted-foreground border border-border/50'
                )}>
                  {mediaType === 'image'
                    ? FACEBOOK_LIMITS.SUPPORTED_IMAGE_FORMATS.slice(0, 3).join(', ').toUpperCase()
                    : FACEBOOK_LIMITS.SUPPORTED_VIDEO_FORMATS.slice(0, 3).join(', ').toUpperCase()}
                </span>
                <span className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium',
                  'border border-border/50',
                  mediaType === 'image'
                    ? 'bg-violet-100/50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                    : 'bg-rose-100/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                )}>
                  Max {formatFileSize(maxSize)}
                </span>
              </div>

              {/* Error Message */}
              {uploadState.status === 'error' && uploadState.error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-xl animate-in slide-in-from-bottom-2 duration-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uploadState.error}</span>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileSelect}
              disabled={disabled}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}
