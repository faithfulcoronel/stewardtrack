/**
 * Access Gate Middleware
 *
 * Middleware utilities for protecting API routes
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { AccessGate, AccessDeniedError } from './AccessGate';

/**
 * Type for Next.js route handlers
 */
type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Options for access gate middleware
 */
interface GateMiddlewareOptions {
  // Function to extract user ID from request
  getUserId: (request: NextRequest) => Promise<string | null> | string | null;

  // Function to extract tenant ID from request (optional)
  getTenantId?: (request: NextRequest) => Promise<string | null> | string | null;

  // Custom error response
  onError?: (error: AccessDeniedError) => NextResponse;

  // Custom unauthorized response
  onUnauthorized?: (reason?: string) => NextResponse;
}

/**
 * Higher-order function that wraps a route handler with access gate protection
 *
 * @example
 * import { Gate } from '@/lib/access-gate';
 * import { withGate } from '@/lib/access-gate/middleware';
 *
 * const gate = Gate.withPermission('members.edit');
 *
 * export const POST = withGate(gate, {
 *   getUserId: async (req) => {
 *     // Extract user ID from auth token
 *     return getUserIdFromToken(req);
 *   }
 * })(async (request) => {
 *   // Your protected route logic
 *   return NextResponse.json({ success: true });
 * });
 */
export function withGate(
  gate: AccessGate,
  options: GateMiddlewareOptions
): (handler: RouteHandler) => RouteHandler {
  return (handler: RouteHandler) => {
    return async (request: NextRequest, context?: any) => {
      try {
        // Extract user ID
        const userId = await options.getUserId(request);

        if (!userId) {
          if (options.onUnauthorized) {
            return options.onUnauthorized('No user ID found');
          }
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          );
        }

        // Extract tenant ID (optional)
        const tenantId = options.getTenantId
          ? await options.getTenantId(request)
          : undefined;

        // Check access
        await gate.verify(userId, tenantId || undefined);

        // Access granted, proceed to handler
        return await handler(request, context);
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          if (options.onError) {
            return options.onError(error);
          }

          return NextResponse.json(
            {
              success: false,
              error: error.message,
              redirectTo: error.redirectTo,
            },
            { status: 403 }
          );
        }

        // Other errors
        console.error('Access gate middleware error:', error);
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Utility to create a simple gate middleware with common configuration
 *
 * @example
 * export const POST = gateProtected(
 *   Gate.withPermission('members.edit'),
 *   getUserIdFromRequest
 * )(async (request) => {
 *   return NextResponse.json({ success: true });
 * });
 */
export function gateProtected(
  gate: AccessGate,
  getUserId: (request: NextRequest) => Promise<string | null> | string | null,
  getTenantId?: (request: NextRequest) => Promise<string | null> | string | null
) {
  return withGate(gate, { getUserId, getTenantId });
}

/**
 * Utility to check access in server actions
 *
 * @example
 * 'use server'
 *
 * import { Gate } from '@/lib/access-gate';
 * import { checkGate } from '@/lib/access-gate/middleware';
 *
 * export async function deleteUser(userId: string) {
 *   await checkGate(
 *     Gate.withPermission('users.delete'),
 *     await getCurrentUserId()
 *   );
 *
 *   // Protected logic
 * }
 */
export async function checkGate(
  gate: AccessGate,
  userId: string,
  tenantId?: string
): Promise<void> {
  await gate.verify(userId, tenantId);
}

/**
 * Utility for checking access and returning boolean
 *
 * @example
 * const canEdit = await canPassGate(
 *   Gate.withPermission('members.edit'),
 *   userId,
 *   tenantId
 * );
 */
export async function canPassGate(
  gate: AccessGate,
  userId: string,
  tenantId?: string
): Promise<boolean> {
  return await gate.allows(userId, tenantId);
}
