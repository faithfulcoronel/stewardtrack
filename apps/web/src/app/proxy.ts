import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy that adds request path information to headers.
 * This enables server components to access the current URL path.
 *
 * Migrated from middleware.ts to proxy.ts for Next.js 16 compatibility.
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add the current pathname to headers for server components
  response.headers.set("x-pathname", request.nextUrl.pathname);

  // Include search params if any
  const searchParams = request.nextUrl.search;
  if (searchParams) {
    response.headers.set("x-search", searchParams);
  }

  // Full URL for reference
  response.headers.set("x-url", request.nextUrl.href);

  return response;
}

export const config = {
  // Match all paths except static files and API routes that don't need path info
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*\\.js).*)",
  ],
};
