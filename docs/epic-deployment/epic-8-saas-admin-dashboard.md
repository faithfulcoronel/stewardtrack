# Epic 8: SaaS Admin Dashboard

**Release:** Beta - March 2026
**Timeline:** Week 9 (March 3-9, 2026)
**Duration:** 1 week (accelerated from 2-3 weeks with Claude AI)
**Priority:** P2 → P1 (Enhanced with AI Assistance - Included in Beta)
**Epic Type:** NEW BUILD
**Epic Owner:** Frontend Team + Claude AI Assistance
**Dependencies:** Epic 5 (Members - Review), Epic 6 (Finance - Review), Epic 7 (Reporting Suite)

## Epic Overview

Create a comprehensive SaaS administration dashboard that provides tenant admins with insights into system usage, license status, user activity, and key performance metrics. This dashboard serves as the command center for managing the church organization.

**With Claude AI Assistance:** This epic was originally P2 (post-launch) but is now included in the Beta timeline thanks to AI-accelerated development. Claude AI will generate dashboard components, KPI calculations, chart visualizations, and activity feed logic to compress the timeline from 2-3 weeks to 1 week.

---

## Dashboard Components Architecture

```
SaaS Admin Dashboard (/admin)
    │
    ├─> Overview Cards (KPIs)
    │   ├─> Total Members
    │   ├─> Active Users (Last 7 Days)
    │   ├─> Total Donations (Current Period)
    │   └─> License Status
    │
    ├─> Usage Charts
    │   ├─> Member Growth (Line Chart)
    │   ├─> Donation Trends (Bar Chart)
    │   └─> Module Activity (Pie Chart)
    │
    ├─> Recent Activity Feed
    │   ├─> New Member Registrations
    │   ├─> Recent Donations
    │   └─> User Login Activity
    │
    ├─> Quick Actions
    │   ├─> Add New Member
    │   ├─> Record Donation
    │   ├─> Manage Users
    │   └─> View Reports
    │
    └─> System Health
        ├─> Storage Usage
        ├─> API Rate Limits
        └─> License Expiry Warning
```

---

## Implementation Approach

### Phase 1: Backend Services (Week 1)
1. Create DashboardService to aggregate statistics
2. Implement caching layer (5-minute TTL) to reduce database load
3. Create user activity tracking table and triggers
4. Add date range filtering support (today, week, month, year)
5. Optimize queries for dashboard KPIs

### Phase 2: API Layer (Week 1-2)
1. Create `/api/dashboard/stats` endpoint
2. Support date range query parameter
3. Return all dashboard data in single API call
4. Implement response caching
5. Add RBAC permission checks

### Phase 3: UI Components (Week 2-3)
1. Install chart library (Recharts)
2. Create KPI overview cards with trend indicators
3. Implement member growth line chart
4. Implement donation trends bar chart
5. Implement module activity pie chart
6. Create recent activity feed component
7. Create quick actions section
8. Create system health indicators
9. Add date range selector
10. Implement auto-refresh (5 minutes)
11. Ensure responsive design (mobile-friendly)

---

## User Stories Summary

### Story 7.1: Dashboard Statistics Service
- Implement DashboardService to aggregate KPIs
- Support date range filtering (today/week/month/year)
- Add caching layer (5-minute TTL)
- Calculate percentage change from previous period
- Story Points: 8

### Story 7.2: Dashboard API Endpoint
- Create GET `/api/dashboard/stats?range=month` endpoint
- Return overview stats, charts data, activity feed, system health
- Implement caching for performance
- Story Points: 2

### Story 7.3: User Activity Tracking
- Create `user_activity` table to track logins
- Add database function `update_user_activity()`
- Update AuthService to track activity on login
- Story Points: 2

### Story 7.4: Dashboard UI Implementation
- Create admin dashboard page with all components
- Integrate Recharts for data visualization
- Add date range selector and auto-refresh
- Implement responsive design
- Story Points: 13

**Total Story Points:** 25 points (approximately 2-3 weeks for 1 developer)

