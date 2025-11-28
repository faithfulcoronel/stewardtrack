# Epic 7: Reporting Suite (Simplified)

**Release:** Post-Launch (April 2026+)
**Timeline:** Post-Launch (After Week 12)
**Duration:** 2-3 weeks
**Priority:** P2 (Nice to Have - Not Blocking Launch)
**Epic Type:** NEW BUILD (Post-Beta Enhancement)
**Epic Owner:** Full Stack Team
**Dependencies:** Epic 1 (JWT Authentication), Epic 3 (RBAC), Epic 5 (Members - Review), Epic 6 (Finance - Review)

## Epic Overview

Implement a simplified two-tier reporting system with Standard and Advanced reports based on license features. Reports provide insights into membership and finances **without the complexity** of custom report builders, scheduled delivery, or premium analytics.

**Post-Launch Priority:** This epic is P2 (Nice to Have) and should only be implemented after successful Beta launch and initial user feedback. Focus on P0 and P1 epics first.

---

## Reporting Tiers

### Standard Reports (All Plans)
1. **Member Directory**
   - Complete list of members with contact information
   - Columns: Account #, Name, Email, Phone, Membership Status
   - Filters: Status, Date Joined
   - Sort by: Name, Account #, Date

2. **Donation Summary**
   - Donations by date, donor, category, and payment method
   - Columns: Date, Donor, Amount, Category, Payment Method
   - Filters: Date Range, Category, Payment Method, Donor
   - Sort by: Date, Amount, Donor

3. **Monthly Financial Summary**
   - Income and expenses for the month
   - Columns: Month, Category, Income, Expenses, Net
   - Filters: Fiscal Year, Month, Category Type
   - Sort by: Month, Category

### Advanced Reports (Professional, Enterprise, Premium)
4. **Donor Contribution Analysis**
   - Detailed donor giving patterns and trends
   - Columns: Donor Name, Total Given, # Donations, Avg Amount, Last Donation, First Donation
   - Filters: Date Range, Minimum Amount, Donor Status
   - Sort by: Total Amount, # Donations, Last Donation

5. **Budget vs Actual Reports**
   - Compare budgeted amounts with actual spending
   - Columns: Category, Budgeted Amount, Actual Amount, Variance, % Variance
   - Filters: Fiscal Year, Budget, Category Type, Variance Threshold
   - Sort by: Variance, % Variance, Category

6. **Trend Analysis (Members)**
   - Member growth trends over time
   - Columns: Period, New Members, Total Members, Growth Rate, Status Breakdown
   - Filters: Date Range, Membership Status, Granularity (Monthly/Quarterly/Yearly)
   - Sort by: Period

7. **Trend Analysis (Donations)**
   - Donation trends by category and time period
   - Columns: Period, Category, Total Donations, Avg Donation, # Donors, # Donations
   - Filters: Date Range, Category, Granularity (Weekly/Monthly/Quarterly)
   - Sort by: Period, Total Amount


---

## Implementation Approach

### Phase 1: Database & Backend (Week 1)
1. Create report definitions table (store metadata for 7 reports)
2. Create report executions table (track report runs)
3. Implement ReportService with report execution engine
4. Map reports to license features (standard_reports, advanced_reports)
5. Add RBAC permission checks (`reports:read`)

### Phase 2: API Layer (Week 1-2)
1. Create `/api/reports` endpoint (list available reports based on license)
2. Create `/api/reports/execute` endpoint (run report with parameters)
3. Implement license-based access control
4. Add query optimization for large datasets

### Phase 3: UI Components (Week 2-3)
1. Create Reports List page (`/admin/reports`)
   - Card-based layout showing available reports
   - Filter by category (membership, finance)
   - Display tier badges (Standard, Advanced)
2. Create Report Viewer page (`/admin/reports/[id]`)
   - Parameter input form (date ranges, filters)
   - Run report button
   - Display results in data table
   - Show row count and execution time
3. Implement responsive table with sorting

---

## Report Feature Mapping

Map each report to required license feature:

| Report Name | Feature Required | License Tiers |
|-------------|-----------------|---------------|
| Member Directory | `standard_reports` | Essential, Professional, Enterprise, Premium |
| Donation Summary | `standard_reports` | Essential, Professional, Enterprise, Premium |
| Monthly Financial Summary | `standard_reports` | Essential, Professional, Enterprise, Premium |
| Donor Contribution Analysis | `advanced_reports` | Professional, Enterprise, Premium |
| Budget vs Actual | `advanced_reports` | Professional, Enterprise, Premium |
| Trend Analysis (Members) | `advanced_reports` | Professional, Enterprise, Premium |
| Trend Analysis (Donations) | `advanced_reports` | Professional, Enterprise, Premium |

---

## Key Locations in Codebase

### Database
- **Migration**: `supabase/migrations/*_create_reports_tables.sql`
- **Tables**: `report_definitions`, `report_executions`
- **Seed Data**: System reports seeded in migration

### Backend
- **Service**: `src/services/ReportService.ts`
- **Types**: Add to `src/lib/types.ts` and `src/lib/container.ts`

