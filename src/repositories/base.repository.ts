import { BaseAdapter } from '../adapters/base.adapter';
import { BaseModel } from '../models/base.model';
import { QueryOptions } from '../adapters/base.adapter';
import type { RequestContext } from '../lib/server/context';

export abstract class BaseRepository<T extends BaseModel> {
  constructor(
    protected adapter: BaseAdapter<T>,
    protected context: RequestContext = (adapter as any).context
  ) {}

  async find(options: QueryOptions = {}) {
    return this.adapter.fetch(options);
  }

  async findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.adapter.fetchById(id, options);
  }

  async findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.adapter.fetchAll(options);
  }

  async create(data: Partial<T>, relations?: Record<string, any[]>, fieldsToRemove: string[] = []) {
    // Pre-create hook for repository-level validation/transformation
    const processedData = await this.beforeCreate(data);
    
    // Create record using adapter
    const result = await this.adapter.create(processedData, relations, fieldsToRemove);
    
    // Post-create hook for repository-level operations
    await this.afterCreate(result);
    
    return result;
  }

  async update(id: string, data: Partial<T>, relations?: Record<string, any[]>, fieldsToRemove: string[] = []) {
    // Pre-update hook for repository-level validation/transformation
    const processedData = await this.beforeUpdate(id, data);
    
    // Update record using adapter
    const result = await this.adapter.update(id, processedData, relations, fieldsToRemove);
    
    // Post-update hook for repository-level operations
    await this.afterUpdate(result);
    
    return result;
  }

  async delete(id: string) {
    // Pre-delete hook for repository-level validation
    await this.beforeDelete(id);
    
    // Delete record using adapter
    await this.adapter.delete(id);
    
    // Post-delete hook for repository-level operations
    await this.afterDelete(id);
  }

  // Repository-level lifecycle hooks that can be overridden by child repositories
  protected async beforeCreate(data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  protected async afterCreate(data: T): Promise<void> {
    // Default implementation
  }

  protected async beforeUpdate(id: string, data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  protected async afterUpdate(data: T): Promise<void> {
    // Default implementation
  }

  protected async beforeDelete(id: string): Promise<void> {
    // Default implementation
  }

  protected async afterDelete(id: string): Promise<void> {
    // Default implementation
  }
}