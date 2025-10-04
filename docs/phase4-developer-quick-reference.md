# Phase 4: Developer Quick Reference Guide

## Quick Start

### 1. Apply Database Migration
```bash
cd C:\Users\CortanatechSolutions\source\repos\github\stewardtrack
npx supabase db push
```

### 2. Verify Tables Created
```sql
-- Check onboarding_progress table exists
SELECT * FROM onboarding_progress LIMIT 1;

-- Should show: id, tenant_id, user_id, current_step, completed_steps, is_completed, etc.
```

### 3. Test the Flow
```bash
npm run dev
# Navigate to http://localhost:3000/signup
```

---

## File Locations Quick Reference

### Components (Step UI)
```
C:\Users\CortanatechSolutions\source\repos\github\stewardtrack\src\components\onboarding\
├── WelcomeStep.tsx
├── ChurchDetailsStep.tsx
├── RBACSetupStep.tsx
├── FeatureTourStep.tsx
└── CompleteStep.tsx
```

### Pages (Routes)
```
C:\Users\CortanatechSolutions\source\repos\github\stewardtrack\src\app\
├── (public)
│   └── signup
│       ├── page.tsx               # Pricing plans
│       └── register
│           └── page.tsx           # Registration form
│
└── (protected)
    └── onboarding
        └── page.tsx               # Onboarding wizard
```

### API Endpoints
```
C:\Users\CortanatechSolutions\source\repos\github\stewardtrack\src\app\api\
├── auth
│   └── register
│       └── route.ts               # POST - Create account
│
├── onboarding
│   ├── save-progress
│   │   └── route.ts               # POST - Save step
│   └── complete
│       └── route.ts               # POST - Mark complete
│
└── tenant
    ├── current
    │   └── route.ts               # GET - Get tenant
    └── update
        └── route.ts               # PUT - Update tenant
```

### Database
```
C:\Users\CortanatechSolutions\source\repos\github\stewardtrack\supabase\migrations\
└── 20251218001012_create_onboarding_progress.sql
```

---

## API Reference

### POST /api/auth/register

**Purpose**: Create new tenant account

**Request**:
```json
{
  "email": "pastor@church.org",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123",
  "churchName": "First Community Church",
  "firstName": "John",
  "lastName": "Doe",
  "offeringId": "uuid-of-selected-plan"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "tenantId": "uuid",
    "subdomain": "first-community-church",
    "message": "Registration successful"
  }
}
```

**Creates**:
- Auth user
- Tenant record
- User profile
- 4 RBAC roles (admin, staff, volunteer, member)
- Tenant admin role assignment
- License feature grants

---

### POST /api/onboarding/save-progress

**Purpose**: Save onboarding step progress

**Request**:
```json
{
  "step": "church-details",
  "data": {
    "address": "123 Main St",
    "contact_number": "+1 555-1234",
    "email": "info@church.org",
    "website": "https://church.org"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "step": "church-details",
    "message": "Progress saved successfully"
  }
}
```

**Updates**:
- `current_step` field
- Adds step to `completed_steps` array
- Stores data in appropriate JSONB field

---

### POST /api/onboarding/complete

**Purpose**: Mark onboarding as complete

**Request**: Empty body

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Onboarding completed successfully",
    "completed_at": "2025-10-04T12:00:00.000Z"
  }
}
```

**Updates**:
- Sets `is_completed = true`
- Sets `completed_at` timestamp
- Sets `current_step = 'complete'`
- Creates audit log entry

---

### GET /api/tenant/current

**Purpose**: Get current tenant information

**Request**: No body (uses auth session)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "First Community Church",
    "subdomain": "first-community-church",
    "address": "123 Main St",
    "contact_number": "+1 555-1234",
    "email": "info@church.org",
    "website": "https://church.org",
    "subscription_tier": "professional",
    "subscription_status": "active",
    "created_at": "2025-10-04T12:00:00.000Z"
  }
}
```

---

### PUT /api/tenant/update

**Purpose**: Update tenant profile information

