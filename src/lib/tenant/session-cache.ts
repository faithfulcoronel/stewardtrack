import { cookies } from "next/headers";

const TENANT_CACHE_KEY = "st-tenant";
const TENANT_SESSION_KEY = "st-tenant-session";

type TenantSession = {
  tenant: string | null;
  sessionId: string | null;
};

async function getMutableCookieStore() {
  const store = await cookies();
  const canMutate = typeof (store as any).set === "function" && typeof (store as any).delete === "function";

  return canMutate ? store : null;
}

export async function readTenantSession(): Promise<TenantSession> {
  const store = await cookies();

  return {
    tenant: store.get(TENANT_CACHE_KEY)?.value ?? null,
    sessionId: store.get(TENANT_SESSION_KEY)?.value ?? null,
  };
}

export async function writeTenantSession(tenant: string, sessionId: string) {
  const store = await getMutableCookieStore();

  if (!store) {
    return;
  }

  try {
    (store as any).set({ name: TENANT_CACHE_KEY, value: tenant, path: "/" });
    (store as any).set({ name: TENANT_SESSION_KEY, value: sessionId, path: "/" });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Failed to persist tenant session cookies", error);
    }
  }
}

export async function clearTenantSession() {
  const store = await getMutableCookieStore();

  if (!store) {
    return;
  }

  try {
    (store as any).delete(TENANT_CACHE_KEY);
    (store as any).delete(TENANT_SESSION_KEY);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Failed to clear tenant session cookies", error);
    }
  }
}
