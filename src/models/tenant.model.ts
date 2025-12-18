import { BaseModel } from '@/models/base.model';

export interface Tenant extends BaseModel {
  id: string;
  name: string;
  subdomain: string;
  address?: string | null;
  contact_number?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  status: string;
  subscription_tier: string;
  subscription_status: string;
  billing_cycle: 'monthly' | 'annual';
  subscription_end_date?: string | null;
  currency?: string | null;
  created_by: string;
}
