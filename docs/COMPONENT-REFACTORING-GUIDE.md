# Dynamic Component Refactoring Guide

This document tracks the design refactoring progress of dynamic components used in the StewardTrack metadata-driven UI system. The goal is to achieve a consistent, modern, mobile-first design across all components.

---

## Table of Contents

1. [Refactoring Requirements](#refactoring-requirements)
2. [Design Guidelines](#design-guidelines)
3. [Completed Refactoring](#completed-refactoring)
4. [Pending Refactoring - Admin Community](#pending-refactoring---admin-community)
5. [Pending Refactoring - Admin Finance](#pending-refactoring---admin-finance)
6. [Component Usage Matrix](#component-usage-matrix)

---

## Refactoring Requirements

All dynamic components must adhere to the following requirements:

### Core Principles

| Requirement | Description |
|-------------|-------------|
| **Mobile-First** | Design for mobile screens first, then enhance for larger screens using Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`) |
| **Theme-Aware** | Use CSS variables and Tailwind theme tokens (`text-foreground`, `bg-card`, `border-border`) for light/dark mode support |
| **Intuitive** | Clear visual hierarchy, obvious interactive elements, consistent spacing |
| **Wow-Factor** | Modern aesthetics with subtle animations, gradients, and micro-interactions |
| **Advanced Look** | Glass morphism, refined shadows, polished transitions |
| **No Functionality Changes** | Design-only updates; preserve all existing props, callbacks, and behaviors |

### Technical Requirements

- Use `backdrop-blur-sm` for glass morphism effects
- Apply `transition-all duration-300` for smooth hover states
- Use `group` and `group-hover:` for coordinated animations
- Include staggered animation delays: `style={{ animationDelay: \`${index * 50}ms\` }}`
- Maintain accessibility: focus rings, ARIA labels, keyboard navigation

---

## Design Guidelines

### Color Palette

```css
/* Primary accents */
--primary: Use for main actions, links, active states
--primary/10: Light tint backgrounds
--primary/30: Border accents on hover

/* Semantic colors */
--emerald: Success, positive trends, on-track status
--amber: Warnings, pinned items, needs attention
--rose: Errors, delete actions, critical alerts
--sky: Informational, insights

/* Neutral */
--muted-foreground: Secondary text
--border/40: Subtle borders (default state)
--border: Visible borders (hover state)
```

### Spacing Scale

| Context | Mobile | Desktop |
|---------|--------|---------|
| Section padding | `p-3` or `p-4` | `sm:p-4` or `sm:p-6` |
| Card padding | `p-4` or `p-5` | `sm:p-5` or `sm:p-6` |
| Gap between items | `gap-3` | `sm:gap-4` |
| Section title margin | `mb-4` | `sm:mb-5` or `sm:mb-6` |

### Typography Scale

| Element | Mobile | Desktop |
|---------|--------|---------|
| Page title (H1) | `text-2xl` | `sm:text-3xl md:text-4xl` |
| Section title (H2) | `text-lg` | `sm:text-xl` |
| Card title | `text-base` | `sm:text-lg` |
| Body text | `text-sm` | `sm:text-base` |
| Labels/captions | `text-xs` or `text-[10px]` | `sm:text-xs` |

### Card Design Pattern

```tsx
<Card className={cn(
  // Base styles
  "group relative overflow-hidden",
  "border-border/40 bg-card/50 backdrop-blur-sm",
  // Transitions
  "transition-all duration-300",
  // Hover effects
  "hover:border-border hover:shadow-lg hover:shadow-primary/5",
  // Active/pressed state
  "active:scale-[0.99]"
)}>
  {/* Gradient overlay on hover */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

  {/* Top accent line (optional) */}
  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/30" />

  {/* Content */}
  <CardContent className="relative">
    {/* ... */}
  </CardContent>
</Card>
```

### Section Header Pattern

```tsx
<header className="space-y-1.5 sm:space-y-2">
  {title && (
    <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
      <span className="h-5 w-1 rounded-full bg-primary" />
      {title}
    </h2>
  )}
  {description && (
    <p className="text-sm text-muted-foreground pl-3">{description}</p>
  )}
</header>
```

### Badge Styling

```tsx
// Status badges with semantic colors
const badgeVariants = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border/60",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

<Badge variant="outline" className={cn("border font-medium", badgeVariants.success)}>
  Active
</Badge>
```

### Empty State Pattern

```tsx
<div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 sm:p-12 text-center">
  <div className="flex flex-col items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
      <FileQuestion className="h-6 w-6 text-muted-foreground/60" />
    </div>
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">No items found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Get started by creating your first item.
      </p>
    </div>
  </div>
</div>
```

### Icon Usage

- Use **Lucide React** icons consistently
- Icon size in buttons/badges: `h-3.5 w-3.5` or `h-4 w-4`
- Icon size in empty states: `h-6 w-6`
- Icon size in feature cards: `h-5 w-5`
- Always include `aria-hidden` for decorative icons

---

## Completed Refactoring

The following components have been refactored with the new design system:

| Component | File Path | Status | Notes |
|-----------|-----------|--------|-------|
| **HeroSection** | `components/dynamic/HeroSection.tsx` | ✅ Complete | 12 variants updated (aurora, split, spotlight, pattern, stacked, newsletter, stats-panel, minimal, testimonial, logos, video, cards) |
| **AdminMetricCards** | `components/dynamic/admin/AdminMetricCards.tsx` | ✅ Complete | Enhanced with trend icons, tone badges, gradient overlays |
| **AdminQuickLinks** | `components/dynamic/admin/AdminQuickLinks.tsx` | ✅ Complete | Added icon containers, arrow indicators, corner accents |
| **NotebookCard** | `components/dynamic/admin/notebooks/NotebookCard.tsx` | ✅ Complete | Dynamic color accents, visibility badges, owner avatars |
| **AdminDataGridSection** | `components/dynamic/admin/AdminDataGridSection.tsx` | ✅ Complete | Action icons, enhanced filters, improved empty state, delete confirmation |
| **AdminFormSection** | `components/dynamic/admin/AdminFormSection.tsx` | ✅ Complete | Glass morphism form container, Save/Loader2 icons, improved submit button, required field indicators, staggered field animations |
| **AdminDetailPanels** | `components/dynamic/admin/AdminDetailPanels.tsx` | ✅ Complete | Gradient overlays, top accent lines, nested item backgrounds, Edit3 icon, enhanced dialog with loading/error states |
| **AdminActivityTimeline** | `components/dynamic/admin/AdminActivityTimeline.tsx` | ✅ Complete | Gradient timeline line, status-colored markers, History/CalendarDays icons, improved empty state, hover highlighting |
| **AdminReportHeader** | `components/dynamic/admin/AdminReportHeader.tsx` | ✅ Complete | Glass morphism controls card, enhanced filter selectors with labels, improved action buttons, colored export icons |
| **AdminReportChartsSection** | `components/dynamic/admin/AdminReportChartsSection.tsx` | ✅ Complete | Enhanced header with accent bar, staggered animations, empty state with BarChart3 icon |
| **AdminGivingChart** | `components/dynamic/admin/AdminGivingChart.tsx` | ✅ Complete | Glass morphism card, gradient area fills, enhanced tooltip, TrendingUp highlight badge |
| **AdminReportTable** | `components/dynamic/admin/AdminReportTable.tsx` | ✅ Complete | Card container, enhanced empty state, improved subtotals/grand total styling, surplus/deficit badges |
| **AdminMemberWorkspace** | `components/dynamic/admin/AdminMemberWorkspace.tsx` | ✅ Complete | Glass morphism containers, enhanced TabsList, accent bar headers, improved accordion styling, empty state with Users icon |
| **AdminTransactionEntry** | `components/dynamic/admin/AdminTransactionEntry.tsx` | ✅ Complete | Status banners with dynamic colors, glass morphism form container, staggered transaction type animations, enhanced icons for extended types |
| **AdminTransactionLines** | `components/dynamic/admin/AdminTransactionLines.tsx` | ✅ Complete | LineCard with status-based accent lines, glass morphism, enhanced mobile/desktop views, improved empty state |
| **AdminCollapsibleSection** | `components/dynamic/admin/AdminCollapsibleSection.tsx` | ✅ Complete | Glass morphism section, top accent line with open state, enhanced trigger button with icon container |
| **AdminSyncCard** | `components/dynamic/admin/AdminSyncCard.tsx` | ✅ Complete | Status-based accent lines, gradient overlays, enhanced stats grid, animated sync result display |
| **DonationLinkShare** | `components/dynamic/admin/DonationLinkShare.tsx` | ✅ Complete | Backdrop blur dialog, enhanced TabsList, improved QR code container with hover effects, copy button state feedback |
| **AdminCarePlansCard** | `components/dynamic/admin/AdminCarePlansCard.tsx` | ✅ Complete | Glass morphism card, rose accent line, enhanced metrics grid, priority badges with icons, care plan items with hover effects |
| **AdminDiscipleshipPlansCard** | `components/dynamic/admin/AdminDiscipleshipPlansCard.tsx` | ✅ Complete | Glass morphism card, purple accent line, pathway breakdown badges, journey items with arrow indicators, staggered animations |
| **PlanningDashboard** | `components/dynamic/admin/PlanningDashboard.tsx` | ✅ Complete | Enhanced stat cards with glass morphism, feature cards with gradient overlays, upcoming/overdue sections with accent headers |
| **PlanningCalendar** | `components/dynamic/admin/PlanningCalendar.tsx` | ✅ Complete | Glass morphism calendar container, enhanced day headers, improved view mode selector, backdrop blur agenda view |
| **AdminLookupQuickCreate** | `components/dynamic/admin/AdminLookupQuickCreate.tsx` | ✅ Complete | Enhanced dialog header with icon, improved form inputs, loading states with icons |
| **MemberQRCode** | `components/dynamic/admin/MemberQRCode.tsx` | ✅ Complete | Glass morphism card, primary accent line, enhanced QR container with hover effects, improved URL display |
| **MemberImportActions** | `components/dynamic/admin/MemberImportActions.tsx` | ✅ Complete | Enhanced button styling, glass morphism dialog, improved file upload area, better preview table styling |

---

## Pending Refactoring - Admin Community

Components used in `apps/web/metadata/authoring/blueprints/admin-community/`:

### High Priority (Used in 5+ blueprints)

> ✅ **All high-priority admin-community components have been refactored!**
> - AdminFormSection (25+ usages) - Complete
> - AdminDetailPanels (16+ usages) - Complete
> - AdminActivityTimeline (9+ usages) - Complete

### Medium Priority (Used in 2-4 blueprints)

| Component | Usage Count | File Path | Priority |
|-----------|-------------|-----------|----------|
| **AdminMemberWorkspace** | 4 | `components/dynamic/admin/AdminMemberWorkspace.tsx` | ✅ Complete |
| **PlanningDashboard** | 1 | `components/dynamic/admin/PlanningDashboard.tsx` | ✅ Complete |
| **PlanningCalendar** | 1 | `components/dynamic/admin/PlanningCalendar.tsx` | ✅ Complete |
| **AdminSyncCard** | 1 | `components/dynamic/admin/AdminSyncCard.tsx` | ✅ Complete |
| **AdminCarePlansCard** | 1 | `components/dynamic/admin/AdminCarePlansCard.tsx` | ✅ Complete |
| **AdminDiscipleshipPlansCard** | 1 | `components/dynamic/admin/AdminDiscipleshipPlansCard.tsx` | ✅ Complete |

### Lower Priority (Specialized/Single-use)

| Component | File Path | Priority |
|-----------|-----------|----------|
| **AdminLookupQuickCreate** | `components/dynamic/admin/AdminLookupQuickCreate.tsx` | ✅ Complete |
| **MemberQRCode** | `components/dynamic/admin/MemberQRCode.tsx` | ✅ Complete |
| **MemberImportActions** | `components/dynamic/admin/MemberImportActions.tsx` | ✅ Complete |
| **MemberRegistrationQRCode** | `components/dynamic/admin/MemberRegistrationQRCode.tsx` | 🟢 Low |

---

## Pending Refactoring - Admin Finance

Components used in `apps/web/metadata/authoring/blueprints/admin-finance/`:

### High Priority

> ✅ **All high-priority admin-finance components have been refactored!**
> - AdminReportHeader (3 usages) - Complete
> - AdminReportChartsSection (3 usages) - Complete
> - AdminGivingChart (2 usages) - Complete
> - AdminReportTable (multiple usages) - Complete

### Medium Priority

| Component | File Path | Priority |
|-----------|-----------|----------|
| **AdminTransactionEntry** | `components/dynamic/admin/AdminTransactionEntry.tsx` | ✅ Complete |
| **AdminTransactionLines** | `components/dynamic/admin/AdminTransactionLines.tsx` | ✅ Complete |
| **AdminCollapsibleSection** | `components/dynamic/admin/AdminCollapsibleSection.tsx` | ✅ Complete |
| **AdminReportTable** | `components/dynamic/admin/AdminReportTable.tsx` | ✅ Complete |
| **DonationLinkShare** | `components/dynamic/admin/DonationLinkShare.tsx` | ✅ Complete |

---

## Component Usage Matrix

### Admin Community Blueprints

| Blueprint File | Components Used |
|----------------|-----------------|
| `membership-dashboard.xml` | HeroSection, AdminMetricCards, AdminCarePlansCard, AdminDiscipleshipPlansCard, AdminQuickLinks, AdminActivityTimeline |
| `membership-list.xml` | HeroSection, AdminDataGridSection, MemberImportActions |
| `membership-profile.xml` | HeroSection, AdminDetailPanels, AdminMemberWorkspace, MemberQRCode, AdminActivityTimeline |
| `membership-manage.xml` | HeroSection, AdminFormSection |
| `accounts-dashboard.xml` | HeroSection, AdminMetricCards, AdminSyncCard, AdminQuickLinks, AdminActivityTimeline |
| `accounts-list.xml` | HeroSection, AdminDataGridSection |
| `accounts-profile.xml` | HeroSection, AdminDetailPanels, AdminMetricCards, AdminDataGridSection |
| `accounts-manage.xml` | HeroSection, AdminFormSection |
| `families-list.xml` | HeroSection, AdminDataGridSection |
| `families-profile.xml` | HeroSection, AdminDetailPanels, AdminDataGridSection |
| `families-manage.xml` | HeroSection, AdminFormSection |
| `households-list.xml` | HeroSection, AdminDataGridSection |
| `households-profile.xml` | HeroSection, AdminDetailPanels, AdminDataGridSection |
| `households-manage.xml` | HeroSection, AdminFormSection |
| `care-plans-list.xml` | HeroSection, AdminDataGridSection |
| `care-plans-profile.xml` | HeroSection, AdminDetailPanels, AdminActivityTimeline |
| `care-plans-manage.xml` | HeroSection, AdminFormSection |
| `discipleship-plans-list.xml` | HeroSection, AdminDataGridSection |
| `discipleship-plans-profile.xml` | HeroSection, AdminDetailPanels, AdminActivityTimeline |
| `discipleship-plans-manage.xml` | HeroSection, AdminFormSection |
| `planning-notebooks.xml` | HeroSection, AdminMetricCards, AdminQuickLinks, NotebookCard, AdminDataGridSection |
| `planning-notebooks-detail.xml` | HeroSection, NotebookSectionTree, QuickActionsPanel |
| `planning-notebooks-manage.xml` | HeroSection, AdminFormSection |
| `planning-goals.xml` | HeroSection, AdminMetricCards, GoalCard, AdminDataGridSection |
| `planning-goals-detail.xml` | HeroSection, OKRTreeView, AdminDetailPanels |
| `planning-goals-manage.xml` | HeroSection, AdminFormSection |
| `planning-dashboard.xml` | HeroSection, AdminMetricCards, PlanningDashboard, AdminQuickLinks |
| `planning-calendar.xml` | HeroSection, PlanningCalendar |
| `scheduler-dashboard.xml` | HeroSection, AdminMetricCards, AdminQuickLinks, AdminActivityTimeline |
| `scheduler-ministry-list.xml` | HeroSection, AdminDataGridSection |
| `scheduler-ministry-profile.xml` | HeroSection, AdminDetailPanels, MinistryTeamManager |
| `scheduler-schedules.xml` | HeroSection, AdminDataGridSection |
| `scheduler-calendar.xml` | HeroSection, ScheduleCalendarView |
| `scheduler-occurrence-detail.xml` | HeroSection, AdminDetailPanels, AttendanceTracker, RegistrationList, TeamAssignmentGrid, EventQRCode |
| `scheduler-checkin.xml` | HeroSection, QRScannerView |

### Admin Finance Blueprints

| Blueprint File | Components Used |
|----------------|-----------------|
| `finance-dashboard.xml` | HeroSection, AdminMetricCards, AdminGivingChart, AdminQuickLinks |
| `reports-dashboard.xml` | HeroSection, AdminMetricCards, AdminQuickLinks |
| `reports-income-statement.xml` | AdminReportHeader, AdminReportChartsSection, AdminDataGridSection |
| `reports-balance-sheet.xml` | AdminReportHeader, AdminReportChartsSection, AdminDataGridSection |
| `reports-trial-balance.xml` | AdminReportHeader, AdminReportTable |
| `accounts-list.xml` | HeroSection, AdminDataGridSection |
| `accounts-profile.xml` | HeroSection, AdminDetailPanels, AdminMetricCards, AdminDataGridSection |
| `accounts-manage.xml` | HeroSection, AdminFormSection |
| `funds-list.xml` | HeroSection, AdminDataGridSection |
| `funds-profile.xml` | HeroSection, AdminDetailPanels, AdminMetricCards |
| `funds-manage.xml` | HeroSection, AdminFormSection |
| `budgets-list.xml` | HeroSection, AdminMetricCards, AdminDataGridSection |
| `budgets-manage.xml` | HeroSection, AdminFormSection |
| `fiscal-years-list.xml` | HeroSection, AdminDataGridSection |
| `fiscal-years-profile.xml` | HeroSection, AdminDetailPanels, AdminMetricCards |
| `fiscal-years-manage.xml` | HeroSection, AdminFormSection |
| `transactions-list.xml` | HeroSection, AdminDataGridSection |
| `transactions-profile.xml` | HeroSection, AdminDetailPanels, AdminCollapsibleSection, AdminTransactionLines |
| `transactions-entry.xml` | HeroSection, AdminTransactionEntry |
| `donations-list.xml` | HeroSection, AdminDataGridSection, DonationLinkShare |
| `donations-profile.xml` | HeroSection, AdminDetailPanels, AdminGivingChart |
| `donations-recurring-list.xml` | HeroSection, AdminDataGridSection |
| `donations-recurring-profile.xml` | HeroSection, AdminDetailPanels |
| `sources-list.xml` | HeroSection, AdminDataGridSection |
| `sources-profile.xml` | HeroSection, AdminDetailPanels |
| `sources-manage.xml` | HeroSection, AdminFormSection |
| `opening-balances-list.xml` | HeroSection, AdminDataGridSection |
| `opening-balances-profile.xml` | HeroSection, AdminDetailPanels |
| `opening-balances-manage.xml` | HeroSection, AdminFormSection |
| `income-categories-list.xml` | HeroSection, AdminDataGridSection |
| `income-categories-profile.xml` | HeroSection, AdminDetailPanels |
| `income-categories-manage.xml` | HeroSection, AdminFormSection |
| `expense-categories-list.xml` | HeroSection, AdminDataGridSection |
| `expense-categories-profile.xml` | HeroSection, AdminDetailPanels |
| `expense-categories-manage.xml` | HeroSection, AdminFormSection |
| `budget-categories-list.xml` | HeroSection, AdminDataGridSection |
| `budget-categories-profile.xml` | HeroSection, AdminDetailPanels |
| `budget-categories-manage.xml` | HeroSection, AdminFormSection |

---

## Recommended Refactoring Order

Based on usage frequency and user impact:

### Phase 1 - Core Components (Complete)
1. ✅ HeroSection
2. ✅ AdminMetricCards
3. ✅ AdminQuickLinks
4. ✅ AdminDataGridSection
5. ✅ NotebookCard

### Phase 2 - High Impact Components (Complete)
6. ✅ AdminFormSection (25+ usages)
7. ✅ AdminDetailPanels (16+ usages)
8. ✅ AdminActivityTimeline (9+ usages)

### Phase 3 - Finance & Reporting (Complete)
9. ✅ AdminReportHeader
10. ✅ AdminReportChartsSection
11. ✅ AdminGivingChart
12. ✅ AdminReportTable

### Phase 4 - Specialized Components (Complete)
13. ✅ AdminMemberWorkspace
14. ✅ AdminTransactionEntry
15. ✅ AdminTransactionLines
16. ✅ AdminCollapsibleSection
17. ✅ AdminSyncCard
18. ✅ DonationLinkShare

### Phase 5 - Remaining Components (Complete)
19. ✅ AdminCarePlansCard
20. ✅ AdminDiscipleshipPlansCard
21. ✅ PlanningDashboard
22. ✅ PlanningCalendar
23. ✅ AdminLookupQuickCreate
24. ✅ MemberQRCode
25. ✅ MemberImportActions

---

## Checklist for Each Component Refactoring

- [ ] Add `"use client";` directive if missing
- [ ] Update imports to use Lucide icons
- [ ] Apply mobile-first responsive classes
- [ ] Add glass morphism (`backdrop-blur-sm`, `bg-card/50`)
- [ ] Implement hover states with `group` pattern
- [ ] Add gradient overlays on hover
- [ ] Include staggered animation delays for lists
- [ ] Update badges with semantic color variants
- [ ] Add empty state with icon and helpful message
- [ ] Ensure dark mode compatibility
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1280px)
- [ ] Verify all existing props still work
- [ ] Run TypeScript compiler to check for errors

---

## File Locations Reference

```
apps/web/src/components/dynamic/
├── HeroSection.tsx              ✅ Refactored
├── shared.tsx                   (Utility functions)
└── admin/
    ├── AdminMetricCards.tsx     ✅ Refactored
    ├── AdminQuickLinks.tsx      ✅ Refactored
    ├── AdminDataGridSection.tsx ✅ Refactored
    ├── AdminFormSection.tsx     ✅ Refactored
    ├── AdminDetailPanels.tsx    ✅ Refactored
    ├── AdminActivityTimeline.tsx ✅ Refactored
    ├── AdminReportHeader.tsx    ✅ Refactored
    ├── AdminReportChartsSection.tsx ✅ Refactored
    ├── AdminReportTable.tsx     ✅ Refactored
    ├── AdminGivingChart.tsx     ✅ Refactored
    ├── AdminTransactionEntry.tsx ✅ Refactored
    ├── AdminTransactionLines.tsx ✅ Refactored
    ├── AdminCollapsibleSection.tsx ✅ Refactored
    ├── AdminMemberWorkspace.tsx ✅ Refactored
    ├── AdminSyncCard.tsx        ✅ Refactored
    ├── AdminCarePlansCard.tsx   ✅ Refactored
    ├── AdminDiscipleshipPlansCard.tsx ✅ Refactored
    ├── DonationLinkShare.tsx    ✅ Refactored
    ├── PlanningDashboard.tsx    ✅ Refactored
    ├── PlanningCalendar.tsx     ✅ Refactored
    ├── AdminLookupQuickCreate.tsx ✅ Refactored
    ├── MemberQRCode.tsx         ✅ Refactored
    ├── MemberImportActions.tsx  ✅ Refactored
    └── notebooks/
        └── NotebookCard.tsx     ✅ Refactored
```

---

*Last Updated: January 24, 2026*
*Document Version: 1.5 (Phase 5 Complete - All Dynamic Admin Components Refactored)*
