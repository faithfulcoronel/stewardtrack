/**
 * AI Provider Factory
 *
 * Creates the appropriate AI service based on environment configuration.
 * Supports multiple providers:
 * - Anthropic API (direct)
 * - AWS Bedrock (Claude via AWS)
 *
 * Environment Variables:
 * - AI_PROVIDER: 'anthropic' | 'bedrock' (defaults to 'anthropic')
 * - ANTHROPIC_API_KEY: Required for 'anthropic' provider
 * - AWS_REGION: Required for 'bedrock' provider (e.g., 'us-west-2')
 * - AWS_ACCESS_KEY_ID: Optional for 'bedrock' (uses IAM roles if not set)
 * - AWS_SECRET_ACCESS_KEY: Optional for 'bedrock' (uses IAM roles if not set)
 */

import type { IAIService } from './IAIService';
import { ClaudeAPIService } from './ClaudeAPIService';
import { BedrockAPIService } from './BedrockAPIService';

/**
 * Supported AI providers
 */
export type AIProvider = 'anthropic' | 'bedrock';

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  provider: AIProvider;
  anthropicApiKey?: string;
  awsRegion?: string;
  model?: string;
}

/**
 * Create an AI service instance based on environment configuration
 *
 * @param config - Optional configuration (falls back to environment variables)
 * @returns Configured AI service instance
 * @throws Error if required configuration is missing
 */
export function createAIService(config?: Partial<AIProviderConfig>): IAIService {
  // Determine provider from config or environment
  const provider = (config?.provider || process.env.AI_PROVIDER || 'anthropic') as AIProvider;

  console.log('[AIProviderFactory] Creating AI service with provider:', provider);

  switch (provider) {
    case 'anthropic':
      return createAnthropicService(config);

    case 'bedrock':
      return createBedrockService(config);

    default:
      throw new Error(
        `Unsupported AI provider: ${provider}. ` +
        `Supported providers are: 'anthropic', 'bedrock'`
      );
  }
}

/**
 * Create Anthropic API service
 */
function createAnthropicService(config?: Partial<AIProviderConfig>): ClaudeAPIService {
  const apiKey = config?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required for Anthropic provider. ' +
      'Please set it as an environment variable.'
    );
  }

  return new ClaudeAPIService(apiKey, config?.model);
}

/**
 * Create AWS Bedrock service
 */
function createBedrockService(config?: Partial<AIProviderConfig>): BedrockAPIService {
  const region = config?.awsRegion || process.env.AWS_REGION;

  if (!region) {
    throw new Error(
      'AWS_REGION is required for Bedrock provider. ' +
      'Please set it as an environment variable (e.g., us-west-2).'
    );
  }

  // AWS SDK will automatically handle credentials from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. IAM role (if running on AWS infrastructure)
  // 3. ~/.aws/credentials file

  return new BedrockAPIService(region, config?.model);
}

/**
 * Validate AI provider configuration
 *
 * @returns Validation result with error message if invalid
 */
export function validateAIProviderConfig(): { valid: boolean; error?: string } {
  const provider = (process.env.AI_PROVIDER || 'anthropic') as AIProvider;

  switch (provider) {
    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          valid: false,
          error: 'ANTHROPIC_API_KEY is not set. Please configure it to use the Anthropic provider.',
        };
      }
      return { valid: true };

    case 'bedrock':
      if (!process.env.AWS_REGION) {
        return {
          valid: false,
          error: 'AWS_REGION is not set. Please configure it to use the Bedrock provider.',
        };
      }
      // Note: AWS credentials are optional if using IAM roles
      return { valid: true };

    default:
      return {
        valid: false,
        error: `Unsupported AI provider: ${provider}. Use 'anthropic' or 'bedrock'.`,
      };
  }
}

/**
 * Get the current AI provider name
 */
export function getCurrentProvider(): AIProvider {
  return (process.env.AI_PROVIDER || 'anthropic') as AIProvider;
}

/**
 * Check if AI service is configured and available
 */
export function isAIServiceAvailable(): boolean {
  const validation = validateAIProviderConfig();
  return validation.valid;
}
