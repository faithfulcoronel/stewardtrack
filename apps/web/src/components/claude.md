# Components Directory - Architecture & Patterns

## Overview

The `components/` directory contains **React UI components** for StewardTrack. Components range from foundational UI primitives (shadcn/ui) to complex domain-specific workflows (RBAC wizards, licensing dashboards).

**Key Principle:** Components are organized by scope (UI library, domain, metadata-driven) and follow composition patterns.

## Directory Structure

```
src/components/
├── ui/                          # shadcn/ui components (primitives)
├── admin/                       # Admin panel domain components
│   ├── rbac/                    # RBAC management components
│   ├── licensing/               # Licensing studio components
│   └── user-member-link/        # User-member linking
├── dynamic/                     # Metadata-driven components
│   └── admin/                   # Admin-specific dynamic components
├── marketing/                   # Marketing/public site components
├── onboarding/                  # Onboarding wizard steps
├── theme/                       # Theme switching components
└── docs/                        # Documentation components
```

## Component Categories

### 1. UI Primitives (`ui/`)

Foundation components from **shadcn/ui** - a collection of reusable, accessible components built with Radix UI and Tailwind CSS.

**Key Components:**
- **Forms:** `button.tsx`, `input.tsx`, `select.tsx`, `form.tsx`, `checkbox.tsx`
- **Layout:** `card.tsx`, `dialog.tsx`, `sheet.tsx`, `separator.tsx`, `tabs.tsx`
- **Data Display:** `table.tsx`, `datatable.tsx`, `datagrid.tsx`, `badge.tsx`
- **Feedback:** `alert.tsx`, `progress.tsx`, `spinner.tsx`, `tooltip.tsx`, `sonner.tsx` (toast)
- **Navigation:** `breadcrumb.tsx`, `navigation-menu.tsx`, `pagination.tsx`

**Pattern:** Primitives are headless (Radix UI) + styled (Tailwind)

```typescript
// Example: Button component
import { Button } from '@/components/ui/button';

<Button variant="default" size="md">
  Click me
</Button>
```

**Variants:**
- **Button:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- **Card:** `default`, `elevated`, `outlined`
- **Badge:** `default`, `secondary`, `destructive`, `outline`

**Best Practice:** Use UI primitives for all basic UI needs instead of custom components.

### 2. Admin Domain Components (`admin/`)

Complex, domain-specific components for administrative functions.

#### RBAC Components (`admin/rbac/`)

**RoleCreationWizard.tsx** - 4-Step Role Creation Wizard
- Step 1: Basic Info (name, description, scope)
- Step 2: Assign Permissions (direct permission assignment)
- Step 3: Link Users (optional user assignment)
- Step 4: Review & Create

```typescript
import { RoleCreationWizard } from '@/components/admin/rbac/RoleCreationWizard';

<RoleCreationWizard
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onComplete={() => {
    setIsOpen(false);
    refetchRoles();
  }}
/>
```

**Pattern: Wizard State Management**
```typescript
const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState<RoleFormData>({
  name: '',
  description: '',
  scope: 'tenant',
  is_delegatable: false,
  selectedPermissions: [],
  selectedUsers: [],
});

const updateFormData = (data: Partial<RoleFormData>) => {
  setFormData(prev => ({ ...prev, ...data }));
};
```

**Other RBAC Components:**
- **RbacDashboard.tsx** - Main RBAC overview dashboard (removed in simplification)
- **DelegateAccessDashboard.tsx** - Role-based delegation UI
- **RoleExplorer.tsx** - Role browsing and management
- **UserManagement.tsx** - User-role assignment interface

#### Licensing Components (`admin/licensing/`)

**LicenseAssignmentsManager.tsx** - Licensing Studio
- Tenant selection for license assignment
- Product offering selection
- Feature change preview
- License assignment with notes

**LicenseHistoryPanel.tsx** - Assignment History
- Historical license changes per tenant
- Assigned by, date, notes
- Feature grant/revoke tracking

**AssignLicenseDialog.tsx** - Modal Workflow
```typescript
import { AssignLicenseDialog } from '@/components/admin/licensing/AssignLicenseDialog';

<AssignLicenseDialog
  tenantId={selectedTenant.id}
  currentOffering={selectedTenant.current_offering}
  onAssignmentComplete={handleRefresh}
  open={isOpen}
  onOpenChange={setIsOpen}
/>
```

### 3. Dynamic/Metadata Components (`dynamic/`)

Components designed to be **driven by metadata definitions** (XML → JSON → React).

**Admin Dynamic Components** (`dynamic/admin/`)

- **AdminDataGridSection.tsx** - Data tables driven by metadata
- **AdminFormSection.tsx** - Forms driven by metadata field definitions
- **AdminDetailPanels.tsx** - Detail views from metadata
- **AdminMetricCards.tsx** - KPI cards from metadata
- **AdminActivityTimeline.tsx** - Activity feeds from metadata
- **AdminLookupQuickCreate.tsx** - Inline create dialogs

