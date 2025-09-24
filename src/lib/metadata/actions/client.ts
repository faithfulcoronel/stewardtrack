import type { ActionConfig } from '@/components/dynamic/shared';

import type { MetadataActionResult } from './types';

interface ExecuteMetadataActionOptions {
  input?: unknown;
  context?: {
    params?: Record<string, string | string[] | undefined>;
    role?: string | null;
  };
  signal?: AbortSignal;
}

const ENDPOINT = '/api/metadata/actions';

export async function executeMetadataAction(
  action: ActionConfig | null | undefined,
  options: ExecuteMetadataActionOptions = {}
): Promise<MetadataActionResult> {
  if (!action) {
    throw new Error('No metadata action was provided.');
  }

  const kind = action.kind ?? 'metadata.service';
  const payload = {
    action: {
      id: action.id ?? null,
      kind,
      config: action.config ?? {},
      handler: (action.config as Record<string, unknown> | null)?.handler ?? undefined,
    },
    input: options.input ?? null,
    context: {
      params: options.context?.params ?? {},
      role: options.context?.role ?? null,
    },
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const message =
      typeof details.error === 'string'
        ? details.error
        : 'The action request failed. Please try again.';
    throw new Error(message);
  }

  const result = (await response.json()) as MetadataActionResult;
  return result;
}
