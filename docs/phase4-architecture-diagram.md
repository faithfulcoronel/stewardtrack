# Phase 4: Architecture & Flow Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PUBLIC ROUTES (Unauthenticated)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /signup                    /signup/register                     │
│  ┌──────────────────┐      ┌──────────────────────┐             │
│  │ Pricing Plans    │      │ Registration Form    │             │
│  │ - Browse tiers   │──────│ - Church info        │             │
│  │ - Select plan    │      │ - Admin details      │             │
│  │ - View features  │      │ - Plan summary       │             │
│  └──────────────────┘      └──────────────────────┘             │
│                                      │                           │
│                                      ▼                           │
│                          POST /api/auth/register                 │
│                          ┌───────────────────┐                   │
│                          │ Creates:          │                   │
│                          │ • Auth user       │                   │
│                          │ • Tenant          │                   │
│                          │ • Profile         │                   │
│                          │ • 4 Roles         │                   │
│                          │ • Admin role      │                   │
│                          │ • Feature grants  │                   │
│                          └───────────────────┘                   │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   │ Redirects to onboarding
                                   │
┌──────────────────────────────────▼───────────────────────────────┐
│                   PROTECTED ROUTES (Authenticated)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /onboarding                                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Onboarding Wizard                             │ │
│  │                                                            │ │
│  │  Step 1: Welcome                                           │ │
│  │  ┌──────────────────────────────────────┐                 │ │
│  │  │ • Overview of onboarding             │                 │ │
│  │  │ • Estimated time: 5 minutes          │                 │ │
│  │  │ • Benefits of completing setup       │                 │ │
│  │  └──────────────────────────────────────┘                 │ │
│  │                    │                                       │ │
│  │                    ▼                                       │ │
│  │  Step 2: Church Details                                    │ │
│  │  ┌──────────────────────────────────────┐                 │ │
│  │  │ • Address, phone, email              │                 │ │
│  │  │ • Website, description               │                 │ │
│  │  │ • Calls: PUT /api/tenant/update      │                 │ │
│  │  └──────────────────────────────────────┘                 │ │
│  │                    │                                       │ │
│  │                    ▼                                       │ │
│  │  Step 3: RBAC Setup                                        │ │
│  │  ┌──────────────────────────────────────┐                 │ │
│  │  │ • View 4 default roles               │                 │ │
│  │  │ • Admin role highlighted             │                 │ │
│  │  │ • Guidance on customization          │                 │ │
│  │  └──────────────────────────────────────┘                 │ │
│  │                    │                                       │ │
│  │                    ▼                                       │ │
│  │  Step 4: Feature Tour                                      │ │
│  │  ┌──────────────────────────────────────┐                 │ │
│  │  │ • Licensed features by category      │                 │ │
│  │  │ • Feature counts and descriptions    │                 │ │
│  │  │ • Upgrade information                │                 │ │
│  │  └──────────────────────────────────────┘                 │ │
│  │                    │                                       │ │
│  │                    ▼                                       │ │
│  │  Step 5: Complete                                          │ │
│  │  ┌──────────────────────────────────────┐                 │ │
│  │  │ • Celebration message                │                 │ │
│  │  │ • Quick action cards                 │                 │ │
│  │  │ • Go to Dashboard button             │                 │ │
│  │  │ • Calls: POST /api/onboarding/complete│                │ │
│  │  └──────────────────────────────────────┘                 │ │
│  │                    │                                       │ │
│  │  Each step saves: POST /api/onboarding/save-progress      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                   │                            │
│                                   ▼                            │
│  /admin (Dashboard)                                            │
│  ┌──────────────────────────────────────┐                     │
│  │ Fully configured tenant              │                     │
│  │ • All features available             │                     │
│  │ • RBAC roles ready                   │                     │
│  │ • Can manage members, events, etc.   │                     │
│  └──────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence Diagram

