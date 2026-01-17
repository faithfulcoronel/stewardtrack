import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IStorageAdapter, UploadResult } from '@/adapters/storage.adapter';

export interface IStorageRepository {
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
export class StorageRepository implements IStorageRepository {
  constructor(
    @inject(TYPES.IStorageAdapter)
    private storageAdapter: IStorageAdapter
  ) {}

  async upload(
    bucket: string,
    path: string,
    data: ArrayBuffer | Buffer,
    contentType: string
  ): Promise<UploadResult> {
    return this.storageAdapter.upload(bucket, path, data, contentType);
  }

  async delete(bucket: string, paths: string[]): Promise<void> {
    return this.storageAdapter.delete(bucket, paths);
  }

  getPublicUrl(bucket: string, path: string): string {
    return this.storageAdapter.getPublicUrl(bucket, path);
  }
}
