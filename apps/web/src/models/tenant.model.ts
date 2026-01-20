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
  subscription_offering_id?: string | null;
  billing_cycle: 'monthly' | 'annual';
  subscription_end_date?: string | null;
  currency?: string | null;
  payment_status?: string | null;
  last_payment_date?: string | null;
  next_billing_date?: string | null;
  payment_failed_count?: number;
  payment_failure_reason?: string | null;
  xendit_customer_id?: string | null;
  xendit_subscription_id?: string | null;
  xendit_payment_method_id?: string | null;
  // XenPlatform sub-account (for donation collection and payouts)
  xendit_sub_account_id?: string | null;
  xendit_sub_account_status?: 'pending' | 'active' | 'suspended' | null;
  created_by: string;
  // Church denomination
  denomination?: string | null;
  // Setup tracking fields
  setup_status?: 'pending' | 'in_progress' | 'completed' | 'failed' | null;
  setup_completed_at?: string | null;
  setup_error?: string | null;
  admin_member_created?: boolean;
  // Onboarding fields
  church_image_url?: string | null;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
}
