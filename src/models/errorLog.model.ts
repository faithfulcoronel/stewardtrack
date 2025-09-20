import { BaseModel } from './base.model';

export interface ErrorLog extends BaseModel {
  id: string;
  message: string;
  stack?: string | null;
  context?: Record<string, any> | null;
}
