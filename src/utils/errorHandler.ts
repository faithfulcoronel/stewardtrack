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

export class FieldValidationError extends Error {
  readonly field: string;

  readonly messages: string[];

  constructor(field: string, messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list[0] ?? 'This value is invalid');
    this.name = 'FieldValidationError';
    this.field = field;
    this.messages = list;
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
