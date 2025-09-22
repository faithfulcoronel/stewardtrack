import type { PostgrestError } from '@supabase/supabase-js';

export function handleSupabaseError(error: PostgrestError | Error): never {
  const supabaseError =
    error instanceof Error
      ? error
      : new Error(error.message || 'Supabase request failed');

  if (process.env.NODE_ENV !== 'test') {
    console.error('[Supabase]', supabaseError);
  }

  throw supabaseError;
}
