import { BaseModel } from '@/models/base.model';

export interface MemberGivingProfile extends BaseModel {
  id: string;
  member_id: string;
  recurring_amount?: number | null;
  recurring_frequency?: string | null;
  recurring_method?: string | null;
  recurring_status?: string | null;
  pledge_amount?: number | null;
  pledge_campaign?: string | null;
  pledge_start_date?: string | null;
  pledge_end_date?: string | null;
  ytd_amount?: number | null;
  ytd_year?: number | null;
  last_gift_amount?: number | null;
  last_gift_at?: string | null;
  last_gift_fund?: string | null;
  last_gift_source?: string | null;
  data_source?: string | null;
}
