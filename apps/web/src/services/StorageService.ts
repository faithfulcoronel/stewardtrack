import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IStorageRepository } from '@/repositories/storage.repository';
import type { UploadResult } from '@/adapters/storage.adapter';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
}

@injectable()
export class SupabaseStorageService implements StorageService {
  private readonly bucketName = 'profiles';

  constructor(
    @inject(TYPES.IStorageRepository)
    private storageRepo: IStorageRepository
  ) {}

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
    return this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );
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
    return this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );
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
    return this.storageRepo.upload(
      this.bucketName,
      filename,
      buffer,
      file.type
    );
  }

  async deleteEditorImage(imageUrl: string): Promise<void> {
    // Extract path from URL
    const urlPath = imageUrl.split(`/${this.bucketName}/`)[1];

    if (urlPath) {
      await this.storageRepo.delete(this.bucketName, [urlPath]);
    }
  }
}
