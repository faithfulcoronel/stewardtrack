import type { BaseModel } from '@/models/base.model';
import type { QueryOptions } from './query';

export interface ReadableAdapter<T extends BaseModel> {
  fetch(options?: QueryOptions): Promise<{ data: T[]; count: number | null }>;
  fetchById(
    id: string,
    options?: Omit<QueryOptions, 'pagination'>
  ): Promise<T | null>;
  fetchAll(options?: Omit<QueryOptions, 'pagination'>): Promise<{
    data: T[];
    count: number | null;
  }>;
}

export interface WritableAdapter<T extends BaseModel> {
  create(
    data: Partial<T>,
    relations?: Record<string, string[]>,
    fieldsToRemove?: string[]
  ): Promise<T>;
  update(
    id: string,
    data: Partial<T>,
    relations?: Record<string, string[]>,
    fieldsToRemove?: string[]
  ): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface RelationalAdapter<T extends BaseModel>
  extends ReadableAdapter<T>,
    WritableAdapter<T> {}

export interface IBaseAdapter<T extends BaseModel>
  extends RelationalAdapter<T> {}