```
User            Signup Page      Register API      Supabase DB      LicensingService    seedDefaultRBAC    Onboarding Wizard
 │                  │                  │                │                    │                  │                 │
 │  Browse plans    │                  │                │                    │                  │                 │
 ├─────────────────>│                  │                │                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │  Select plan     │                  │                │                    │                  │                 │
 ├─────────────────>│                  │                │                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │  Fill form       │                  │                │                    │                  │                 │
 ├─────────────────>│                  │                │                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │  Submit          │                  │                │                    │                  │                 │
 ├──────────────────┼─────────────────>│                │                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Create user   │                    │                  │                 │
 │                  │                  ├───────────────>│                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  User created  │                    │                  │                 │
 │                  │                  │<───────────────┤                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Create tenant │                    │                  │                 │
 │                  │                  ├───────────────>│                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Create profile│                    │                  │                 │
 │                  │                  ├───────────────>│                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Provision license                  │                  │                 │
 │                  │                  ├────────────────┼───────────────────>│                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │                │  Grant features    │                  │                 │
 │                  │                  │                │<───────────────────┤                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Seed RBAC roles                                       │                 │
 │                  │                  ├────────────────┼────────────────────┼─────────────────>│                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │                │  Create 4 roles    │                  │                 │
 │                  │                  │                │<───────────────────┼──────────────────┤                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │                │  Assign admin role │                  │                 │
 │                  │                  │                │<───────────────────┼──────────────────┤                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Success       │                    │                  │                 │
 │<─────────────────┼──────────────────┤                │                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │  Redirect to onboarding                                                                                        │
 ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────>│
 │                  │                  │                │                    │                  │                 │
 │  Complete Step 1 │                  │                │                    │                  │                 │
 ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────>│
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Save progress (step: welcome, data: {...})            │                 │
 │                  │                  │<───────────────────────────────────────────────────────────────────────────┤
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Update onboarding_progress                            │                 │
 │                  │                  ├───────────────>│                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │  Complete Step 2 │                  │                │                    │                  │                 │
 ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────>│
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Update tenant (church details)    │                  │                 │
 │                  │                  │<───────────────────────────────────────────────────────────────────────────┤
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Save tenant   │                    │                  │                 │
 │                  │                  ├───────────────>│                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │  Complete Steps 3-4 (similar flow) │                │                    │                  │                 │
 ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────>│
 │                  │                  │                │                    │                  │                 │
 │  Complete Step 5 │                  │                │                    │                  │                 │
 ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────>│
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Mark complete (is_completed: true)│                  │                 │
 │                  │                  │<───────────────────────────────────────────────────────────────────────────┤
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Update record │                    │                  │                 │
 │                  │                  ├───────────────>│                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │                  │                  │  Audit log     │                    │                  │                 │
 │                  │                  ├───────────────>│                    │                  │                 │
 │                  │                  │                │                    │                  │                 │
 │  Redirect to /admin                 │                │                    │                  │                 │
 │<────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │                  │                  │                │                    │                  │                 │
```

## Database Entity Relationships

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
├─────────────────┤
│ id (PK)         │◄────────┐
│ email           │         │
│ password_hash   │         │
│ user_metadata   │         │
└─────────────────┘         │
                            │
                            │
        ┌───────────────────┴──────────────────┐
        │                                      │
        │                                      │
┌───────▼───────┐                    ┌─────────▼────────┐
│   profiles    │                    │  tenant_users    │
├───────────────┤                    ├──────────────────┤
│ id (PK, FK)   │                    │ tenant_id (FK)   │
│ tenant_id (FK)│───────┐            │ user_id (FK)     │
│ email         │       │            │ role             │
│ first_name    │       │            └──────────────────┘
│ last_name     │       │
└───────────────┘       │
                        │
                        │
                ┌───────▼───────┐
                │   tenants     │
                ├───────────────┤
                │ id (PK)       │◄──────────────┐
                │ name          │               │
                │ subdomain     │               │
                │ address       │               │
                │ contact_number│               │
                │ email         │               │
                │ website       │               │
                │ subscription_tier             │
                └───────┬───────┘               │
                        │                       │
        ┌───────────────┼───────────────────────┼─────────────┐
        │               │                       │             │
        │               │                       │             │
┌───────▼───────┐ ┌─────▼──────────┐  ┌─────────▼────────┐  │
│  user_roles   │ │tenant_feature_│  │ onboarding_      │  │
│               │ │   grants      │  │   progress       │  │
├───────────────┤ ├───────────────┤  ├──────────────────┤  │
│ id (PK)       │ │ id (PK)       │  │ id (PK)          │  │
│ user_id (FK)  │ │ tenant_id (FK)│  │ tenant_id (FK)   │  │
│ role_id (FK)  │ │ feature_id(FK)│  │ user_id (FK)     │  │
│ tenant_id (FK)│ │ is_active     │  │ current_step     │  │
└───────┬───────┘ │ granted_at    │  │ completed_steps[]│  │
        │         └───────────────┘  │ is_completed     │  │
        │                            │ welcome_data     │  │
        │                            │ church_details_  │  │
┌───────▼───────┐                    │   data           │  │
│     roles     │                    │ rbac_setup_data  │  │
├───────────────┤                    │ feature_tour_    │  │
│ id (PK)       │                    │   data           │  │
│ code          │                    └──────────────────┘  │
│ name          │                                          │
│ description   │                                          │
│ scope         │                                          │
│ tenant_id (FK)├──────────────────────────────────────────┘
│ is_system     │
│ is_delegatable│
└───────────────┘
```

## API Endpoint Structure

```
/api
├── auth
│   └── register (POST)
│       ├── Creates auth user
│       ├── Creates tenant
│       ├── Provisions license
│       ├── Seeds RBAC
│       └── Returns { userId, tenantId }
│
├── onboarding
│   ├── save-progress (POST)
│   │   ├── Body: { step, data }
│   │   └── Updates onboarding_progress
│   │
│   └── complete (POST)
│       ├── Marks onboarding done
│       └── Logs audit event
│
├── tenant
│   ├── current (GET)
│   │   └── Returns current tenant info
│   │
│   └── update (PUT)
│       ├── Body: { address, contact_number, email, website }
│       ├── Updates tenant record
│       └── Logs audit event
│
├── rbac
│   └── roles (GET)
│       └── Returns tenant roles
│
└── licensing
    ├── product-offerings (GET)
    │   └── Returns all offerings
    │
    ├── product-offerings/:id (GET)
    │   └── Returns specific offering
    │
    └── summary (GET)
        └── Returns tenant license summary
