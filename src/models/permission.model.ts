import { BaseModel } from './base.model';

export interface Permission extends BaseModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
}
