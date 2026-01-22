# Onboarding Revamp Implementation Plan

## Overview

Transform the current onboarding experience into a streamlined, visually engaging 3-step wizard that focuses on essential setup tasks while providing a "wow factor" through modern animations and design.

## Current State Analysis

### What Exists
- Onboarding progress tracking in database (`onboarding_progress` table)
- Member invitation system via `UserMemberLinkService`
- Email templates using Resend API (`InviteEmail.tsx`)
- Supabase Storage bucket `profiles` for image uploads
- Excel export functionality (SheetJS library)
- Motion library v12 for animations
- 12 hero variants in `HeroSection.tsx`
- Wizard patterns in `RbacOnboarding.tsx`
- Multi-theme system with dark mode support

### What Needs to Change
- Remove: Feature showcase step, church details collection, payment step
- Add: Team invitation with roles, Excel member import, church picture upload
- Enhance: Visual design with animations, vectors, mobile-first approach

## New Onboarding Flow

### Step 1: Invite Your Team (Optional, Skippable)
**Purpose:** Allow tenant admins to invite church leadership with pre-assigned roles

**Features:**
- Role-based invitation cards with visual role descriptions
- Bulk invitation support (up to 10 invites at once)
- Pre-defined role templates: Pastor, Administrator, Finance Manager, Ministry Leader, Volunteer Coordinator
- Email preview before sending
- Skip option for solo setup

**Technical Implementation:**
- Extended `MemberInvitationService` to accept role pre-assignment via `assigned_role_id`
- Create `TeamInvitationCard` component with role selector
- Use existing `InviteEmail.tsx` template with role context
- Store pending role assignments in invitation metadata
- On registration: create member record + assign role automatically (via database function)

### Step 2: Import Your Members (Optional, Skippable)
**Purpose:** Bulk import existing church records via Excel

**Features:**
- Download sample Excel template with pre-filled example data
- Drag-and-drop upload zone with progress indicator
- Preview imported data before confirmation
- Validation with clear error messages
- Column mapping for flexibility

**Excel Template Sheets:**

1. **Members** (Tab 1)
   - First Name (required)
   - Middle Name
   - Last Name (required)
   - Email
   - Contact Number
   - Address (Street, City, State/Province, Postal Code, Country)
   - Birthdate (YYYY-MM-DD format)
   - Membership Status (references Membership Status tab)

2. **Membership Status** (Tab 2) - Reference data with defaults
   - Name (required)
   - Description
   - Pre-filled defaults:
     - Active
     - Inactive
     - Visitor
     - New Member
     - Transferred
     - Deceased

3. **Financial Sources** (Tab 3)
   - Name (required)
   - Purpose/Description
   - Examples: Main Bank Account, Petty Cash, Online Giving

4. **Funds** (Tab 4)
   - Name (required)
   - Purpose/Description
   - Type (restricted/unrestricted)
   - Examples: General Fund, Building Fund, Mission Fund

5. **Income Categories** (Tab 5)
   - Name (required)
   - Purpose/Description
   - Examples: Tithes, Offerings, Donations, Events

6. **Expense Categories** (Tab 6)
   - Name (required)
   - Purpose/Description
   - Examples: Salaries, Utilities, Maintenance, Events

7. **Budget Categories** (Tab 7)
   - Name (required)
   - Purpose/Description

8. **Opening Balances** (Tab 8)
   - Fund Name (references Funds tab)
   - Amount
   - As-of Date

**Auto-Created (NOT in Excel - Handled by System):**
- **Chart of Accounts** - Auto-create standard church accounting structure:
  - 1000s - Assets (Cash, Bank)
  - 2000s - Liabilities
  - 3000s - Equity (Fund Balances)
  - 4000s - Revenue (linked to Income Categories)
  - 5000s - Expenses (linked to Expense Categories)
- **Fiscal Year** - Auto-create based on tenant registration date

**Removed from Excel (Simplified):**
- Families (too complex for initial setup)