**Pattern: Metadata-Driven Rendering**
```typescript
interface AdminFormSectionProps {
  metadata: FormMetadata; // From resolved XML
  dataSource: any;
  onSubmit: (data: any) => Promise<void>;
}

export function AdminFormSection({ metadata, dataSource, onSubmit }: AdminFormSectionProps) {
  // Render form fields based on metadata.fields
  return (
    <Form>
      {metadata.fields.map(field => (
        <FormField key={field.id} {...field} />
      ))}
    </Form>
  );
}
```

**Key Benefit:** Components adapt to metadata changes without code modifications.

### 4. Marketing Components (`marketing/`)

Public-facing components for marketing pages:

- **Hero.tsx** - Hero sections with CTA
- **FeatureCard.tsx** - Feature showcase cards
- **PricingCard.tsx** - Pricing tier cards
- **TestimonialCard.tsx** - Customer testimonials
- **FAQ.tsx** - FAQ accordion
- **StatsSection.tsx** - Statistics display

**Pattern: Presentational Components**
```typescript
interface HeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export function Hero({ title, subtitle, ctaText, ctaLink }: HeroProps) {
  return (
    <section className="hero">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <Button asChild>
        <Link href={ctaLink}>{ctaText}</Link>
      </Button>
    </section>
  );
}
```

### 5. Onboarding Components (`onboarding/`)

Multi-step wizard for tenant onboarding:

- **WelcomeStep.tsx** - Step 1: Welcome screen
- **ChurchDetailsStep.tsx** - Step 2: Church information form
- **RBACSetupStep.tsx** - Step 3: Initial RBAC configuration
- **CompleteStep.tsx** - Step 4: Completion and next steps

**Pattern: Step Components**
```typescript
interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  updateProgress: (data: any) => Promise<void>;
  initialData?: any;
}

export function ChurchDetailsStep({ onNext, updateProgress, initialData }: StepProps) {
  const handleSubmit = async (data: ChurchDetails) => {
    await updateProgress({ church_details: data });
    onNext();
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 6. Theme Components (`theme/`)

Theme customization and switching:

- **theme-provider.tsx** - Next-themes provider wrapper
- **theme-mode-toggle.tsx** - Light/dark mode toggle
- **theme-switcher.tsx** - Theme variant selector
- **theme-floater.tsx** - Floating theme switcher widget

**Pattern: Theme Context**
```typescript
import { ThemeProvider } from '@/components/theme/theme-provider';

// In layout.tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>

// In components
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
```

## Key Patterns

### Pattern 1: Client vs Server Components

**Client Components** (`'use client'`)
- Interactive components with hooks, state, event handlers
- Required for: forms, dialogs, interactive dashboards

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>Count: {count}</Button>;
}
```

**Server Components** (default)
- Data fetching, database queries
- No state, no event handlers
- Better performance (less JS shipped to client)

```typescript
// No 'use client' directive
import { createClient } from '@/lib/supabase/server';

export async function MyServerComponent() {
  const supabase = await createClient();
  const { data } = await supabase.from('roles').select('*');

  return <div>{data.map(role => <div key={role.id}>{role.name}</div>)}</div>;
}
```

**Rule of Thumb:**
- Use **server components** by default
- Only add `'use client'` when you need interactivity

### Pattern 2: Composition Over Props Drilling

**Bad: Props Drilling**
```typescript
function Parent() {
  return <Child theme={theme} user={user} tenant={tenant} />;
}

function Child({ theme, user, tenant }) {
  return <GrandChild theme={theme} user={user} tenant={tenant} />;
}
```

**Good: Composition**
```typescript
function Parent() {
  return (
    <ThemeProvider theme={theme}>
      <UserProvider user={user}>
        <TenantProvider tenant={tenant}>
          <Child />
        </TenantProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

function Child() {
  const theme = useTheme();
  const user = useUser();
  const tenant = useTenant();
  // ...
}
```

