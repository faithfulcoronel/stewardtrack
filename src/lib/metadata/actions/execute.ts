"use server";

import type { ActionConfig } from '@/components/dynamic/shared';

import { resolveMetadataActionHandler } from '.';
import type { MetadataActionExecution, MetadataActionResult } from './types';

type ExecuteMetadataActionOptions = {
  input?: unknown;
  context?: {
    params?: Record<string, string | string[] | undefined>;
    role?: string | null;
  };
};

const SERVICE_KIND = 'metadata.service';

export async function executeMetadataAction(
  action: ActionConfig | null | undefined,
  options: ExecuteMetadataActionOptions = {},
): Promise<MetadataActionResult> {
  if (!action) {
    throw new Error('No metadata action was provided.');
  }

  const kind = action.kind ?? SERVICE_KIND;
  if (kind !== SERVICE_KIND) {
    throw new Error(`Unsupported action kind: ${kind}`);
  }

  const config = (action.config ?? {}) as Record<string, unknown>;
  const handlerId = typeof config.handler === 'string' ? config.handler : '';
  if (!handlerId) {
    throw new Error('No action handler was provided.');
  }

  const handler = resolveMetadataActionHandler(handlerId);
  if (!handler) {
    throw new Error(`No handler registered for ${handlerId}.`);
  }

  const execution: MetadataActionExecution = {
    id: action.id ?? handlerId,
    kind,
    config: {
      ...config,
      handler: handlerId,
    },
    input: options.input ?? null,
    context: {
      params: options.context?.params ?? {},
      role: options.context?.role ?? 'guest',
    },
  };

  let result: MetadataActionResult;
  try {
    result = await handler(execution);
  } catch (error) {
    console.error(`Metadata action ${handlerId} failed`, error);
    throw new Error('An unexpected error occurred while processing the action.');
  }

  if (!result.success) {
    const message = result.message ?? 'The action failed to execute.';
    const error = new Error(message);
    (error as Error & { result?: MetadataActionResult }).result = result;
    throw error;
  }

  return result;
}

export type { ExecuteMetadataActionOptions };