**Request**:
```json
{
  "address": "456 New Address",
  "contact_number": "+1 555-9999",
  "email": "newemail@church.org",
  "website": "https://newsite.org",
  "logo_url": "https://cdn.example.com/logo.png"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "First Community Church",
    "address": "456 New Address",
    // ... updated fields
  },
  "message": "Tenant updated successfully"
}
```

**Creates**:
- Audit log entry with changes

---

## Database Schema Reference

### onboarding_progress Table

```sql
CREATE TABLE onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress tracking
  current_step text NOT NULL DEFAULT 'welcome',
  completed_steps text[] DEFAULT '{}',
  is_completed boolean DEFAULT false,
  completed_at timestamptz,

  -- Step data storage (JSONB)
  welcome_data jsonb DEFAULT '{}',
  church_details_data jsonb DEFAULT '{}',
  rbac_setup_data jsonb DEFAULT '{}',
  feature_tour_data jsonb DEFAULT '{}',

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_tenant_onboarding UNIQUE(tenant_id),
  CONSTRAINT valid_step CHECK (current_step IN ('welcome', 'church-details', 'rbac-setup', 'feature-tour', 'complete'))
);
```

**Indexes**:
- `idx_onboarding_progress_tenant_id` on `tenant_id`
- `idx_onboarding_progress_user_id` on `user_id`
- `idx_onboarding_progress_is_completed` on `is_completed`

**RLS Policies**:
- Users can SELECT their own tenant's progress
- Users can INSERT progress for their tenant
- Users can UPDATE their own tenant's progress

---

## Common SQL Queries

### Check User's Onboarding Status
```sql
SELECT
  t.name as church_name,
  op.current_step,
  op.is_completed,
  op.completed_at,
  array_length(op.completed_steps, 1) as steps_completed,
  op.created_at as started_at
FROM onboarding_progress op
JOIN tenants t ON t.id = op.tenant_id
JOIN auth.users u ON u.id = op.user_id
WHERE u.email = 'pastor@church.org';
```

### Get All Incomplete Onboarding
```sql
SELECT
  t.name,
  t.subdomain,
  op.current_step,
  op.created_at,
  NOW() - op.created_at as time_elapsed
FROM onboarding_progress op
JOIN tenants t ON t.id = op.tenant_id
WHERE op.is_completed = false
ORDER BY op.created_at DESC;
```

### Verify Registration Completeness
```sql
SELECT
  u.email,
  t.name as tenant_name,
  t.subscription_tier,
  (SELECT COUNT(*) FROM roles WHERE tenant_id = t.id) as role_count,
  (SELECT COUNT(*) FROM user_roles ur WHERE ur.user_id = u.id) as user_role_count,
  (SELECT COUNT(*) FROM tenant_feature_grants WHERE tenant_id = t.id) as feature_count,
  op.is_completed as onboarding_complete
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN tenants t ON t.id = p.tenant_id
LEFT JOIN onboarding_progress op ON op.tenant_id = t.id
WHERE u.email = 'pastor@church.org';
```

**Expected Results**:
- `role_count`: 4 (admin, staff, volunteer, member)
- `user_role_count`: 1 (tenant admin)
- `feature_count`: Varies by plan (10-25+)
- `onboarding_complete`: true (after wizard completion)

### Get Onboarding Analytics
```sql
SELECT
  DATE(op.created_at) as signup_date,
  COUNT(*) as total_signups,
  COUNT(*) FILTER (WHERE op.is_completed = true) as completed,
  COUNT(*) FILTER (WHERE op.is_completed = false) as incomplete,
  ROUND(
    COUNT(*) FILTER (WHERE op.is_completed = true)::numeric / COUNT(*)::numeric * 100,
    2
  ) as completion_rate_percent
FROM onboarding_progress op
GROUP BY DATE(op.created_at)
ORDER BY signup_date DESC
LIMIT 30;
```

---

## Component Props Reference

### Onboarding Step Component Interface

All step components implement this interface:

