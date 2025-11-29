# Epic 1: JWT Authentication API & Token Management

**Release:** Beta - March 2026
**Timeline:** Week 1 (January 6-12, 2026)
**Duration:** 1 week (accelerated with Claude AI)
**Priority:** P0 (Blocking - Required for Product Launch)
**Epic Owner:** Backend Team + Claude AI Assistance
**Dependencies:** None

## Epic Overview

Implement stateless JWT-based authentication for the main StewardTrack app (app.stewardtrack.com) to support API access from the marketing website (stewardtrack.com). This epic includes:

1. **Product Offerings API** - Public endpoint for marketing website to display subscription plans
2. **JWT Authentication** - Stateless token-based auth with HTTP-only cookies
3. **Registration Flow** - User registration with plan selection, tenant creation, RBAC seeding, and feature grants
4. **Login/Logout** - Session management with access and refresh tokens
5. **Authentication Middleware** - Automatic token validation and refresh on protected routes
6. **Server Context Helpers** - Utilities for accessing authenticated user data in API routes

This replaces session-based authentication with token-based authentication using HTTP-only cookies for security.

## Architecture

### Authentication Flow

```
Marketing Website (stewardtrack.com)
    │
    ├─> GET /api/licensing/product-offerings (fetch available plans)
    │   └─> Returns: Essential, Professional, Enterprise, Premium with features
    │
    ├─> User selects plan on pricing page
    │
    ├─> POST /api/auth/register (new user + selected plan)
    │   ├─> Creates tenant with selected plan
    │   ├─> Seeds default RBAC roles
    │   ├─> Grants license features based on plan
    │   └─> Creates onboarding_progress record
    │
    ├─> POST /api/auth/login (existing user)
    │
    └─> Response: HTTP-only cookies
         ├─> auth_token (access token, 15min)
         └─> refresh_token (7 days)

User authenticated to app.stewardtrack.com
    │
    ├─> All requests include cookies automatically
    ├─> Middleware validates token on every request
    └─> Token refresh handled automatically
```

### JWT Token Structure

**Access Token Payload:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@mycollection.church",
  "tenant_id": "tenant-uuid-here",
  "tenant_name": "My Collection Church",
  "permissions": ["members:read", "members:write", "finance:read"],
  "roles": ["tenant_admin"],
  "iat": 1704067800,
  "exp": 1704068700,
  "iss": "stewardtrack",
  "aud": "app.stewardtrack.com"
}
```

**Refresh Token Payload:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "iat": 1704067800,
  "exp": 1704672600,
  "iss": "stewardtrack",
  "aud": "app.stewardtrack.com"
}
```

---

## User Stories

### Story 1.0: Product Offerings API

**As a** potential customer on the marketing website
**I want to** view available subscription plans and their features
**So that** I can choose the right plan for my church before registering

**Priority:** P0
**Story Points:** 3

#### Acceptance Criteria

- [ ] GET `/api/licensing/product-offerings` endpoint returns all active product offerings
- [ ] Response includes plan name, price, billing cycle, and feature list
- [ ] Endpoint is publicly accessible (no authentication required)
- [ ] Results are cached for 5 minutes to reduce database load
- [ ] Features are grouped by category (Core, Advanced, Premium)

#### API Specification

**Endpoint:** `GET /api/licensing/product-offerings`

