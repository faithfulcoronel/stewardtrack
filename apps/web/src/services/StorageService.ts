import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IStorageRepository } from '@/repositories/storage.repository';
import type { UploadResult } from '@/adapters/storage.adapter';
import type { IMediaService } from '@/services/MediaService';
import type { MediaCategory } from '@/adapters/media.adapter';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Video types for social media
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv', 'video/x-m4v'];
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB for videos (Facebook limit is 10GB but we cap at 1GB)

// Extended image types for editor (includes SVG and BMP)
const ALLOWED_EDITOR_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
];

// Map MIME types to file extensions (for clipboard paste which may not have file names)
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

export interface StorageService {
  uploadChurchImage(
    tenantId: string,
    file: File
  ): Promise<UploadResult>;
  deleteChurchImage(imageUrl: string): Promise<void>;
  uploadChurchLogo(
    tenantId: string,
    file: File
  ): Promise<UploadResult>;
  deleteChurchLogo(logoUrl: string): Promise<void>;
  uploadEditorImage(
    tenantId: string,
    file: File
  ): Promise<UploadResult>;
  deleteEditorImage(imageUrl: string): Promise<void>;
  uploadMemberPhoto(
    tenantId: string,
    memberId: string,
    file: File
  ): Promise<UploadResult>;
  deleteMemberPhoto(photoUrl: string): Promise<void>;
  uploadScheduleCover(
    tenantId: string,
    scheduleId: string,
    file: File
  ): Promise<UploadResult>;
  deleteScheduleCover(coverUrl: string): Promise<void>;
  uploadSocialMedia(
    tenantId: string,
    file: File,
    mediaType: 'image' | 'video'
  ): Promise<UploadResult>;
  deleteSocialMedia(mediaUrl: string): Promise<void>;
}

@injectable()
export class SupabaseStorageService implements StorageService {
  private readonly bucketName = 'profiles';

  constructor(
    @inject(TYPES.IStorageRepository)
    private storageRepo: IStorageRepository,
    @inject(TYPES.MediaService)
    private mediaService: IMediaService
  ) {}

  /**
   * Track an uploaded file in the tenant_media table
   */
  private async trackMedia(
    tenantId: string,
    result: UploadResult,
    category: MediaCategory,
    originalFilename: string,
    mimeType: string,
    fileSize: number
  ): Promise<void> {
    try {
      await this.mediaService.trackUpload({
        bucket_name: this.bucketName,
        file_path: result.path,
        public_url: result.publicUrl,
        original_filename: originalFilename,
        mime_type: mimeType,
        file_size_bytes: fileSize,
        category,
      }, tenantId);
    } catch (error) {
      // Log but don't fail the upload - tracking is best-effort
      console.error('Failed to track media upload:', error);
    }
  }

  async uploadChurchImage(
    tenantId: string,
    file: File
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `church-images/${tenantId}/${randomUUID()}.${fileExtension}`;

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Upload to storage
    const result = await this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );

    // Track in tenant_media table
    await this.trackMedia(tenantId, result, 'church_images', file.name, file.type, file.size);

