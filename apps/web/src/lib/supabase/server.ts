import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type EnvConfig = { url: string; anonKey: string } | null;

const getEnv = (): EnvConfig => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Missing Supabase environment variables – using mock client.");
    }
    return null;
  }

  return { url, anonKey };
};

export async function createSupabaseServerClient(cookieMaxAge?: number): Promise<SupabaseClient> {
  const env = getEnv();

  if (!env) {
    throw new Error("Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  const cookieStore = await cookies();
  const { url, anonKey } = env;

  const canSetCookies = typeof (cookieStore as any).set === "function";

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: async () =>
        cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      setAll: async (cookiesToSet) => {
        if (!canSetCookies) {
          return;
        }

        for (const { name, value, options } of cookiesToSet) {
          try {
            // Apply custom maxAge if provided (for remember me functionality)
            const cookieOptions = options ?? {};
            if (cookieMaxAge !== undefined) {
              cookieOptions.maxAge = cookieMaxAge;
            }

            await (cookieStore as any).set({
              name,
              value: value ?? "",
              ...cookieOptions,
            });
          } catch {
            // noop when invoked outside a mutable cookies context
          }
        }
      },
    },
  });
}