**Query Parameters:**
- `billing_cycle` (optional): Filter by `monthly` or `annual`. Default: return both.

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-essential",
      "name": "Essential",
      "description": "Perfect for small churches getting started",
      "pricing": [
        {
          "billing_cycle": "monthly",
          "price": 2999,
          "currency": "PHP"
        },
        {
          "billing_cycle": "annual",
          "price": 29990,
          "currency": "PHP",
          "discount_percentage": 17
        }
      ],
      "features": [
        {
          "category": "core",
          "name": "member_management",
          "display_name": "Member Management",
          "description": "Up to 200 members",
          "included": true
        },
        {
          "category": "core",
          "name": "basic_donations",
          "display_name": "Basic Donation Tracking",
          "description": "Record and track donations",
          "included": true
        },
        {
          "category": "advanced",
          "name": "advanced_reports",
          "display_name": "Advanced Reports",
          "description": "Detailed analytics and insights",
          "included": false
        }
      ],
      "is_popular": false,
      "sort_order": 1
    },
    {
      "id": "uuid-professional",
      "name": "Professional",
      "description": "For growing churches with advanced needs",
      "pricing": [
        {
          "billing_cycle": "monthly",
          "price": 5999,
          "currency": "PHP"
        },
        {
          "billing_cycle": "annual",
          "price": 59990,
          "currency": "PHP",
          "discount_percentage": 17
        }
      ],
      "features": [
        {
          "category": "core",
          "name": "member_management",
          "display_name": "Member Management",
          "description": "Up to 1000 members",
          "included": true
        },
        {
          "category": "advanced",
          "name": "advanced_reports",
          "display_name": "Advanced Reports",
          "description": "Detailed analytics and insights",
          "included": true
        },
        {
          "category": "advanced",
          "name": "multi_campus",
          "display_name": "Multi-Campus Support",
          "description": "Manage multiple locations",
          "included": true
        }
      ],
      "is_popular": true,
      "sort_order": 2
    }
  ]
}
```

#### Implementation Details

**File Location:** `src/app/api/licensing/product-offerings/route.ts`

**Key Implementation Points:**
1. Query `product_offerings` table with joins to `product_pricing` and `license_feature_bundles`
2. Filter by `is_active = true` and order by `sort_order`
3. Implement in-memory cache with 5-minute TTL
4. Transform database response to match API specification
5. Support optional `billing_cycle` query parameter filtering
6. Return all active offerings with pricing and feature details

**Database Tables Used:**
- `product_offerings` - Product plans catalog
- `product_pricing` - Pricing by billing cycle (monthly/annual)
- `license_feature_bundles` - Features included in each plan
- `license_features` - Feature catalog with descriptions

**Caching Strategy:**
- Store result in memory for 5 minutes
- Clear cache on product offering updates (optional webhook)
- Reduces database load for high-traffic marketing site

#### Testing Strategy

**Unit Tests:**
- [ ] API returns all active product offerings
- [ ] API filters by billing cycle correctly
- [ ] Cache works and expires after 5 minutes
- [ ] Data transformation is correct

**Integration Tests:**
- [ ] GET `/api/licensing/product-offerings` returns 200
- [ ] GET `/api/licensing/product-offerings?billing_cycle=monthly` filters correctly
- [ ] Response includes all required fields
- [ ] Cached responses are consistent

**Manual Testing:**
1. Call API without authentication
2. Verify all plans returned (Essential, Professional, Enterprise, Premium)
3. Verify features are grouped by category
4. Test billing cycle filter
5. Verify response is cached (check server logs)

---

### Story 1.1: Registration API

**As a** new church administrator
**I want to** register for a StewardTrack account via the marketing website
**So that** I can create a new tenant and start using the system

**Priority:** P0
**Story Points:** 8

#### Acceptance Criteria

- [ ] POST `/api/auth/register` endpoint accepts registration data
- [ ] Validates email uniqueness across all tenants
- [ ] Creates Supabase auth user with email/password
- [ ] Creates tenant record with subdomain
- [ ] Creates user profile record
- [ ] Links user to tenant via `tenant_users` table
- [ ] Assigns `tenant_admin` role automatically
- [ ] Seeds 4 default RBAC roles (admin, staff, volunteer, member)
- [ ] Grants license features based on selected plan
- [ ] Creates `onboarding_progress` record
- [ ] Returns HTTP-only cookies with access + refresh tokens
- [ ] Rate limits to 5 registration attempts per IP per hour
- [ ] Returns detailed error messages for validation failures

#### API Specification

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "admin@mycollection.church",
  "password": "SecurePassword123!",
  "churchName": "My Collection Church",
  "subdomain": "mycollection",
  "firstName": "John",
  "lastName": "Doe",
  "selectedPlan": "professional"
}
```

