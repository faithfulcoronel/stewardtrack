import { BaseModel } from './base.model';

/**
 * BillingEvent Model
 *
 * Represents a billing/payment webhook event log for audit and retry purposes.
 */
export interface BillingEvent extends BaseModel {
  event_id: string;
  event_type: string;
  tenant_id: string | null;
  payment_id: string | null;
  xendit_event_id: string | null;
  payload: Record<string, any>;
  processed: boolean;
  processed_at: string | null;
  processing_error: string | null;
  retry_count: number;
}

/**
 * DTO for creating a billing event
 */
export interface CreateBillingEventDto {
  event_id: string;
  event_type: string;
  tenant_id?: string | null;
  payment_id?: string | null;
  xendit_event_id?: string | null;
  payload: Record<string, any>;
  processed?: boolean;
  processing_error?: string | null;
}

/**
 * DTO for updating a billing event
 */
export interface UpdateBillingEventDto {
  processed?: boolean;
  processed_at?: string | null;
  processing_error?: string | null;
  retry_count?: number;
}