```typescript
interface OnboardingStepProps {
  data: Record<string, any>;           // Current onboarding data
  onNext: (data: any) => Promise<void>;// Save and go to next step
  onBack: () => void;                  // Go to previous step
  onComplete: () => Promise<void>;     // Complete onboarding (last step)
  isSaving: boolean;                   // Is API call in progress
  isFirstStep: boolean;                // Is this step 1
  isLastStep: boolean;                 // Is this step 5
}
```

### Example Step Component Usage

```typescript
// In your step component
export default function MyStep({
  data,
  onNext,
  isSaving,
}: OnboardingStepProps) {
  const [formData, setFormData] = useState({ /* ... */ });

  async function handleContinue() {
    // onNext will:
    // 1. Save to state
    // 2. Call save-progress API
    // 3. Move to next step
    await onNext({ my_step_data: formData });
  }

  return (
    <div>
      {/* Your UI */}
      <Button onClick={handleContinue} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </div>
  );
}
```

---

## Common Development Tasks

### Add a New Onboarding Step

1. **Create component**:
   ```typescript
   // src/components/onboarding/MyNewStep.tsx
   import { useState } from 'react';
   import { Button } from '@/components/ui/button';
   import { Loader2 } from 'lucide-react';

   interface MyNewStepProps {
     data: Record<string, any>;
     onNext: (data: any) => Promise<void>;
     isSaving: boolean;
   }

   export default function MyNewStep({ onNext, isSaving }: MyNewStepProps) {
     async function handleContinue() {
       await onNext({ my_new_step_data: { /* ... */ } });
     }

     return (
       <div>
         {/* Your content */}
         <Button onClick={handleContinue} disabled={isSaving}>
           Continue
         </Button>
       </div>
     );
   }
   ```

2. **Add to wizard**:
   ```typescript
   // src/app/(protected)/onboarding/page.tsx
   import MyNewStep from '@/components/onboarding/MyNewStep';

   const STEPS = [
     { id: 'welcome', title: 'Welcome', component: WelcomeStep },
     { id: 'my-new-step', title: 'My Step', component: MyNewStep }, // ADD
     { id: 'church-details', title: 'Church Details', component: ChurchDetailsStep },
     // ... rest
   ];
   ```

3. **Update migration**:
   ```sql
   -- Add new JSONB field
   ALTER TABLE onboarding_progress ADD COLUMN my_new_step_data jsonb DEFAULT '{}';

   -- Update constraint
   ALTER TABLE onboarding_progress DROP CONSTRAINT valid_step;
   ALTER TABLE onboarding_progress ADD CONSTRAINT valid_step
     CHECK (current_step IN ('welcome', 'my-new-step', 'church-details', ...));
   ```

---

### Customize Default Roles

Edit `src/lib/tenant/seedDefaultRBAC.ts`:

```typescript
const defaultRoles = [
  {
    code: 'tenant_admin',
    name: 'Tenant Administrator',
    description: 'Full administrative access to all features',
    scope: 'tenant' as const,
    is_system: false,
    is_delegatable: false,
    tenant_id: tenantId,
  },
  // ADD YOUR CUSTOM ROLE
  {
    code: 'custom_role',
    name: 'Custom Role',
    description: 'My custom role description',
    scope: 'tenant' as const,
    is_system: false,
    is_delegatable: true,
    tenant_id: tenantId,
  },
];
```

---

### Add Field to Tenant Update

1. **Update API**:
   ```typescript
   // src/app/api/tenant/update/route.ts
   interface UpdateTenantRequest {
     // ... existing fields
     my_new_field?: string; // ADD
   }

   // In PUT handler
   if (my_new_field !== undefined) updates.my_new_field = my_new_field;
   ```

2. **Update Component**:
   ```typescript
   // src/components/onboarding/ChurchDetailsStep.tsx
   const [formData, setFormData] = useState({
     // ... existing fields
     my_new_field: '', // ADD
   });

   // In JSX
   <Input
     id="my_new_field"
     value={formData.my_new_field}
     onChange={(e) => handleInputChange('my_new_field', e.target.value)}
   />
   ```

3. **Update Migration** (if new column):
   ```sql
   ALTER TABLE tenants ADD COLUMN my_new_field text;
   ```

---

## Debugging Tips

### Check Registration Process