**Validation Rules:**
- `email`: Valid email format, max 255 chars, unique across system
- `password`: Min 8 chars, must include uppercase, lowercase, number, special char
- `churchName`: Min 2 chars, max 100 chars
- `subdomain`: Min 3 chars, max 50 chars, alphanumeric + hyphens only, unique
- `firstName`: Min 2 chars, max 50 chars
- `lastName`: Min 2 chars, max 50 chars
- `selectedPlan`: One of: `essential`, `professional`, `enterprise`, `premium`

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "tenantId": "tenant-uuid-here",
    "email": "admin@mycollection.church",
    "subdomain": "mycollection",
    "onboardingComplete": false
  }
}
```

**Cookies Set:**
- `auth_token`: JWT access token, HttpOnly, Secure, SameSite=Strict, Max-Age=900 (15 min)
- `refresh_token`: JWT refresh token, HttpOnly, Secure, SameSite=Strict, Max-Age=604800 (7 days)

**Error Responses:**

```json
// 400 - Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Email is already registered",
      "subdomain": "Subdomain is already taken"
    }
  }
}

// 429 - Rate Limit
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many registration attempts. Please try again later.",
    "retryAfter": 3600
  }
}

// 500 - Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred during registration"
  }
}
```

#### Implementation

##### Step 1: Create Validation Schema

**File:** `src/lib/validation/auth.validation.ts`

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must include uppercase, lowercase, number, and special character'
    ),
  churchName: z
    .string()
    .min(2, 'Church name must be at least 2 characters')
    .max(100, 'Church name must be less than 100 characters')
    .trim(),
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50, 'Subdomain must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens')
    .toLowerCase(),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  selectedPlan: z.enum(['essential', 'professional', 'enterprise', 'premium'], {
    errorMap: () => ({ message: 'Invalid plan selected' })
  })
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

##### Step 2: Create AuthService

**File:** `src/services/AuthService.ts`

```typescript
import { injectable, inject } from 'inversify';
import { SignJWT, jwtVerify } from 'jose';
import * as bcrypt from 'bcryptjs';
import { TYPES } from '@/lib/types';
import type { IAuthService, TokenPayload, LoginCredentials, RegisterData } from '@/lib/interfaces/auth.interface';
import type { IUserRepository } from '@/repositories/user.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { RbacCoreService } from './RbacCoreService';
import type { LicenseFeatureService } from './LicenseFeatureService';
import { seedDefaultRBAC } from '@/lib/tenant/seedDefaultRBAC';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long');
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TYPES.IUserRepository)
    private userRepository: IUserRepository,

    @inject(TYPES.ITenantRepository)
    private tenantRepository: ITenantRepository,

    @inject(TYPES.RbacCoreService)
    private rbacService: RbacCoreService,

    @inject(TYPES.LicenseFeatureService)
    private licenseFeatureService: LicenseFeatureService
  ) {}

  /**
   * Register a new user and create their tenant
   */
  async register(data: RegisterData): Promise<{
    userId: string;
    tenantId: string;
    email: string;
    subdomain: string;
    onboardingComplete: boolean;
  }> {
    const supabase = getSupabaseServerClient();

    // 1. Check if email already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // 2. Check if subdomain is available
    const existingTenant = await this.tenantRepository.findBySubdomain(data.subdomain);
    if (existingTenant) {
      throw new Error('SUBDOMAIN_ALREADY_TAKEN');
    }

    // 3. Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName
        }
      }
    });

    if (authError || !authData.user) {
      throw new Error(`AUTH_SIGNUP_FAILED: ${authError?.message}`);
    }

    const userId = authData.user.id;

    try {
      // 4. Create tenant record
      const tenant = await this.tenantRepository.create({
        name: data.churchName,
        subdomain: data.subdomain,
        plan: data.selectedPlan,
        status: 'trial'
      });

      // 5. Create user profile
      await this.userRepository.create({
        id: userId,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName
      });

      // 6. Link user to tenant
      await this.tenantRepository.addUserToTenant(tenant.id, userId, 'active');

      // 7. Seed default RBAC roles for this tenant
      await seedDefaultRBAC(tenant.id);

      // 8. Assign tenant_admin role to user
      const adminRole = await this.rbacService.getRoleByName('tenant_admin', tenant.id);
      if (adminRole) {
        await this.rbacService.assignRoleToUser(userId, adminRole.id, tenant.id);
      }

      // 9. Grant license features based on selected plan
      await this.licenseFeatureService.grantPlanFeatures(tenant.id, data.selectedPlan);

      // 10. Create onboarding progress record
      await supabase.from('onboarding_progress').insert({
        tenant_id: tenant.id,
        user_id: userId,
        current_step: 'welcome',
        completed: false,
        step_data: {}
      });

      return {
        userId,
        tenantId: tenant.id,
        email: data.email,
        subdomain: data.subdomain,
        onboardingComplete: false
      };
    } catch (error) {
      // Rollback: Delete auth user if tenant creation fails
      await supabase.auth.admin.deleteUser(userId);
      throw error;
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(credentials: LoginCredentials): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      tenantId: string;
      tenantName: string;
      permissions: string[];
      roles: string[];
    };
  }> {
    const supabase = getSupabaseServerClient();

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (authError || !authData.user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const userId = authData.user.id;

    // 2. Get user's tenant
    const tenantUser = await this.tenantRepository.getUserTenant(userId);
    if (!tenantUser) {
      throw new Error('NO_TENANT_ACCESS');
    }

    // 3. Get user's effective permissions
    const permissions = await this.rbacService.getUserEffectivePermissions(userId, tenantUser.tenant_id);

    // 4. Get user's roles
    const userRoles = await this.rbacService.getUserRoles(userId, tenantUser.tenant_id);
    const roleNames = userRoles.map(r => r.name);

    // 5. Generate tokens
    const tokenPayload: TokenPayload = {
      sub: userId,
      email: authData.user.email!,
      tenant_id: tenantUser.tenant_id,
      tenant_name: tenantUser.tenant_name,
      permissions: permissions.map(p => p.name),
      roles: roleNames
    };

    const accessToken = await this.generateAccessToken(tokenPayload);
    const refreshToken = await this.generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: authData.user.email!,
        tenantId: tenantUser.tenant_id,
        tenantName: tenantUser.tenant_name,
        permissions: tokenPayload.permissions,
        roles: roleNames
      }
    };
  }

  /**
   * Generate JWT access token
   */
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return await new SignJWT({
      sub: payload.sub,
      email: payload.email,
      tenant_id: payload.tenant_id,
      tenant_name: payload.tenant_name,
      permissions: payload.permissions,
      roles: payload.roles
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('stewardtrack')
      .setAudience('app.stewardtrack.com')
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * Generate JWT refresh token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    return await new SignJWT({ sub: userId, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('stewardtrack')
      .setAudience('app.stewardtrack.com')
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        issuer: 'stewardtrack',
        audience: 'app.stewardtrack.com'
      });

      return payload as unknown as TokenPayload;
    } catch (error) {
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    // Verify refresh token
    const { payload } = await jwtVerify(refreshToken, JWT_SECRET, {
      issuer: 'stewardtrack',
      audience: 'app.stewardtrack.com'
    });

    if (payload.type !== 'refresh') {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const userId = payload.sub as string;

    // Get fresh user data
    const tenantUser = await this.tenantRepository.getUserTenant(userId);
    if (!tenantUser) {
      throw new Error('NO_TENANT_ACCESS');
    }

    const permissions = await this.rbacService.getUserEffectivePermissions(userId, tenantUser.tenant_id);
    const userRoles = await this.rbacService.getUserRoles(userId, tenantUser.tenant_id);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Generate new access token
    const tokenPayload: TokenPayload = {
      sub: userId,
      email: user.email,
      tenant_id: tenantUser.tenant_id,
      tenant_name: tenantUser.tenant_name,
      permissions: permissions.map(p => p.name),
      roles: userRoles.map(r => r.name)
    };

    return await this.generateAccessToken(tokenPayload);
  }
}
```

##### Step 3: Create Rate Limiter Utility

**File:** `src/lib/utils/rate-limiter.ts`

```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries
  if (entry && entry.resetAt < now) {
    rateLimitStore.delete(identifier);
  }

  const currentEntry = rateLimitStore.get(identifier);

  if (!currentEntry) {
    // First attempt
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return { allowed: true };
  }

  if (currentEntry.count >= config.maxAttempts) {
    const retryAfter = Math.ceil((currentEntry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  currentEntry.count++;
  return { allowed: true };
}

// Cleanup job (run periodically)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
```

##### Step 4: Create API Route

**File:** `src/app/api/auth/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthService } from '@/services/AuthService';
import { registerSchema } from '@/lib/validation/auth.validation';
import { checkRateLimit } from '@/lib/utils/rate-limiter';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting (5 attempts per IP per hour)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `register:${ip}`;

    const rateLimit = checkRateLimit(rateLimitKey, {
      maxAttempts: 5,
      windowMs: 3600000 // 1 hour
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many registration attempts. Please try again later.',
            retryAfter: rateLimit.retryAfter
          }
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // 3. Get AuthService from DI container
    const authService = container.get<AuthService>(TYPES.AuthService);

    // 4. Register user
    const result = await authService.register(validatedData);

    // 5. Generate tokens
    const loginResult = await authService.login({
      email: validatedData.email,
      password: validatedData.password
    });

    // 6. Set HTTP-only cookies
    const response = NextResponse.json(
      {
        success: true,
        data: result
      },
      { status: 201 }
    );

    response.cookies.set('auth_token', loginResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 900, // 15 minutes
      path: '/'
    });

    response.cookies.set('refresh_token', loginResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: fieldErrors
          }
        },
        { status: 400 }
      );
    }

    // Handle custom errors
    if (error instanceof Error) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'Email is already registered',
              details: { email: 'Email is already registered' }
            }
          },
          { status: 400 }
        );
      }

      if (error.message === 'SUBDOMAIN_ALREADY_TAKEN') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SUBDOMAIN_ALREADY_TAKEN',
              message: 'Subdomain is already taken',
              details: { subdomain: 'Subdomain is already taken' }
            }
          },
          { status: 400 }
        );
      }
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during registration'
        }
      },
      { status: 500 }
    );
  }
}
```

##### Step 5: Update DI Container

**File:** `src/lib/types.ts` (add new type)

```typescript
export const TYPES = {
  // ... existing types
  AuthService: Symbol.for('AuthService'),
  IUserRepository: Symbol.for('IUserRepository'),
  ITenantRepository: Symbol.for('ITenantRepository'),
};
```

**File:** `src/lib/container.ts` (add binding)

```typescript
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/user.repository';
import { TenantRepository } from '@/repositories/tenant.repository';

