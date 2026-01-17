import 'server-only';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export interface IStorageAdapter {
  upload(
    bucket: string,
    path: string,
    data: ArrayBuffer | Buffer,
    contentType: string
  ): Promise<UploadResult>;
  delete(bucket: string, paths: string[]): Promise<void>;
  getPublicUrl(bucket: string, path: string): string;
}

@injectable()
export class StorageAdapter implements IStorageAdapter {
  private supabase: SupabaseClient | null = null;

  /**
   * Get Supabase service role client for storage operations.
   * Storage operations require service role to bypass RLS policies on storage buckets.
   */
  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await getSupabaseServiceClient();
    }
    return this.supabase;
  }

  async upload(
    bucket: string,
    path: string,
    data: ArrayBuffer | Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const supabase = await this.getSupabaseClient();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, data, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    if (!uploadData) {
      throw new Error('Failed to upload file: missing response payload');
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    return {
      path: uploadData.path,
      publicUrl: urlData.publicUrl,
    };
  }

  async delete(bucket: string, paths: string[]): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      throw new Error(`Failed to delete file(s): ${error.message}`);
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    // This is a sync method that constructs the URL
    // Note: For async client, we'd need to handle this differently
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }
}