    return result;
  }

  async deleteChurchImage(imageUrl: string): Promise<void> {
    // Extract path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/profiles/church-images/xxx/filename
    const urlPath = imageUrl.split(`/${this.bucketName}/`)[1];

    if (urlPath) {
      await this.storageRepo.delete(this.bucketName, [urlPath]);
    }
  }

  async uploadChurchLogo(
    tenantId: string,
    file: File
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    // Validate file size (logos should be smaller, 5MB max)
    const logoMaxSize = 5 * 1024 * 1024;
    if (file.size > logoMaxSize) {
      throw new Error(
        `File too large. Maximum size for logos: ${logoMaxSize / (1024 * 1024)}MB`
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `church-logos/${tenantId}/${randomUUID()}.${fileExtension}`;

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Upload to storage
    const result = await this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );

    // Track in tenant_media table
    await this.trackMedia(tenantId, result, 'church_logos', file.name, file.type, file.size);

    return result;
  }

  async deleteChurchLogo(logoUrl: string): Promise<void> {
    // Extract path from URL
    const urlPath = logoUrl.split(`/${this.bucketName}/`)[1];

    if (urlPath) {
      await this.storageRepo.delete(this.bucketName, [urlPath]);
    }
  }

  async uploadEditorImage(
    tenantId: string,
    file: File
  ): Promise<UploadResult> {
    // Validate file type (extended types for editor including SVG)
    if (!ALLOWED_EDITOR_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${ALLOWED_EDITOR_IMAGE_TYPES.join(', ')}`
      );
    }

    // Validate file size (5MB max for editor images)
    const editorMaxSize = 5 * 1024 * 1024;
    if (file.size > editorMaxSize) {
      throw new Error(
        `File too large. Maximum size for editor images: ${editorMaxSize / (1024 * 1024)}MB`
      );
    }

    // Get file extension - handle clipboard paste which may not have proper file names
    // Clipboard pastes often have names like "image.png" or just "blob"
    let fileExtension: string;

    // First try to get from MIME type (more reliable for clipboard paste)
    if (MIME_TO_EXTENSION[file.type]) {
      fileExtension = MIME_TO_EXTENSION[file.type];
    } else {
      // Fall back to file name extension
      const nameParts = file.name.split('.');
      fileExtension = nameParts.length > 1
        ? nameParts.pop()?.toLowerCase() || 'png'
        : 'png';
    }

    // Generate unique filename
    const filename = `editor-images/${tenantId}/${randomUUID()}.${fileExtension}`;

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Upload to storage
    const result = await this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );

    // Track in tenant_media table
    await this.trackMedia(tenantId, result, 'editor_images', file.name, file.type, file.size);

    return result;
  }

  async deleteEditorImage(imageUrl: string): Promise<void> {
    // Extract path from URL
    const urlPath = imageUrl.split(`/${this.bucketName}/`)[1];

    if (urlPath) {
      await this.storageRepo.delete(this.bucketName, [urlPath]);
    }
  }

  async uploadMemberPhoto(
    tenantId: string,
    memberId: string,
    file: File
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    // Validate file size (5MB max for member photos)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(
        `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `member-photos/${tenantId}/${memberId}/${randomUUID()}.${fileExtension}`;

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Upload to storage
    const result = await this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );

    // Track in tenant_media table
    await this.trackMedia(tenantId, result, 'member_photos', file.name, file.type, file.size);

    return result;
  }

  async deleteMemberPhoto(photoUrl: string): Promise<void> {
    // Extract path from URL
    const urlPath = photoUrl.split(`/${this.bucketName}/`)[1];

    if (urlPath) {
      await this.storageRepo.delete(this.bucketName, [urlPath]);
    }
  }

  // =========================================================================
  // Schedule Cover Photos (uses separate bucket)
  // =========================================================================

  private readonly scheduleCoverBucket = 'schedule-covers';

  async uploadScheduleCover(
    tenantId: string,
    scheduleId: string,
    file: File
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    // Validate file size (5MB max for schedule covers)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(
        `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${tenantId}/${scheduleId}/${randomUUID()}.${fileExtension}`;

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Upload to storage (schedule covers use a different bucket)
    const result = await this.storageRepo.upload(
      this.scheduleCoverBucket,
      filename,
      buffer,
      file.type
    );

    // Track in tenant_media table
    try {
      await this.mediaService.trackUpload({
        bucket_name: this.scheduleCoverBucket,
        file_path: result.path,
        public_url: result.publicUrl,
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        category: 'schedule_covers',
      }, tenantId);
    } catch (error) {
      // Log but don't fail the upload - tracking is best-effort
      console.error('Failed to track schedule cover upload:', error);
    }

    return result;
  }

  async deleteScheduleCover(coverUrl: string): Promise<void> {
    // Extract path from URL
    const urlPath = coverUrl.split(`/${this.scheduleCoverBucket}/`)[1];

    if (urlPath) {
      await this.storageRepo.delete(this.scheduleCoverBucket, [urlPath]);
    }
  }

  // =========================================================================
  // Social Media Uploads (for Facebook, etc.)
  // =========================================================================

  async uploadSocialMedia(
    tenantId: string,
    file: File,
    mediaType: 'image' | 'video'
  ): Promise<UploadResult> {
    if (mediaType === 'image') {
      // Validate image file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(
          `Invalid image type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
        );
      }

      // Validate image file size (4MB for Facebook images)
      const imageMaxSize = 4 * 1024 * 1024;
      if (file.size > imageMaxSize) {
        throw new Error(
          `Image too large. Maximum size: ${imageMaxSize / (1024 * 1024)}MB`
        );
      }
    } else {
      // Validate video file type
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        throw new Error(
          `Invalid video type. Allowed types: mp4, mov, avi, wmv, flv, m4v`
        );
      }

      // Validate video file size
      if (file.size > MAX_VIDEO_SIZE) {
        throw new Error(
          `Video too large. Maximum size: ${MAX_VIDEO_SIZE / (1024 * 1024 * 1024)}GB`
        );
      }
    }

    // Get file extension
    let fileExtension: string;
    if (MIME_TO_EXTENSION[file.type]) {
      fileExtension = MIME_TO_EXTENSION[file.type];
    } else {
      const nameParts = file.name.split('.');
      fileExtension = nameParts.length > 1
        ? nameParts.pop()?.toLowerCase() || (mediaType === 'image' ? 'jpg' : 'mp4')
        : (mediaType === 'image' ? 'jpg' : 'mp4');
    }

    // Generate unique filename
    const filename = `social-media/${tenantId}/${randomUUID()}.${fileExtension}`;

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Upload to storage
    const result = await this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );

    // Track in tenant_media table
    await this.trackMedia(tenantId, result, 'social_media', file.name, file.type, file.size);

    return result;
  }

  async deleteSocialMedia(mediaUrl: string): Promise<void> {
    // Extract path from URL
    const urlPath = mediaUrl.split(`/${this.bucketName}/`)[1];

    if (urlPath) {
      await this.storageRepo.delete(this.bucketName, [urlPath]);
    }
  }
}