// Add to container bindings
container.bind<AuthService>(TYPES.AuthService).to(AuthService).inRequestScope();
container.bind<IUserRepository>(TYPES.IUserRepository).to(UserRepository).inRequestScope();
container.bind<ITenantRepository>(TYPES.ITenantRepository).to(TenantRepository).inRequestScope();
```

#### Testing Strategy

**Unit Tests:**
- [ ] `AuthService.register()` creates user, tenant, and links them
- [ ] `AuthService.register()` throws error for duplicate email
- [ ] `AuthService.register()` throws error for duplicate subdomain
- [ ] `AuthService.register()` seeds default RBAC roles
- [ ] `AuthService.register()` grants license features correctly
- [ ] `registerSchema` validates all fields correctly
- [ ] Rate limiter blocks after 5 attempts
- [ ] Rate limiter resets after window expires

**Integration Tests:**
- [ ] POST `/api/auth/register` returns 201 with valid data
- [ ] POST `/api/auth/register` sets HTTP-only cookies
- [ ] POST `/api/auth/register` returns 400 for invalid email
- [ ] POST `/api/auth/register` returns 400 for duplicate email
- [ ] POST `/api/auth/register` returns 400 for duplicate subdomain
- [ ] POST `/api/auth/register` returns 429 after 5 attempts
- [ ] Verify tenant record created in database
- [ ] Verify user assigned `tenant_admin` role
- [ ] Verify onboarding_progress record created

**Manual Testing Checklist:**
1. Register new user from marketing website
2. Verify cookies are set in browser
3. Verify redirect to onboarding wizard
4. Check database: tenants, profiles, tenant_users, user_roles tables
5. Verify 4 default roles created for tenant
6. Verify license features granted based on plan
7. Test duplicate email rejection
8. Test duplicate subdomain rejection
9. Test rate limiting after 5 attempts

---

### Story 1.2: Login API

**As a** registered user
**I want to** log in to my StewardTrack account
**So that** I can access the application

**Priority:** P0
**Story Points:** 5

#### Acceptance Criteria

- [ ] POST `/api/auth/login` endpoint accepts email and password
- [ ] Validates credentials against Supabase Auth
- [ ] Retrieves user's tenant and permissions
- [ ] Generates JWT access token (15min expiry)
- [ ] Generates JWT refresh token (7 days expiry)
- [ ] Returns HTTP-only cookies with both tokens
- [ ] Rate limits to 10 login attempts per email per hour
- [ ] Returns 401 for invalid credentials
- [ ] Returns 403 if user has no tenant access

#### API Specification

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "admin@mycollection.church",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@mycollection.church",
      "tenantId": "tenant-uuid-here",
      "tenantName": "My Collection Church",
      "permissions": ["members:read", "members:write", "finance:read"],
      "roles": ["tenant_admin"]
    }
  }
}
```

