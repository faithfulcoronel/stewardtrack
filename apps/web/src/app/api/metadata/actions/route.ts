import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  resolveMetadataActionHandler,
  type MetadataActionExecution,
  type MetadataActionResult,
} from '@/lib/metadata/actions';

const requestSchema = z.object({
  action: z.object({
    id: z.string().optional().nullable(),
    kind: z.string().optional().nullable(),
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .nullable()
      .default({}),
    handler: z.string().optional(),
  }),
  input: z.unknown().optional(),
  context: z
    .object({
      params: z
        .record(z.union([z.string(), z.array(z.string())]))
        .optional()
        .default({}),
      role: z.string().optional().nullable(),
    })
    .optional()
    .default({ params: {}, role: 'guest' }),
});

const SERVICE_KIND = 'metadata.service';

export async function POST(request: Request) {
  let payload: z.infer<typeof requestSchema>;

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 422 });
    }
    payload = parsed.data;
  } catch (error) {
    console.error('Failed to parse metadata action payload', error);
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const actionId = payload.action.id ?? payload.action.handler ?? 'anonymous-action';
  const kind = payload.action.kind ?? SERVICE_KIND;
  const config = (payload.action.config ?? {}) as Record<string, unknown>;
  const handlerId =
    typeof config.handler === 'string'
      ? config.handler
      : typeof payload.action.handler === 'string'
        ? payload.action.handler
        : typeof payload.action.id === 'string'
          ? payload.action.id
          : null;

  if (kind !== SERVICE_KIND) {
    return NextResponse.json({ error: `Unsupported action kind: ${kind}` }, { status: 400 });
  }

  if (!handlerId) {
    return NextResponse.json({ error: 'No action handler was provided.' }, { status: 400 });
  }

  const handler = resolveMetadataActionHandler(handlerId);
  if (!handler) {
    return NextResponse.json({ error: `No handler registered for ${handlerId}.` }, { status: 404 });
  }

  const execution: MetadataActionExecution = {
    id: actionId,
    kind,
    config: {
      ...config,
      handler: handlerId,
    },
    input: payload.input ?? null,
    context: {
      params: payload.context.params,
      role: payload.context.role ?? 'guest',
    },
  };

  let result: MetadataActionResult;

  try {
    result = await handler(execution);
  } catch (error) {
    console.error(`Metadata action ${handlerId} failed`, error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the action.' },
      { status: 500 }
    );
  }

  const status = result.status ?? (result.success ? 200 : 400);

  if (!result.success) {
    return NextResponse.json(
      { error: result.message ?? 'The action failed to execute.' },
      { status }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: result.message ?? null,
      redirectUrl: result.redirectUrl ?? null,
      data: result.data ?? null,
    },
    { status }
  );
}
