export interface OnboardingProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  current_step: string;
  completed_steps: string[];
  is_completed: boolean;
  completed_at?: string | null;
  welcome_data: Record<string, any>;
  church_details_data: Record<string, any>;
  rbac_setup_data: Record<string, any>;
  feature_tour_data: Record<string, any>;
  payment_data: Record<string, any>;
  complete_data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string;
}

export interface CreateOnboardingProgressInput {
  tenant_id: string;
  user_id: string;
  current_step?: string;
  completed_steps?: string[];
  is_completed?: boolean;
  completed_at?: string;
  welcome_data?: Record<string, any>;
  church_details_data?: Record<string, any>;
  rbac_setup_data?: Record<string, any>;
  feature_tour_data?: Record<string, any>;
  payment_data?: Record<string, any>;
  complete_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateOnboardingProgressInput {
  current_step?: string;
  completed_steps?: string[];
  is_completed?: boolean;
  completed_at?: string;
  welcome_data?: Record<string, any>;
  church_details_data?: Record<string, any>;
  rbac_setup_data?: Record<string, any>;
  feature_tour_data?: Record<string, any>;
  payment_data?: Record<string, any>;
  complete_data?: Record<string, any>;
  metadata?: Record<string, any>;
}