**Cookies Set:**
- `auth_token`: JWT access token (15 min)
- `refresh_token`: JWT refresh token (7 days)

**Error Responses:**

```json
// 401 - Invalid Credentials
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}

// 403 - No Tenant Access
{
  "success": false,
  "error": {
    "code": "NO_TENANT_ACCESS",
    "message": "User does not have access to any tenant"
  }
}

// 429 - Rate Limit
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. Please try again later.",
    "retryAfter": 3600
  }
}
```

#### Implementation

**File:** `src/app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthService } from '@/services/AuthService';
import { checkRateLimit } from '@/lib/utils/rate-limiter';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // 2. Rate limiting (10 attempts per email per hour)
    const rateLimitKey = `login:${email}`;
    const rateLimit = checkRateLimit(rateLimitKey, {
      maxAttempts: 10,
      windowMs: 3600000 // 1 hour
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many login attempts. Please try again later.',
            retryAfter: rateLimit.retryAfter
          }
        },
        { status: 429 }
      );
    }

    // 3. Get AuthService from DI container
    const authService = container.get<AuthService>(TYPES.AuthService);

    // 4. Authenticate user
    const result = await authService.login({ email, password });

    // 5. Set HTTP-only cookies
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user
      }
    });

    response.cookies.set('auth_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 900, // 15 minutes
      path: '/'
    });

    response.cookies.set('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof Error) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password'
            }
          },
          { status: 401 }
        );
      }

      if (error.message === 'NO_TENANT_ACCESS') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_TENANT_ACCESS',
              message: 'User does not have access to any tenant'
            }
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during login'
        }
      },
      { status: 500 }
    );
  }
}
```

