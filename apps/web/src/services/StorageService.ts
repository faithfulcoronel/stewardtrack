import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IStorageRepository } from '@/repositories/storage.repository';
import type { UploadResult } from '@/adapters/storage.adapter';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
}
