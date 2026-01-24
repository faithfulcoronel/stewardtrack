import { BaseModel } from '@/models/base.model';

/**
 * AI suggestion types
 */
export type AISuggestionType = 'subject' | 'content' | 'personalization' | 'audience' | 'schedule';

/**
 * Tone types for AI content generation
 */
export type ToneType = 'formal' | 'casual' | 'warm' | 'professional' | 'inspirational' | 'urgent';

/**
 * Communication AI suggestion model
 */
export interface AISuggestion extends BaseModel {
  id: string;
  tenant_id: string;
  campaign_id?: string | null;
  suggestion_type: AISuggestionType;
  original_input?: string | null;
  suggested_content: string;
  ai_model?: string | null;
  tokens_used?: number | null;
  accepted?: boolean | null;
  feedback?: string | null;
  created_by?: string | null;
  created_at?: string;
}

/**
 * DTO for creating an AI suggestion record
 */
export interface CreateAISuggestionDto {
  campaign_id?: string;
  suggestion_type: AISuggestionType;
  original_input?: string;
  suggested_content: string;
  ai_model?: string;
  tokens_used?: number;
}

/**
 * DTO for updating AI suggestion feedback
 */
export interface UpdateAISuggestionDto {
  accepted?: boolean;
  feedback?: string;
}

/**
 * Request for AI subject line suggestions
 */
export interface SubjectSuggestionRequest {
  content: string;
  tone?: ToneType;
  context?: {
    campaignType?: string;
    audience?: string;
    purpose?: string;
  };
}

/**
 * Request for AI content improvement
 */
export interface ContentImprovementRequest {
  content: string;
  tone: ToneType;
  instructions?: string;
}

/**
 * Request for AI template generation
 */
export interface TemplateGenerationRequest {
  prompt: string;
  category: string;
  channel: 'email' | 'sms';
  tone?: ToneType;
  includeVariables?: boolean;
}

/**
 * Request for AI audience suggestion
 */
export interface AudienceSuggestionRequest {
  content: string;
  subject?: string;
  campaignType?: string;
}

/**
 * AI audience suggestion response
 */
export interface AudienceSuggestion {
  recommendedSources: Array<{
    type: string;
    name: string;
    reason: string;
    estimatedCount?: number;
  }>;
  reasoning: string;
}

/**
 * AI send time suggestion
 */
export interface SendTimeSuggestion {
  recommendedTime: string;
  alternativeTimes: string[];
  reasoning: string;
}
