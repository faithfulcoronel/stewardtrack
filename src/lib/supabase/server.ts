import { createServerClient } from "@supabase/ssr";
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
            await (cookieStore as any).set({
              name,
              value: value ?? "",
              ...(options ?? {}),
            });
          } catch {
            // noop when invoked outside a mutable cookies context
          }
        }
      },
    },
  });
}
