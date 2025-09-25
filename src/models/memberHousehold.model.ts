import { BaseModel } from '@/models/base.model';

export interface MemberHousehold extends BaseModel {
  name?: string | null;
  envelope_number?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  member_names?: string[] | null;
  notes?: string | null;
}