---

## Dashboard KPIs & Metrics

### Overview Cards

1. **Total Members**
   - Count of all active members
   - Percentage change from previous period
   - Trend indicator (up/down arrow)

2. **Active Users**
   - Count of users logged in within last 7 days
   - Percentage change from previous 7-day period
   - Trend indicator

3. **Total Donations**
   - Sum of donations for selected date range
   - Percentage change from previous period
   - Currency formatted (PHP)

4. **Upcoming Events**
   - Count of events in next 30 days
   - Static count (no trend)

### Chart Data

1. **Member Growth Chart (Line Chart)**
   - X-axis: Date
   - Y-axis: Count of new members
   - Grouped by day/week/month/year based on date range

2. **Donation Trends Chart (Bar Chart)**
   - X-axis: Date
   - Y-axis: Total donation amount
   - Grouped by day/week/month/year based on date range

3. **Module Activity Chart (Pie Chart)**
   - Shows access count per module
   - Data from audit logs
   - Top 5 modules by access count

### Recent Activity Feed

- Last 10 activities across all types
- Activity types:
  - New member registration
  - Donation recorded
  - User login
- Display: Icon, description, timestamp
- Sorted by timestamp descending

### System Health Metrics

1. **Storage Usage**
   - Used storage vs limit
   - Progress bar visualization
   - Display in GB

2. **API Calls Today**
   - Count vs daily limit
   - Progress bar visualization
   - Daily limit: 100,000 calls

3. **License Status**
   - Status badge: Active, Trial, Expired
   - Expiry date (if applicable)
   - Warning banner if trial or near expiry

---

## Database Requirements

### User Activity Table

**Table:** `user_activity`

**Columns:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants)
- `user_id` (UUID, FK → auth.users)
- `last_login` (TIMESTAMPTZ)
- `login_count` (INTEGER)
- `last_ip_address` (TEXT)
- `last_user_agent` (TEXT)
- `created_at` / `updated_at`

**Unique Constraint:** `(tenant_id, user_id)`

**Function:** `update_user_activity(p_tenant_id, p_user_id, p_ip_address, p_user_agent)`
- Upserts activity record on each login
- Increments login_count
- Updates last_login timestamp

---

## Caching Strategy

### Cache Implementation
- In-memory cache (Map) in DashboardService
- Cache key format: `dashboard:{tenantId}:{dateRange}`
- TTL: 5 minutes (300,000ms)
- Automatic expiration and cleanup

### Cache Invalidation
- Time-based expiration (5 minutes)
- Manual cache clear method: `clearCache(tenantId)`
- Called when major data changes occur (optional)

### Performance Targets
- Cached response: < 100ms
- Uncached response: < 500ms
- Database queries optimized with proper indexes

---

## UI/UX Requirements

### Responsiveness
- Desktop: Multi-column grid layout
- Tablet: 2-column layout
- Mobile: Single column, stacked cards

### Auto-Refresh
- Refresh dashboard data every 5 minutes
- Visual indicator for last refresh time (optional)
- User can manually refresh

### Date Range Selector
- Dropdown with options: Today, This Week, This Month, This Year
- Default: This Month
- Updates all charts and KPIs on change

### Chart Library
- Use Recharts for all visualizations
- Responsive container sizing
- Tooltips on hover
- Legend for clarity

### Quick Actions
- 4 large buttons in grid layout
- Icons + labels
- Navigate to respective pages:
  - Add Member → `/admin/members/new`
  - Record Donation → `/admin/finance/donations/new`
  - Manage Users → `/admin/security/users`
  - View Reports → `/admin/reports`

### License Warnings
- Yellow banner at top if license is trial or expiring soon
- Red banner if license is expired
- "Upgrade Now" button linking to billing page

---

## Key Locations in Codebase

### Backend
- **Service**: `src/services/DashboardService.ts`
- **Types**: Add to `src/lib/types.ts` and `src/lib/container.ts`

