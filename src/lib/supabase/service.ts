'use server';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

async function resolveEnv(key: string, fallbackKey?: string): Promise<string | undefined> {
  return process.env[key] ?? (fallbackKey ? process.env[fallbackKey] : undefined);
}

export async function getSupabaseServiceClient(): Promise<SupabaseClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl =
    (await resolveEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')) ??
    (await resolveEnv('NEXT_PUBLIC_SUPABASE_URL'));

  const serviceRoleKey = await resolveEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
