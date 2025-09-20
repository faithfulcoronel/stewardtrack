import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const getEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return { url, anonKey };
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      get: async (name: string) => cookieStore.get(name)?.value,
      set: async (name: string, value: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // noop when invoked outside a mutable cookies context
        }
      },
      remove: async (name: string, options: CookieOptions) => {
        try {
          cookieStore.delete({ name, ...options });
        } catch {
          // noop when invoked outside a mutable cookies context
        }
      },
    },
  });
}
