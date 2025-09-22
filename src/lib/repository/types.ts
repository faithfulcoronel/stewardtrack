import { PostgrestError } from "@supabase/supabase-js";

export interface Entity {
  id: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export type FilterOperator =
  | 'equals'
  | 'eq'
  | 'notEquals'
  | 'neq'
  | 'greaterThan'
  | 'gt'
  | 'greaterThanOrEqual'
  | 'gte'
  | 'lessThan'
  | 'lt'
  | 'lessThanOrEqual'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isAnyOf'
  | 'between';

export type Primitive = string | number | boolean | null;

export interface FilterValue {
  operator: FilterOperator;
  value: Primitive | Primitive[];
  valueTo?: Primitive; // For 'between' operator
}

export interface QueryOptions {
  select?: string;
  filters?: Record<string, FilterValue | FilterValue[]>;
  order?: {
    column: string;
    ascending?: boolean;
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
  relationships?: {
    table: string;
    foreignKey: string;
    select?: string[];
    nestedRelationships?: string[];
  }[];
  enabled?: boolean;
}

export interface QueryResult<T> {
  data: T[];
  count: number | null;
  error: RepositoryError | null;
}

export interface EntityConfig<T extends Entity> {
  tableName: string;
  defaultSelect?: string;
  defaultRelationships?: {
    table: string;
    foreignKey: string;
    select?: string[];
    nestedRelationships?: string[];
  }[];
  defaultOrder?: {
    column: string;
    ascending?: boolean;
  };
  onBeforeCreate?: (data: Partial<T>) => Promise<Partial<T>>;
  onAfterCreate?: (data: T) => Promise<void>;
  onBeforeUpdate?: (id: string, data: Partial<T>) => Promise<Partial<T>>;
  onAfterUpdate?: (data: T) => Promise<void>;
  onBeforeDelete?: (id: string) => Promise<void>;
  onAfterDelete?: (id: string) => Promise<void>;
  errorMessages?: {
    [key: string]: string;
  };
  foreignRelations?: {
    [key: string]: {
      table: string;
      foreignKey: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-many';
      joinTable?: string; // For many-to-many relationships
      joinForeignKey?: string; // For many-to-many relationships
    };
  };
}

export interface EntityStore<T extends Entity> {
  entities: Record<string, T>;
  addEntity: (entity: T) => void;
  updateEntity: (id: string, entity: Partial<T>) => void;
  removeEntity: (id: string) => void;
  getEntity: (id: string) => T | undefined;
  clear: () => void;
}

export interface RepositoryOptions {
  enableRealtime?: boolean;
  gcTime?: number;
  staleTime?: number;
  realtimeConfig?: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
  };
}

export interface RepositoryError extends PostgrestError {
  userMessage?: string;
}

export interface UpdateOptions<T> {
  id: string;
  data: Partial<T>;
  relations?: Record<string, string[] | null>; // Array of IDs or null to remove all
  /**
   * List of field names to strip from the update payload before sending to the API.
   */
  fieldsToRemove?: string[];
}