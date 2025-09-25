import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type EnvConfig = { url: string; anonKey: string } | null;

const FALLBACK_USER = {
  id: "demo-admin-user",
  email: "admin@stewardtrack.test",
  app_metadata: {
    role: "admin",
    tenant: "demo-hope-chapel",
    featureFlags: {
      "online-check-in": true,
      "care-plan-workflows": true,
      "sabbath-mode": true,
    },
  },
  user_metadata: {
    full_name: "Demo Steward",
    avatar_url: null,
    plan: "Pro",
    locale: "en-US",
  },
};

const FALLBACK_SESSION = {
  access_token: "demo-admin-session",
};

let cachedMockClient: SupabaseClient | null = null;

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

function createNoopQueryBuilder() {
  const noopResponse = Promise.resolve({ data: [], error: null, count: 0 });

  const builder: Record<string, (...args: unknown[]) => unknown> = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    limit: () => builder,
    order: () => builder,
    range: () => builder,
    returns: () => builder,
    filter: () => builder,
    match: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    ilike: () => builder,
    like: () => builder,
    not: () => builder,
    is: () => builder,
    contains: () => builder,
    overlaps: () => builder,
    textSearch: () => builder,
    or: () => builder,
    in: () => builder,
    then: (onFulfilled: (value: unknown) => unknown) => noopResponse.then(onFulfilled),
    catch: (onRejected: (reason: unknown) => unknown) => noopResponse.catch(onRejected),
    finally: (onFinally: () => void) => noopResponse.finally(onFinally),
  };

  return new Proxy(builder, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof typeof target];
      }
      return () => builder;
    },
  });
}

function createMockSupabaseClient(): SupabaseClient {
  if (cachedMockClient) {
    return cachedMockClient;
  }

  const queryBuilder = createNoopQueryBuilder();

  const mockClient: SupabaseClient = {
    auth: {
      async getUser() {
        return { data: { user: FALLBACK_USER }, error: null } as const;
      },
      async getSession() {
        return { data: { session: FALLBACK_SESSION }, error: null } as const;
      },
      async signOut() {
        return { error: null } as const;
      },
      async getUserIdentities() {
        return { data: [], error: null } as const;
      },
      async listFactors() {
        return { data: { factors: [] }, error: null } as const;
      },
      async resend() {
        return { data: {}, error: null } as const;
      },
      async setSession() {
        return { data: { user: FALLBACK_USER, session: FALLBACK_SESSION }, error: null } as const;
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } }, error: null } as const;
      },
      async signInWithPassword(_credentials) {
        return { data: { user: FALLBACK_USER, session: FALLBACK_SESSION }, error: null } as const;
      },
      async updateUser(_attributes) {
        return { data: { user: FALLBACK_USER }, error: null } as const;
      },
      async signUp(_credentials) {
        return { data: { user: FALLBACK_USER, session: FALLBACK_SESSION }, error: null } as const;
      },
      async signInWithOtp(_credentials) {
        return { data: { user: FALLBACK_USER, session: FALLBACK_SESSION }, error: null } as const;
      },
      async exchangeCodeForSession(_params) {
        return { data: { user: FALLBACK_USER, session: FALLBACK_SESSION }, error: null } as const;
      },
      async verifyOtp(_params) {
        return { data: { user: FALLBACK_USER, session: FALLBACK_SESSION }, error: null } as const;
      },
      async mfa() {
        return { data: {}, error: null } as const;
      },
      async getAuthenticatorAssuranceLevel() {
        return { data: { currentLevel: "aal1" }, error: null } as const;
      },
    },
    from() {
      return queryBuilder as never;
    },
    schema() {
      return queryBuilder as never;
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe: async () => ({ data: { status: "SUBSCRIBED" }, error: null } as const),
      } as never;
    },
    getChannels() {
      return [];
    },
    removeChannel() {
      return true;
    },
    removeAllChannels() {
      return true;
    },
    functions: {
      invoke: async () => ({ data: null, error: null } as const),
    },
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: null } as const),
          update: async () => ({ data: null, error: null } as const),
          download: async () => ({ data: null, error: null } as const),
          remove: async () => ({ data: null, error: null } as const),
          list: async () => ({ data: [], error: null } as const),
          getPublicUrl: () => ({ data: { publicUrl: "" }, error: null } as const),
        } as const;
      },
      getBucket: async () => ({ data: null, error: null } as const),
      listBuckets: async () => ({ data: [], error: null } as const),
      createBucket: async () => ({ data: null, error: null } as const),
      updateBucket: async () => ({ data: null, error: null } as const),
      deleteBucket: async () => ({ data: null, error: null } as const),
    },
    rpc: async (fn: string, _args?: Record<string, unknown>) => {
      if (fn === "get_current_tenant") {
        return { data: { id: "demo-hope-chapel" }, error: null } as const;
      }
      return { data: null, error: null } as const;
    },
  } as unknown as SupabaseClient;

  cachedMockClient = mockClient;
  return mockClient;
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const env = getEnv();
  if (!env) {
    return createMockSupabaseClient();
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
