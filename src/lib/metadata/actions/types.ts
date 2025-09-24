import type { ActionConfig } from '@/components/dynamic/shared';

export type MetadataActionConfig = NonNullable<ActionConfig['config']> &
  Record<string, unknown>;

export interface MetadataActionExecution {
  /** Identifier supplied by the blueprint author. */
  id: string;
  /** Kind of action being executed (e.g. metadata.service). */
  kind: string;
  /** Configuration resolved from metadata authoring. */
  config: MetadataActionConfig;
  /** Arbitrary payload supplied by the client. */
  input: unknown;
  /** Additional request context, such as URL params or the user's role. */
  context: MetadataActionContext;
}

export interface MetadataActionContext {
  params: Record<string, string | string[] | undefined>;
  role: string;
}

export interface MetadataActionResult {
  success: boolean;
  message?: string | null;
  redirectUrl?: string | null;
  /**
   * Optional structured data that downstream consumers can use.
   * For example, persisted identifiers from the mutation.
   */
  data?: Record<string, unknown> | null;
  /** HTTP status that best represents the result. */
  status?: number;
}

export type MetadataActionHandler = (
  execution: MetadataActionExecution
) => Promise<MetadataActionResult>;