**Import Flow:**
1. User downloads sample template
2. User fills in their data (most tabs are optional)
3. User uploads filled template
4. System validates and shows preview
5. User confirms import
6. System processes:
   - Creates membership status records (or uses defaults)
   - Creates financial sources → auto-links to Asset COA accounts
   - Creates funds → auto-links to Equity COA accounts (3xxx)
   - Creates income categories → auto-links to Revenue COA (4xxx)
   - Creates expense categories → auto-links to Expense COA (5xxx)
   - Creates budget categories
   - Creates member records with status references
   - Creates opening balance records (linked to fiscal year + funds)

### Step 3: Personalize Your Church (Required)
**Purpose:** Upload church branding for hero section

**Features:**
- Image upload with size recommendations (1920x1080 for desktop hero)
- Live preview showing how image will appear in hero
- Crop/resize tool for optimal fit
- Default placeholder if skipped
- Image optimization on upload

**Technical Implementation:**
- Use Supabase Storage `profiles` bucket with tenant isolation
- Create `ChurchImageUpload` component with preview
- Integrate with existing hero section (replace hardcoded image)
- Store image URL in `tenants.church_image_url` (new column)
- Add `church_image_url` to tenant model and adapter

## Finance Module Integration

### Critical Relationships (Chart of Accounts is Backbone)

| Entity | Links to COA Type | Code Range | Auto-Link Logic |
|--------|-------------------|------------|-----------------|
| **Financial Sources** | Asset | 1xxx | Link to Cash/Bank accounts |
| **Funds** | Equity | 3xxx | Create fund equity account |
| **Income Categories** | Revenue | 4xxx | Link to income accounts |
| **Expense Categories** | Expense | 5xxx | Link to expense accounts |

### Opening Balance Processing
When opening balances are imported:
1. Link to fiscal year (auto-created)
2. Link to fund (from Funds tab)
3. On posting, creates double-entry:
   - DEBIT: Cash/Asset account (1xxx)
   - CREDIT: Fund Equity account (3xxx)

## UI/UX Design

### Visual Theme
- **Color Palette:** Use existing theme system with accent color highlights
- **Typography:** Large headings, clear hierarchy, readable on mobile
- **Spacing:** Generous whitespace, breathable layouts

### Animations (Motion Library v12)
```typescript
// Step transitions
const stepVariants = {
  enter: { opacity: 0, x: 50 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

// Card hover effects
const cardVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }
};

// Success celebrations
const successVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: { scale: 1, rotate: 0, transition: { type: "spring" } }
};
```

### Illustration Elements
- Custom SVG vectors for each step (team, import, personalize)
- Animated progress indicator
- Confetti/celebration animation on completion
- Empty state illustrations for invite/import sections

### Mobile-First Layout
```css
/* Base: Mobile */
.onboarding-container {
  padding: 1rem;
  flex-direction: column;
}

/* Tablet+ */
@media (min-width: 768px) {
  .onboarding-container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .onboarding-container {
    max-width: 1000px;
  }
}
```

## Database Changes

### Migration: `20260117200000_onboarding_revamp_schema.sql`
- Add `church_image_url` to tenants table
- Add `assigned_role_id` to member_invitations table
- Add `onboarding_completed` and `onboarding_completed_at` to tenants
- Update `accept_member_invitation` function to handle role assignment

## File Structure

