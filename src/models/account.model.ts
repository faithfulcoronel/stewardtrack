import { BaseModel } from './base.model';
import { Member } from './member.model';

export type AccountType = 'organization' | 'person';

export interface Account extends BaseModel {
  id: string;
  name: string;
  account_type: AccountType;
  account_number: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  tax_id: string | null;
  is_active: boolean;
  notes: string | null;
  member_id: string | null;
  member?: Member;
}