### Pattern 3: Form Handling with react-hook-form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const response = await fetch('/api/my-resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to submit');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Pattern 4: Dialog/Modal Components

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function MyDialog({ open, onOpenChange, onComplete }: MyDialogProps) {
  const handleSubmit = async () => {
    // ... submit logic
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>My Dialog</DialogTitle>
        </DialogHeader>
        {/* Dialog content */}
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 5: Data Fetching in Client Components

**Option 1: useEffect + fetch**
```typescript
'use client';

import { useEffect, useState } from 'react';

export function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/my-resource')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{data.name}</div>;
}
```

**Option 2: SWR (recommended)**
```typescript
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function MyComponent() {
  const { data, error, isLoading } = useSWR('/api/my-resource', fetcher);

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;
  return <div>{data.name}</div>;
}
```

### Pattern 6: Toast Notifications

```typescript
import { toast } from 'sonner';

const handleSubmit = async () => {
  try {
    await fetch('/api/my-resource', { method: 'POST', body: JSON.stringify(data) });
    toast.success('Successfully created!');
  } catch (error) {
    toast.error('Failed to create');
  }
};
```

## Best Practices

### 1. Component Organization

**File Naming:**
- Use **PascalCase** for component files: `RoleCreationWizard.tsx`
- Use **kebab-case** for UI primitives: `button.tsx`, `dialog.tsx`
- Co-locate related components in subdirectories

**Component Structure:**
```typescript
// 1. Imports
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export function MyComponent({ title, onSubmit }: MyComponentProps) {
  // 4. Hooks (useState, useEffect, etc.)
  const [isLoading, setIsLoading] = useState(false);

  // 5. Event Handlers
  const handleClick = () => {
    setIsLoading(true);
    onSubmit();
  };

  // 6. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick} disabled={isLoading}>
        Submit
      </Button>
    </div>
  );
}
```

### 2. TypeScript

**Always type props:**
```typescript
// BAD
export function MyComponent({ data, onSubmit }) { ... }

// GOOD
interface MyComponentProps {
  data: MyData;
  onSubmit: (data: MyData) => Promise<void>;
}

export function MyComponent({ data, onSubmit }: MyComponentProps) { ... }
```

### 3. Accessibility

**Use semantic HTML:**
```typescript
// BAD
<div onClick={handleClick}>Click me</div>

// GOOD
<button onClick={handleClick}>Click me</button>
```

**Use ARIA attributes:**
```typescript
<Button
  aria-label="Close dialog"
  aria-disabled={isLoading}
>
  Close
</Button>
```

### 4. Performance

**Memoize expensive computations:**
```typescript
import { useMemo } from 'react';

const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);
```

**Lazy load heavy components:**
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
});
```

### 5. Styling

**Use Tailwind utility classes:**
```typescript
<div className="flex items-center gap-4 px-6 py-4">
  <Button className="bg-blue-500 hover:bg-blue-600">
    Submit
  </Button>
</div>
```

**Use cn() for conditional classes:**
```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'rounded-lg border p-4',
  isActive && 'bg-blue-100',
  isError && 'border-red-500'
)}>
  Content
</div>
```

## Anti-Patterns to Avoid

❌ **Mixing Client and Server Logic**
```typescript
'use client';

// BAD: Server-side Supabase client in client component
import { createClient } from '@/lib/supabase/server'; // ❌ Exposes service key
```

✅ **Separate Concerns**
```typescript
'use client';

import { createClient } from '@/lib/supabase/client'; // ✅ Client-safe
```

❌ **Prop Drilling**
```typescript
// BAD: Passing props through 5 levels
<Parent theme={theme}>
  <Child theme={theme}>
    <GrandChild theme={theme} />
  </Child>
</Parent>
```

✅ **Use Context**
```typescript
// GOOD: Context provider
<ThemeProvider theme={theme}>
  <Parent>
    <Child>
      <GrandChild />
    </Child>
  </Parent>
</ThemeProvider>
```

❌ **Inline Functions in Render**
```typescript
// BAD: Creates new function on every render
<Button onClick={() => handleClick(id)}>Click</Button>
```

✅ **Memoized Callbacks**
```typescript
// GOOD: Memoized callback
const handleClick = useCallback(() => {
  handleSubmit(id);
}, [id, handleSubmit]);

<Button onClick={handleClick}>Click</Button>
```

## Testing Components

**Current State:** No automated tests configured.

**Recommended Testing Approach:**
1. **Unit Tests:** Test component logic in isolation
2. **Integration Tests:** Test component interactions
3. **Visual Tests:** Storybook for component gallery

```typescript
// Example test (when testing framework is added)
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should call onSubmit when button is clicked', () => {
    const mockSubmit = jest.fn();
    render(<MyComponent onSubmit={mockSubmit} />);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});
```

## Metadata Component Registration

To use a component in metadata-driven pages:

1. **Create Component**
```typescript
// src/components/dynamic/admin/MyNewComponent.tsx
export function MyNewComponent({ data }: { data: any }) {
  return <div>{data.title}</div>;
}
```

2. **Register in Component Registry**
```typescript
// src/lib/metadata/component-registry.ts
import { MyNewComponent } from '@/components/dynamic/admin/MyNewComponent';

export const componentRegistry = {
  'MyNewComponent': MyNewComponent,
};
```

3. **Use in XML Metadata**
```xml
<component type="MyNewComponent">
  <dataBinding property="data" source="myDataSource" />
</component>
```

4. **Compile Metadata**
```bash
npm run metadata:compile
```

## Related Documentation

- **UI Primitives:** shadcn/ui documentation (https://ui.shadcn.com)
- **Metadata System:** `metadata/authoring/claude.md`
- **Component Registry:** `src/lib/metadata/component-registry.ts`
- **Styling:** Tailwind CSS (https://tailwindcss.com)