```

## Component Hierarchy

```
App
│
├── (public)
│   └── signup
│       ├── page.tsx ────────────────────► SignupPage
│       │                                   ├── ProductOfferingCard[]
│       │                                   └── PricingGrid
│       │
│       └── register
│           └── page.tsx ─────────────────► RegisterPage
│                                           ├── RegistrationForm
│                                           └── PlanSummaryCard
│
└── (protected)
    └── onboarding
        └── page.tsx ─────────────────────► OnboardingWizard
                                            ├── ProgressBar
                                            ├── StepIndicators
                                            └── StepContent
                                                ├── WelcomeStep
                                                ├── ChurchDetailsStep
                                                ├── RBACSetupStep
                                                ├── FeatureTourStep
                                                └── CompleteStep
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                  Registration Page State                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  formData: {                                             │
│    email, password, confirmPassword,                     │
│    churchName, firstName, lastName                       │
│  }                                                       │
│                                                          │
│  errors: { field: errorMessage }                        │
│                                                          │
│  isRegistering: boolean                                 │
│                                                          │
│  selectedOffering: ProductOffering                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Submit
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Server State                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  • Auth user created                                     │
│  • Tenant record created                                 │
│  • Profile created                                       │
│  • Roles seeded                                          │
│  • Features granted                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Redirect
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Onboarding Wizard State                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  currentStep: number (0-4)                              │
│                                                          │
│  isSaving: boolean                                      │
│                                                          │
│  onboardingData: {                                      │
│    welcome_data: {...},                                 │
│    church_details_data: {...},                          │
│    rbac_setup_data: {...},                              │
│    feature_tour_data: {...}                             │
│  }                                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Each step saves
                            ▼
┌─────────────────────────────────────────────────────────┐
│              onboarding_progress Table                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  current_step: 'church-details'                         │
│  completed_steps: ['welcome', 'church-details']         │
│  is_completed: false                                    │
│  welcome_data: {...}                                    │
│  church_details_data: {...}                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Security & Authorization Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │
       │ 1. Request with cookies
       ▼
┌──────────────────────────────┐
│  Supabase Server Client      │
│  (createSupabaseServerClient)│
└──────┬───────────────────────┘
       │
       │ 2. Verify JWT token
       ▼
┌──────────────────────────────┐
│  Auth User Verification      │
│  - Get user from session     │
│  - Check if authenticated    │
└──────┬───────────────────────┘
       │
       │ 3. Get user's tenant
       ▼
┌──────────────────────────────┐
│  Tenant Context Resolution   │
│  - Query tenant_users table  │
│  - Get tenant_id for user_id │
└──────┬───────────────────────┘
       │
       │ 4. Filter by tenant
       ▼
┌──────────────────────────────┐
│  Database Query with RLS     │
│  - WHERE tenant_id = ?       │
│  - RLS policies enforce      │
│  - Row-level isolation       │
└──────┬───────────────────────┘
       │
       │ 5. Return filtered data
       ▼
┌──────────────┐
│   Response   │
└──────────────┘
```

## Error Handling Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  try {                                                    │
│    setIsLoading(true);                                   │
│                                                           │
│    const response = await fetch('/api/endpoint');        │
│    const result = await response.json();                 │
│                                                           │
│    if (result.success) {                                 │
│      toast.success('Success message');                   │
│      // Handle success                                   │
│    } else {                                              │
│      toast.error(result.error || 'Failed');              │
│    }                                                      │
│                                                           │
│  } catch (error) {                                       │
│    console.error('Error:', error);                       │
│    toast.error('Operation failed');                      │
│                                                           │
│  } finally {                                             │
│    setIsLoading(false); // Always reset                 │
│  }                                                        │
│                                                           │
└──────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                  Backend API (Next.js)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  try {                                                    │
│    // Validate input                                     │
│    if (!requiredField) {                                 │
│      return NextResponse.json(                           │
│        { success: false, error: 'Missing field' },       │
│        { status: 400 }                                   │
│      );                                                   │
│    }                                                      │
│                                                           │
│    // Perform operation                                  │
│    const result = await service.operation();             │
│                                                           │
│    return NextResponse.json({                            │
│      success: true,                                      │
│      data: result                                        │
│    });                                                    │
│                                                           │
│  } catch (error) {                                       │
│    console.error('Error:', error);                       │
│                                                           │
│    return NextResponse.json(                             │
│      {                                                    │
│        success: false,                                   │
│        error: error.message || 'Internal error'          │
│      },                                                   │
│      { status: 500 }                                     │
│    );                                                     │
│  }                                                        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Visual Key

```
┌─────┐
│ Box │  = Component, Page, or System
└─────┘

  │
  ▼      = Data/Control flow

 ───►    = API call or redirect

 (FK)    = Foreign key relationship

 [...]   = Array/Collection
```

---

These diagrams provide a comprehensive visual understanding of Phase 4's architecture, data flow, and system interactions.
