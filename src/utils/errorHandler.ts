export interface ErrorContext {
  context?: string;
  [key: string]: unknown;
}

export class TenantContextError extends Error {
  constructor(message = 'Tenant context is required') {
    super(message);
    this.name = 'TenantContextError';
  }
}

export function handleError(error: unknown, ctx?: ErrorContext): Error {
  const baseError =
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');

  if (ctx) {
    (baseError as Error & { context?: ErrorContext }).context = ctx;
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[DataLayer]', ctx ?? {}, baseError);
  }

  return baseError;
}
