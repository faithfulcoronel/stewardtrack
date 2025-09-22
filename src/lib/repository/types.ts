export interface Entity {
  id: string;
  [key: string]: unknown;
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
