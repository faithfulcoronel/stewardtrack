import type { PostgrestError } from '@supabase/supabase-js';

export function handleSupabaseError(error: PostgrestError | Error): never {
  const supabaseError =
    error instanceof Error
      ? error
      : new Error(
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as PostgrestError).message)
            : 'Supabase request failed'
        );

  if (process.env.NODE_ENV !== 'test') {
    console.error('[Supabase]', supabaseError);
  }

  throw supabaseError;
}