---

### Story 1.3: Token Refresh API

**As a** logged-in user
**I want** my session to be automatically extended
**So that** I don't have to log in frequently

**Priority:** P0
**Story Points:** 3

#### Acceptance Criteria

- [ ] POST `/api/auth/refresh-token` endpoint validates refresh token
- [ ] Generates new access token with fresh user data
- [ ] Optionally rotates refresh token for enhanced security
- [ ] Returns HTTP-only cookie with new access token
- [ ] Returns 401 for invalid/expired refresh token
- [ ] Returns 403 if user no longer has tenant access

#### API Specification

**Endpoint:** `POST /api/auth/refresh-token`

**Request:** No body required (reads refresh_token from cookies)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

**Cookies Set:**
- `auth_token`: New JWT access token (15 min)
- `refresh_token`: Optionally rotated refresh token (7 days)

**Error Responses:**

```json
// 401 - Invalid Refresh Token
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Invalid or expired refresh token"
  }
}

// 403 - No Tenant Access
{
  "success": false,
  "error": {
    "code": "NO_TENANT_ACCESS",
    "message": "User no longer has access to any tenant"
  }
}
```

#### Implementation

**File:** `src/app/api/auth/refresh-token/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthService } from '@/services/AuthService';

export async function POST(request: NextRequest) {
  try {
    // 1. Get refresh token from cookies
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token not found'
          }
        },
        { status: 401 }
      );
    }

    // 2. Get AuthService from DI container
    const authService = container.get<AuthService>(TYPES.AuthService);

    // 3. Refresh access token
    const newAccessToken = await authService.refreshAccessToken(refreshToken);

    // 4. Set new access token cookie
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully'
    });

    response.cookies.set('auth_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 900, // 15 minutes
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);

    if (error instanceof Error) {
      if (error.message === 'INVALID_TOKEN' || error.message === 'INVALID_REFRESH_TOKEN') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REFRESH_TOKEN',
              message: 'Invalid or expired refresh token'
            }
          },
          { status: 401 }
        );
      }

      if (error.message === 'NO_TENANT_ACCESS') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_TENANT_ACCESS',
              message: 'User no longer has access to any tenant'
            }
          },
          { status: 403 }
        );
      }

      if (error.message === 'USER_NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User account no longer exists'
            }
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during token refresh'
        }
      },
      { status: 500 }
    );
  }
}
```

