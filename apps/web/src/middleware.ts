import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware
 *
 * Sets the x-pathname header so server components can access the current URL path.
 * This is used by the admin layout to capture the intended destination for
 * post-login redirect.
 */
export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Set the current pathname in a custom header
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Also set the full URL (pathname + search params) for cases where query params matter
  requestHeaders.set(
    "x-url",
    request.nextUrl.pathname + request.nextUrl.search
  );

  // Return response with modified request headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Matcher configuration
 *
 * Apply middleware to all routes except:
 * - Static files (_next/static, images, fonts, etc.)
 * - API routes (they handle their own context)
 * - Favicon and other root-level assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
