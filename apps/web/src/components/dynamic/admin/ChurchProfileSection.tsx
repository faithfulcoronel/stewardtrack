'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  Church,
  Pencil,
  Check,
  X,
  Upload,
  Trash2,
  Loader2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ChurchProfileData {
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  coverUrl?: string;
  currency?: string;
  timezone?: string;
}

export interface ChurchProfileSectionProps {
  /** Current profile data */
  data: ChurchProfileData;
  /** Title for the section */
  title?: string;
  /** Description text */
  description?: string;
  /** Callback when profile is updated */
  onUpdate?: (field: string, value: string) => Promise<void>;
  /** Callback when logo is uploaded */
  onLogoUpload?: (file: File) => Promise<string>;
  /** Callback when logo is removed */
  onLogoRemove?: () => Promise<void>;
}

// ============================================================================
// Editable Field Component
// ============================================================================

interface EditableFieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  fieldKey: string;
  icon?: React.ReactNode;
  inputType?: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  onSave: (value: string) => Promise<void>;
  emptyText?: string;
}

function EditableField({
  label,
  value,
  placeholder,
  fieldKey,
  icon,
  inputType = 'text',
  onSave,
  emptyText = 'Not set',
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleEdit = useCallback(() => {
    setEditValue(value || '');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [value]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value || '');
  }, [value]);

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      toast.success(`${label} updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${label.toLowerCase()}`);
      console.error(`Error updating ${fieldKey}:`, error);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave, label, fieldKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputType !== 'textarea') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel, inputType]
  );

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  {inputType === 'textarea' ? (
                    <Textarea
                      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      className="flex-1 min-h-[80px]"
                      disabled={isSaving}
                    />
                  ) : (
                    <Input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type={inputType}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      className="flex-1"
                      disabled={isSaving}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn('text-sm', value ? 'text-foreground' : 'text-muted-foreground italic')}
              >
                {value || emptyText}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit} className="flex-shrink-0">
            <Pencil className="h-3 w-3 mr-1.5" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Logo Upload Component
// ============================================================================

interface LogoUploadProps {
  logoUrl?: string;
  churchName: string;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => Promise<void>;
}

function LogoUpload({ logoUrl, churchName, onUpload, onRemove }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      setIsUploading(true);
      try {
        await onUpload(file);
        toast.success('Logo uploaded successfully');
      } catch (error) {
        toast.error('Failed to upload logo');
        console.error('Logo upload error:', error);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onUpload]
  );

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    try {
      await onRemove();
      toast.success('Logo removed successfully');
      setShowRemoveDialog(false);
    } catch (error) {
      toast.error('Failed to remove logo');
      console.error('Logo remove error:', error);
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove]);

  // Validate logo URL before rendering
  const validLogoUrl = logoUrl && logoUrl.startsWith('https://') ? logoUrl : null;

  return (
    <>
      <div className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Church className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Church Logo</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Logo Preview */}
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
            {validLogoUrl ? (
              <Image
                src={validLogoUrl}
                alt={`${churchName} logo`}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <Church className="h-8 w-8 text-muted-foreground/50" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {validLogoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
                disabled={isUploading || isRemoving}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                Remove photo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isRemoving}
            >
              <Upload className="h-3 w-3 mr-1.5" />
              {validLogoUrl ? 'Change photo' : 'Upload photo'}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove church logo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your church logo. You can upload a new one at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChurchProfileSection({
  data,
  title = 'Church Profile',
  description = 'Manage your church information and branding',
  onUpdate,
  onLogoUpload,
  onLogoRemove,
}: ChurchProfileSectionProps) {
  const handleFieldUpdate = useCallback(
    async (field: string, value: string) => {
      if (onUpdate) {
        await onUpdate(field, value);
      }
    },
    [onUpdate]
  );

  const handleLogoUpload = useCallback(
    async (file: File) => {
      if (onLogoUpload) {
        return await onLogoUpload(file);
      }
      throw new Error('Logo upload not configured');
    },
    [onLogoUpload]
  );

  const handleLogoRemove = useCallback(async () => {
    if (onLogoRemove) {
      await onLogoRemove();
    }
  }, [onLogoRemove]);

  return (
    <div className="space-y-2">
      {/* Header */}
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {/* Logo Section */}
      {(onLogoUpload || onLogoRemove) && (
        <>
          <LogoUpload
            logoUrl={data.logoUrl}
            churchName={data.name}
            onUpload={handleLogoUpload}
            onRemove={handleLogoRemove}
          />
          <Separator />
        </>
      )}

      {/* Name */}
      <EditableField
        label="Church Name"
        value={data.name}
        fieldKey="name"
        icon={<Building2 className="h-4 w-4" />}
        placeholder="Enter church name"
        onSave={(value) => handleFieldUpdate('name', value)}
      />
      <Separator />

      {/* Email */}
      <EditableField
        label="Email Address"
        value={data.email}
        fieldKey="email"
        icon={<Mail className="h-4 w-4" />}
        inputType="email"
        placeholder="Enter email address"
        onSave={(value) => handleFieldUpdate('email', value)}
        emptyText="No email set"
      />
      <Separator />

      {/* Phone */}
      <EditableField
        label="Contact Number"
        value={data.phone}
        fieldKey="phone"
        icon={<Phone className="h-4 w-4" />}
        inputType="tel"
        placeholder="Enter contact number"
        onSave={(value) => handleFieldUpdate('phone', value)}
        emptyText="No phone number set"
      />
      <Separator />

      {/* Address */}
      <EditableField
        label="Address"
        value={data.address}
        fieldKey="address"
        icon={<MapPin className="h-4 w-4" />}
        inputType="textarea"
        placeholder="Enter church address"
        onSave={(value) => handleFieldUpdate('address', value)}
        emptyText="No address set"
      />
      <Separator />

      {/* Website */}
      <EditableField
        label="Website"
        value={data.website}
        fieldKey="website"
        icon={<Globe className="h-4 w-4" />}
        inputType="url"
        placeholder="https://yourchurch.com"
        onSave={(value) => handleFieldUpdate('website', value)}
        emptyText="No website set"
      />
    </div>
  );
}

export default ChurchProfileSection;