---

### Story 1.4: Logout API

**As a** logged-in user
**I want to** log out of my account
**So that** my session is terminated securely

**Priority:** P1
**Story Points:** 2

#### Acceptance Criteria

- [ ] POST `/api/auth/logout` endpoint clears auth cookies
- [ ] Invalidates refresh token (optional: add to blacklist)
- [ ] Returns success response
- [ ] Works even if token is already expired

#### API Specification

**Endpoint:** `POST /api/auth/logout`

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Implementation

**File:** `src/app/api/auth/logout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Clear auth cookies
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  response.cookies.delete('auth_token');
  response.cookies.delete('refresh_token');

  return response;
}
```

---

### Story 1.5: Get Current User API

**As a** logged-in user
**I want** to retrieve my current session information
**So that** the UI can display my profile and permissions

**Priority:** P0
**Story Points:** 2

#### Acceptance Criteria

- [ ] GET `/api/auth/me` endpoint returns current user data
- [ ] Validates auth token from cookies
- [ ] Returns user profile, tenant, roles, and permissions
- [ ] Returns 401 if no valid token present

#### API Specification

**Endpoint:** `GET /api/auth/me`

**Request:** No body or params (reads auth_token from cookies)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@mycollection.church",
      "firstName": "John",
      "lastName": "Doe",
      "tenantId": "tenant-uuid-here",
      "tenantName": "My Collection Church",
      "permissions": ["members:read", "members:write", "finance:read"],
      "roles": ["tenant_admin"]
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### Implementation

**File:** `src/app/api/auth/me/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthService } from '@/services/AuthService';
import type { IUserRepository } from '@/repositories/user.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { RbacCoreService } from '@/services/RbacCoreService';

export async function GET(request: NextRequest) {
  try {
    // 1. Get auth token from cookies
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }

    // 2. Verify token
    const authService = container.get<AuthService>(TYPES.AuthService);
    const tokenPayload = await authService.verifyToken(authToken);

    // 3. Get user details
    const userRepository = container.get<IUserRepository>(TYPES.IUserRepository);
    const user = await userRepository.findById(tokenPayload.sub);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        },
        { status: 404 }
      );
    }

    // 4. Return user data (permissions/roles already in token)
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          tenantId: tokenPayload.tenant_id,
          tenantName: tokenPayload.tenant_name,
          permissions: tokenPayload.permissions,
          roles: tokenPayload.roles
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);

    if (error instanceof Error && error.message === 'INVALID_TOKEN') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}
```

---

### Story 1.6: Authentication Middleware

**As a** system administrator
**I want** all protected routes to validate JWT tokens
**So that** unauthorized users cannot access the application

**Priority:** P0
**Story Points:** 5

#### Acceptance Criteria

- [ ] Middleware validates auth_token on all routes except public ones
- [ ] Attaches user context to request headers for downstream consumption
- [ ] Redirects to marketing website if no valid token
- [ ] Automatically attempts token refresh if access token expired but refresh token valid
- [ ] Public routes bypass authentication: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh-token`

#### Implementation

**File:** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long');

const PUBLIC_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh-token',
  '/api/health'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // No auth token - redirect to marketing site
  if (!authToken) {
    if (refreshToken) {
      // Attempt to refresh token
      return NextResponse.redirect(new URL('/api/auth/refresh-token', request.url));
    }

    return NextResponse.redirect('https://stewardtrack.com');
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(authToken, JWT_SECRET, {
      issuer: 'stewardtrack',
      audience: 'app.stewardtrack.com'
    });

    // Attach user context to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);
    requestHeaders.set('x-user-email', payload.email as string);
    requestHeaders.set('x-tenant-id', payload.tenant_id as string);
    requestHeaders.set('x-user-permissions', JSON.stringify(payload.permissions));
    requestHeaders.set('x-user-roles', JSON.stringify(payload.roles));

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch (error) {
    console.error('Token verification failed:', error);

    // Token expired or invalid - try refresh if available
    if (refreshToken) {
      return NextResponse.redirect(new URL('/api/auth/refresh-token', request.url));
    }

    // No valid tokens - redirect to marketing site
    return NextResponse.redirect('https://stewardtrack.com');
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/pages/:path*',
    '/onboarding/:path*'
  ]
};
```