1. **Open browser DevTools → Network tab**
2. **Submit registration form**
3. **Check `/api/auth/register` response**:
   - Should be 201 status
   - Should have `success: true`
   - Should return `userId`, `tenantId`, `subdomain`

4. **If error, check**:
   - Console for error messages
   - Response body for error details
   - Supabase auth dashboard for user creation
   - Database for tenant record

### Check Onboarding Save Progress

1. **Open DevTools → Network tab**
2. **Click "Continue" on any step**
3. **Check `/api/onboarding/save-progress` request**:
   - Should be POST
   - Body should have `{ step: "...", data: {...} }`
4. **Check response**:
   - Should be 200 status
   - Should have `success: true`

5. **Verify in database**:
   ```sql
   SELECT * FROM onboarding_progress
   WHERE tenant_id = 'your-tenant-id';
   ```
   - `current_step` should update
   - `completed_steps` array should grow
   - Relevant `*_data` field should have content

### Common Errors

**Error**: "No tenant context available"
- **Cause**: User not authenticated or session expired
- **Fix**: Check auth status, re-login if needed

**Error**: "Tenant not found"
- **Cause**: tenant_users record missing
- **Fix**: Check if registration completed successfully

**Error**: "Failed to save progress"
- **Cause**: RLS policy blocking or invalid data
- **Fix**: Check user has tenant access, verify step name

**Error**: "Passwords do not match"
- **Cause**: Form validation
- **Fix**: Ensure password and confirmPassword match

---

## Testing Checklist

### Manual Testing

- [ ] Visit `/signup` - all plans display
- [ ] Click "Choose Plan" - redirects to `/signup/register?offering=...`
- [ ] Fill all form fields correctly
- [ ] Submit registration - creates account
- [ ] Verify redirect to `/onboarding`
- [ ] Complete Step 1 (Welcome)
- [ ] Complete Step 2 (Church Details) - form saves
- [ ] Complete Step 3 (RBAC Setup) - roles display
- [ ] Complete Step 4 (Feature Tour) - features display
- [ ] Complete Step 5 (Complete) - redirect to dashboard
- [ ] Verify in database all records created

### Database Verification

```sql
-- After registration
SELECT COUNT(*) FROM roles WHERE tenant_id = 'your-tenant-id'; -- Should be 4
SELECT COUNT(*) FROM user_roles WHERE user_id = 'your-user-id'; -- Should be 1
SELECT COUNT(*) FROM tenant_feature_grants WHERE tenant_id = 'your-tenant-id'; -- Should be > 0

-- After onboarding
SELECT is_completed FROM onboarding_progress WHERE tenant_id = 'your-tenant-id'; -- Should be true
```

### Error Scenario Testing

- [ ] Submit registration with invalid email
- [ ] Submit with mismatched passwords
- [ ] Test duplicate church name (subdomain collision)
- [ ] Disconnect network during step save
- [ ] Skip onboarding and verify dashboard works
- [ ] Return to onboarding after partial completion

---

## Performance Benchmarks

**Expected Performance**:
- Registration API: < 2 seconds
- Onboarding step save: < 500ms
- Feature tour load: < 1 second
- Total signup to dashboard: < 30 seconds

**Monitor**:
```javascript
console.time('Registration');
// ... registration call
console.timeEnd('Registration');
```

---

## Next Steps After Phase 4

1. **Deploy Migration**: `npx supabase db push` on production
2. **Test Flow**: Complete end-to-end test on staging
3. **Monitor**: Set up analytics for onboarding completion rate
4. **Iterate**: Gather user feedback, improve UX
5. **Phase 5**: Implement email verification, permission bundles, team invitations

---

## Support Resources

- **Full Report**: `docs/phase4-tenant-subscription-onboarding-report.md`
- **Architecture Diagrams**: `docs/phase4-architecture-diagram.md`
- **Guidelines**: `docs/guidelines/CLAUDE_AI_GUIDELINES.md`
- **Summary**: `PHASE_4_SUMMARY.md`

---

**Quick Reference Version**: 1.0
**Last Updated**: 2025-10-04
