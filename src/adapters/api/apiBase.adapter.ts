import 'reflect-metadata';
import { injectable } from 'inversify';
import { apiClient } from '../../lib/apiClient';
import { BaseModel } from '../../models/base.model';
import { QueryOptions, BaseAdapter } from '../base.adapter';
import { camelToSnakeCaseObject } from '../../utils/String';

@injectable()
export abstract class ApiBaseAdapter<
  T extends BaseModel,
  // The API response/request types don't necessarily include an index signature,
  // so we only require that they are plain objects.
  TApi extends object = Record<string, unknown>,
  TRequest extends object = Record<string, unknown>
> extends BaseAdapter<T> {
  protected basePath = '';

  protected buildQueryString(options: QueryOptions = {}): string {
    const params = new URLSearchParams();
    if (options.pagination) {
      params.set('page', String(options.pagination.page));
      params.set('pageSize', String(options.pagination.pageSize));
    }
    if (options.order) {
      const dir = options.order.ascending === false ? 'desc' : 'asc';
      params.set('orderBy', `${options.order.column} ${dir}`);
    }
    if (options.filters) {
      params.set('filter', JSON.stringify(options.filters));
    }
    if (options.select) {
      params.set('select', options.select);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  // Lifecycle hooks
  protected async onBeforeCreate(data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  protected async onAfterCreate(data: T): Promise<void> {
    void data;
  }

  protected async onBeforeUpdate(id: string, data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  protected async onAfterUpdate(data: T): Promise<void> {
    void data;
  }

  protected async onBeforeDelete(id: string): Promise<void> {
    void id;
  }

  protected async onAfterDelete(id: string): Promise<void> {
    void id;
  }

  protected abstract mapFromApi(data: TApi): T;
  protected abstract mapToApi(data: Partial<T>): TRequest;

  public async fetch(options: QueryOptions = {}): Promise<{ data: T[]; count: number | null }> {
    if (options.enabled === false) {
      return { data: [], count: null };
    }
    const qs = this.buildQueryString(options);
    const response = await apiClient.get<TApi[]>(`${this.basePath}${qs}`);
    const items = Array.isArray(response) ? response.map(r => this.mapFromApi(r)) : [];
    return { data: items, count: items.length };
  }

  public async fetchById(id: string, options: Omit<QueryOptions, 'pagination'> = {}): Promise<T | null> {
    const qs = this.buildQueryString(options);
    const response = await apiClient.get<TApi>(`${this.basePath}/${id}${qs}`);
    if (!response) return null;
    return this.mapFromApi(response);
  }

  public async create(data: Partial<T>): Promise<T> {
    const processed = await this.onBeforeCreate(data);
    const result = await apiClient.post<{ id?: string } | string>(
      this.basePath,
      camelToSnakeCaseObject(this.mapToApi(processed))
    );
    const id = typeof result === 'string' ? result : result?.id;
    if (!id) {
      throw new Error('Failed to create');
    }
    const created = await this.fetchById(id);
    if (!created) {
      throw new Error('Failed to create');
    }
    await this.onAfterCreate(created);
    return created;
  }

  public async update(id: string, data: Partial<T>): Promise<T> {
    const processed = await this.onBeforeUpdate(id, data);
    await apiClient.put<void>(
      `${this.basePath}/${id}`,
      camelToSnakeCaseObject(this.mapToApi(processed))
    );
    const updated = await this.fetchById(id);
    if (!updated) {
      throw new Error('Failed to fetch updated');
    }
    await this.onAfterUpdate(updated);
    return updated;
  }

  public async delete(id: string): Promise<void> {
    await this.onBeforeDelete(id);
    await apiClient.delete(`${this.basePath}/${id}`);
    await this.onAfterDelete(id);
  }

  public async fetchAll(options: Omit<QueryOptions, 'pagination'> = {}): Promise<{ data: T[]; count: number | null }> {
    return this.fetch(options);
  }
}