---

### Story 1.7: Server Context Helpers

**As a** backend developer
**I want** utility functions to extract user context from request headers
**So that** I can easily access authenticated user data in API routes

**Priority:** P0
**Story Points:** 2

#### Implementation

**File:** `src/lib/server/auth-context.ts`

```typescript
import { headers } from 'next/headers';

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  permissions: string[];
  roles: string[];
}

/**
 * Get authenticated user context from request headers
 * (Set by middleware after JWT verification)
 */
export async function getAuthContext(): Promise<AuthContext> {
  const headersList = await headers();

  const userId = headersList.get('x-user-id');
  const email = headersList.get('x-user-email');
  const tenantId = headersList.get('x-tenant-id');
  const permissionsJson = headersList.get('x-user-permissions');
  const rolesJson = headersList.get('x-user-roles');

  if (!userId || !email || !tenantId) {
    throw new Error('UNAUTHORIZED: Missing authentication context');
  }

  return {
    userId,
    email,
    tenantId,
    permissions: permissionsJson ? JSON.parse(permissionsJson) : [],
    roles: rolesJson ? JSON.parse(rolesJson) : []
  };
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string> {
  const context = await getAuthContext();
  return context.userId;
}

/**
 * Get current tenant ID
 */
export async function getCurrentTenantId(): Promise<string> {
  const context = await getAuthContext();
  return context.tenantId;
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const context = await getAuthContext();
  return context.permissions.includes(permission);
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: string): Promise<boolean> {
  const context = await getAuthContext();
  return context.roles.includes(role);
}

/**
 * Require specific permission or throw error
 */
export async function requirePermission(permission: string): Promise<void> {
  if (!(await hasPermission(permission))) {
    throw new Error(`FORBIDDEN: Missing required permission: ${permission}`);
  }
}

/**
 * Require specific role or throw error
 */
export async function requireRole(role: string): Promise<void> {
  if (!(await hasRole(role))) {
    throw new Error(`FORBIDDEN: Missing required role: ${role}`);
  }
}
```

**Example Usage in API Route:**

```typescript
import { getAuthContext, requirePermission } from '@/lib/server/auth-context';

export async function GET(request: NextRequest) {
  // Get full auth context
  const authContext = await getAuthContext();
  console.log('User:', authContext.userId, 'Tenant:', authContext.tenantId);

  // Require specific permission
  await requirePermission('members:read');

  // ... rest of handler
}
```

---

## Environment Variables

Add to `.env.local`:

```env
# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-for-security

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Database Migrations

No new migrations required. Uses existing tables:
- `auth.users` (Supabase Auth)
- `public.tenants`
- `public.profiles`
- `public.tenant_users`
- `public.roles`
- `public.permissions`
- `public.user_roles`
- `public.onboarding_progress`

---

## Security Considerations

1. **HTTP-Only Cookies:** Prevents XSS attacks from stealing tokens
2. **Secure Flag:** Cookies only sent over HTTPS in production
3. **SameSite=Strict:** Prevents CSRF attacks
4. **Rate Limiting:** Prevents brute-force attacks
5. **Token Expiry:** Short-lived access tokens (15min) limit exposure
6. **Refresh Token Rotation:** (Optional) Rotate refresh tokens on each use
7. **Password Requirements:** Strong password policy enforced
8. **CORS Configuration:** Restrict API access to stewardtrack.com domain

**CORS Setup (if needed):**

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // ... auth logic

  const response = NextResponse.next();

  // Only allow requests from marketing website
  const origin = request.headers.get('origin');
  if (origin === 'https://stewardtrack.com') {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}
```

---

## Epic Completion Checklist

- [ ] All 7 user stories implemented
- [ ] Unit tests written for AuthService
- [ ] Integration tests for all API endpoints
- [ ] Manual testing completed
- [ ] JWT_SECRET added to production environment
- [ ] CORS configured if needed
- [ ] Rate limiting tested and tuned
- [ ] Error handling reviewed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Code review approved
- [ ] Deployed to staging environment
- [ ] QA testing passed
- [ ] Ready for beta release

---

## Next Epic

[Epic 2: Xendit Payment Integration](./epic-2-xendit-payment.md)