### API Routes
- **Dashboard Stats**: `src/app/api/dashboard/stats/route.ts`

### Frontend
- **Dashboard Page**: `src/app/admin/page.tsx`
- **UI Components**: `src/components/ui/` (cards, buttons, badges, selects)

### Database
- **Migration**: `supabase/migrations/*_create_user_activity_table.sql`
- **Table**: `user_activity`
- **Function**: `update_user_activity()`

### Dependencies
- **Chart Library**: `recharts` (install via npm)
- **Icons**: `lucide-react` (already used in project)

---

## Testing Checklist

### Unit Tests
- [ ] DashboardService calculates KPIs correctly
- [ ] Date range filtering logic works
- [ ] Percentage change calculations accurate
- [ ] Cache get/set/expiration works
- [ ] Data grouping by date works correctly

### Integration Tests
- [ ] Dashboard API returns complete stats object
- [ ] Date range parameter filters data correctly
- [ ] User activity tracking records logins
- [ ] Cache reduces database query count
- [ ] RBAC permissions enforced

### Performance Tests
- [ ] Dashboard loads in < 100ms (cached)
- [ ] Dashboard loads in < 500ms (uncached)
- [ ] No N+1 query issues
- [ ] Proper indexes on filtered columns
- [ ] Cache hit rate is acceptable

### Manual Testing
1. Log in and verify user activity tracked
2. Check KPI cards display correct numbers
3. Verify trend indicators (up/down arrows) show correctly
4. Test date range selector updates all data
5. Verify member growth chart renders
6. Verify donation trends chart renders
7. Verify module activity pie chart renders
8. Check recent activity feed displays latest activities
9. Test quick action buttons navigate correctly
10. Verify system health metrics display
11. Test license warning banner (trial/expired)
12. Test responsive design on mobile/tablet
13. Verify auto-refresh updates data every 5 minutes
14. Test manual refresh functionality

---

## Success Criteria

- ✅ Dashboard displays all KPIs with accurate data
- ✅ Charts render correctly and update based on date range
- ✅ Recent activity feed shows latest 10 activities
- ✅ Quick actions navigate to correct pages
- ✅ System health metrics display correctly
- ✅ License warnings show when applicable
- ✅ User activity tracking records all logins
- ✅ Caching improves performance (< 100ms cached, < 500ms uncached)
- ✅ Responsive design works on mobile/tablet/desktop
- ✅ Auto-refresh updates data every 5 minutes
- ✅ Date range selector filters all data correctly

---

## Epic Completion Checklist

- [ ] DashboardService implemented with caching
- [ ] User activity tracking table created
- [ ] `update_user_activity()` database function created
- [ ] AuthService updated to track logins
- [ ] Dashboard stats API endpoint created
- [ ] Dashboard UI page implemented
- [ ] Charts integrated (Recharts)
- [ ] KPI cards with trend indicators
- [ ] Recent activity feed
- [ ] Quick actions section
- [ ] System health indicators
- [ ] Date range selector
- [ ] Auto-refresh functionality (5 minutes)
- [ ] License warning banners
- [ ] Responsive design verified
- [ ] Performance targets met
- [ ] All tests passing
- [ ] Documentation complete

---

## Future Enhancements (Post-P2)

These features are intentionally excluded from P2 scope and can be considered for later phases:

1. **Customizable Dashboard** - Allow users to add/remove widgets
2. **Export Dashboard Data** - Export charts as PDF or images
3. **Email Digest** - Send weekly/monthly dashboard summary via email
4. **Advanced Analytics** - Predictive analytics, forecasting
5. **Real-time Updates** - WebSocket-based live updates instead of polling
6. **Module-Specific Dashboards** - Separate dashboards for Finance, Events, etc.
7. **Goal Tracking** - Set and track goals (member growth, donation targets)
8. **Comparison Mode** - Compare current period to previous period side-by-side

---

## Next Epic

This is a P2 epic. After completing this, consider other P2 epics or new feature requests from users post-launch.
