export interface ReligiousDenomination {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}
