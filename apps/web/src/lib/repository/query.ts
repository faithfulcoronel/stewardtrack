import type { FilterOperator } from './types';

export interface FilterCondition {
  operator: FilterOperator | string;
  value: unknown;
  valueTo?: unknown;
  field?: string;
}

export interface RelationshipQuery {
  table: string;
  foreignKey: string;
  alias?: string;
  select?: string[];
  nestedRelationships?: Array<string | RelationshipQuery>;
}

export interface QueryOptions {
  select?: string;
  filters?: Record<string, FilterCondition | FilterCondition[] | string>;
  order?: {
    column: string;
    ascending?: boolean;
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
  relationships?: RelationshipQuery[];
  enabled?: boolean;
}