### API Routes
- **List Reports**: `src/app/api/reports/route.ts`
- **Execute Report**: `src/app/api/reports/execute/route.ts`

### Frontend
- **Reports List**: `src/app/admin/reports/page.tsx`
- **Report Viewer**: `src/app/admin/reports/[id]/page.tsx`

---

## User Stories Summary

### Story 8.1: Report Database Schema
- Create `report_definitions` table
- Create `report_executions` table
- Seed 7 system reports
- Story Points: 5

### Story 8.2: Report Service & Execution Engine
- Implement ReportService with execution logic
- License-based access control
- Query optimization for each report type
- Story Points: 13

### Story 8.3: Report API Endpoints
- GET `/api/reports` - List available reports
- POST `/api/reports/execute` - Run report with parameters
- RBAC permission enforcement
- Story Points: 5

### Story 8.4: Reports List UI
- Card-based report gallery
- Filter by category
- Display tier badges
- Story Points: 8

### Story 8.5: Report Viewer UI
- Parameter input form
- Execute report and display results
- Sortable data table
- Row count and execution time display
- Story Points: 13

**Total Story Points:** 44 points (approximately 2-3 weeks for 1 developer)

---

## Testing Checklist

### Functional Testing
- [ ] List reports shows only reports user has license for
- [ ] Standard reports accessible on Essential plan
- [ ] Advanced reports blocked without Professional+ license
- [ ] Member Directory report executes correctly
- [ ] Donation Summary report with date filters works
- [ ] Monthly Financial Summary displays accurate totals
- [ ] Donor Contribution Analysis aggregates correctly
- [ ] Budget vs Actual shows variance calculations
- [ ] Member Growth Trend displays growth rates
- [ ] Donation Trend Analysis groups by period correctly

### RBAC & License Guard Testing
- [ ] Users without `reports:read` permission denied access (403 error)
- [ ] Tenant Admin has full report access
- [ ] Staff role can read reports
- [ ] Volunteer/Member roles have no report access

**Verify Permission Guards:**
- [ ] API endpoints call `requirePermission('reports:read')`
- [ ] Advanced reports require `reports:advanced` permission
- [ ] UI hides reports user doesn't have permission for
- [ ] Permission denied errors are user-friendly

**Verify License Guards:**
- [ ] Standard reports available on all plans (Essential+)
- [ ] Advanced reports require Professional+ license
- [ ] API endpoints call `requireFeature('standard_reports')` or `requireFeature('advanced_reports')`
- [ ] Report list only shows reports tenant has license for
- [ ] Executing unlicensed report returns 402 Payment Required
- [ ] Upsell message shown for locked premium reports

**Verify Metadata RBAC Rules:**
- [ ] Reports list page enforces `reports:read` permission
- [ ] Report viewer page enforces appropriate permission
- [ ] Metadata resolver blocks access without permission/feature
- [ ] Multi-level guards work (permission AND feature both required)

### Performance Testing
- [ ] Reports execute in < 5 seconds for 1,000 records
- [ ] Reports execute in < 30 seconds for 10,000 records
- [ ] Query optimization reduces N+1 queries
- [ ] Proper indexes on filtered columns

### Data Integrity
- [ ] Member Directory counts match members table
- [ ] Donation Summary totals match donation records
- [ ] Budget variance calculations are accurate
- [ ] Trend analysis aggregations are correct
- [ ] RLS policies enforce tenant isolation

---

## Success Criteria

- ✅ All 7 reports implemented and tested
- ✅ License-based access control working
- ✅ Reports execute with acceptable performance (< 30s)
- ✅ RBAC permissions enforced on all routes
- ✅ Data accuracy verified for all reports
- ✅ UI is responsive and user-friendly
- ✅ No PDF/Excel export (deferred to future)
- ✅ No scheduled reports (deferred to future)
- ✅ No custom report builder (out of scope)

---

## Future Enhancements (Post-P2)

These features are intentionally excluded from P2 scope and can be considered for later phases:

1. **PDF/Excel Export** - Allow users to download reports as PDF or Excel files
2. **Charts & Visualizations** - Add charts (bar, line, pie) to reports
3. **Scheduled Reports** - Email reports automatically on a schedule
4. **Custom Report Builder** - Allow users to create custom reports with drag-and-drop
5. **Report Sharing** - Share report results with other users
6. **Report Bookmarks** - Save favorite report parameter combinations
7. **Advanced Filters** - More complex filtering (AND/OR logic, date comparisons)
8. **Executive Dashboard** - High-level KPI dashboard with multiple reports

---

## Epic Completion Checklist

- [ ] Report database tables migrated
- [ ] 7 system reports seeded
- [ ] ReportService implemented with execution engine
- [ ] License feature access control implemented
- [ ] Report API endpoints created
- [ ] Reports list UI page completed
- [ ] Report viewer UI page completed
- [ ] All 7 reports tested and verified
- [ ] RBAC permissions enforced
- [ ] Performance testing passed
- [ ] Documentation complete

---

## Next Epic

[Epic 9: Delegation & Admin Features](./epic-9-delegation-admin.md) (P2 - Post-Launch)