```
apps/web/src/
├── app/admin/onboarding/
│   └── page.tsx                    # Main onboarding wizard page
├── components/onboarding/
│   ├── OnboardingWizard.tsx        # Main wizard container
│   ├── OnboardingProgress.tsx      # Step progress indicator
│   ├── steps/
│   │   ├── InviteTeamStep.tsx      # Step 1: Team invitation
│   │   ├── ImportMembersStep.tsx   # Step 2: Excel import
│   │   └── PersonalizeStep.tsx     # Step 3: Church image upload
│   ├── TeamInvitationCard.tsx      # Reusable invite card
│   ├── ExcelImportZone.tsx         # Drag-drop upload
│   ├── ImportPreviewTable.tsx      # Data preview with validation
│   ├── ChurchImageUpload.tsx       # Image upload with preview
│   ├── OnboardingIllustration.tsx  # SVG illustrations
│   └── CompletionCelebration.tsx   # Success animation
├── services/
│   └── ExcelImportService.ts       # Excel parsing and validation
├── lib/
│   └── excel/
│       ├── templateGenerator.ts    # Sample template creation
│       ├── parser.ts               # Excel file parser
│       └── validator.ts            # Data validation rules
└── assets/
    └── onboarding/
        ├── team-illustration.svg
        ├── import-illustration.svg
        └── personalize-illustration.svg
```

## API Endpoints

### Existing (Extended)
- `POST /api/member-invitations/bulk` - Added `assigned_role_id` support

### New Endpoints
- `POST /api/onboarding/import-preview` - Parse Excel and return preview
- `POST /api/onboarding/import-confirm` - Execute import transaction
- `GET /api/onboarding/template` - Download sample Excel template
- `POST /api/onboarding/upload-image` - Upload church image
- `PUT /api/onboarding/complete` - Mark onboarding as complete

## Implementation Progress

### Completed
- [x] Database migration for church_image_url and assigned_role_id (`20260117200000_onboarding_revamp_schema.sql`)
- [x] Update tenant model and adapter for church image URL
- [x] Extend member invitation model/adapter for role pre-assignment
- [x] Update accept_member_invitation function for automatic role assignment
- [x] Create ExcelImportService with template generator (`src/services/ExcelImportService.ts`)
- [x] Create Excel utilities (`src/lib/excel/`)
  - `templateGenerator.ts` - Generate sample Excel template
  - `parser.ts` - Parse uploaded Excel files
  - `validator.ts` - Validate imported data
- [x] Create API endpoints for onboarding operations:
  - `GET /api/onboarding/template` - Download sample Excel template
  - `POST /api/onboarding/import-preview` - Parse and validate Excel file
  - `POST /api/onboarding/import-confirm` - Execute import
  - `POST /api/onboarding/upload-image` - Upload church image
  - `DELETE /api/onboarding/upload-image` - Remove church image
  - `GET /api/onboarding/complete` - Get onboarding status
  - `POST /api/onboarding/complete` - Mark onboarding as complete
- [x] Register services in DI container (ExcelImportService, IncomeCategoryService)

- [x] Create OnboardingWizard container component (`src/components/onboarding/OnboardingWizard.tsx`)
- [x] Create OnboardingProgress step indicator component
- [x] Create CompletionCelebration animation component
- [x] Implement InviteTeamStep component (role-based team invitations)
- [x] Implement ImportMembersStep component (Excel upload, preview, validation)
- [x] Implement PersonalizeStep component (church image upload with preview)
- [x] Add Motion animations (step transitions, progress indicators, completion celebration)

### Pending
- [ ] Test full onboarding flow end-to-end

### Recently Completed
- [x] Update hero section to use dynamic church image from tenant (`DashboardHero.tsx`)
- [x] Create onboarding page route (`/admin/onboarding/page.tsx`)

## UX Notes

### Optional Steps & Dashboard Access
- Excel import step is **optional/skippable** during onboarding
- If skipped, tenant sees a "Continue Setup" button on their dashboard
- Tenant can complete financial setup at any time

### Simplified User Experience
- Chart of Accounts is NOT exposed to users (too technical)
- COA is auto-created with standard church accounting structure
- All financial entity linkages happen automatically behind the scenes
- Users only see friendly names (Funds, Categories, Sources)

## Dependencies
- SheetJS (xlsx) - Already available for Excel handling
- Motion v12 - Already installed for animations
- Supabase Storage - Already configured
- Resend API - Already integrated for emails
