# Church Insights & Analytics Module Proposal

**Document Version:** 1.0
**Created:** January 2026
**Status:** Proposal
**Module Path:** `/admin/insights/*`

---

## Executive Summary

StewardTrack collects exceptionally rich member data that most churches never leverage properly. This proposal outlines a dedicated **Church Insights & Analytics** module that transforms raw data into professional, actionable intelligence for church leaders.

### The Problem

Churches collect valuable data about their congregation but:
- Data is scattered across different screens and reports
- Leaders rely on gut feelings instead of data-driven decisions
- Excel exports require technical skills to analyze
- No unified view of church health and trends
- Opportunities for pastoral care and engagement are missed

### The Solution

A comprehensive analytics module with:
- Professional visualizations (no Excel required)
- Actionable insights linked directly to member records
- Role-based access for sensitive data
- Trend analysis, not just snapshots
- Export and sharing capabilities

---

## Data Dimensions

StewardTrack's member data covers **5 critical dimensions** of church health:

| Dimension | Data Points | Questions Answered |
|-----------|-------------|-------------------|
| **Demographics & Identity** | Age, gender, marital status, location, family | Who is your congregation? |
| **Engagement & Participation** | Attendance, groups, events, last activity | How active are they? |
| **Spiritual Growth & Discipleship** | Pathways, milestones, baptism, gifts | Are they growing? |
| **Generosity & Stewardship** | Giving patterns, pledges, tiers | Are they investing? |
| **Connections & Community** | Groups, families, relationships, serving | Are they connected? |

---

## Proposed Pages

### 1. Church Health Dashboard

**Route:** `/admin/insights/dashboard`
**Purpose:** Executive-level snapshot of overall church health with trend indicators
**Target Users:** Senior Pastor, Executive Pastor, Board Members

#### Key Metrics Panel

| Metric | Calculation | Why It Matters |
|--------|-------------|----------------|
| **Engagement Score** | % of members active in last 30/60/90 days | Core health indicator |
| **Retention Rate** | Members retained year-over-year | Are people staying? |
| **Visitor Conversion Rate** | Visitors → Members conversion % | Front door effectiveness |
| **Discipleship Pipeline** | Members in active growth pathways | Are people growing? |
| **Serving Participation** | % of members actively serving | Ownership indicator |
| **Giving Unit Health** | % of families with active giving | Financial sustainability |

#### Visualizations

1. **12-Month Rolling Membership Growth**
   - Line chart showing net membership change
   - Annotations for significant events (campaigns, Easter, etc.)

2. **Visitor-to-Member Funnel**
   - Visual funnel: First Visit → Return Visit → Connected → Member
   - Conversion rates at each stage

3. **Engagement Heat Map**
   - Calendar view showing attendance patterns
   - Identify seasonal trends (summer dip, holiday spikes)

4. **Giving Trend Line**
   - Monthly giving totals with year-over-year comparison
   - Seasonal pattern identification

#### Alerts & Action Items

| Alert Type | Trigger | Action |
|------------|---------|--------|
| Disengaging Members | No attendance 60+ days | View list → Create care plan |
| Care Plan Follow-ups | Overdue follow-up date | View list → Contact |
| Visitor Awaiting Contact | New visitor, no follow-up | View list → Assign |
| Milestone Celebrations | Birthday, anniversary this week | View list → Celebrate |

#### Data Sources Required

```
- members (attendance_rate, last_attendance_date, membership_date)
- member_care_plans (status, follow_up_at)
- member_discipleship_plans (status, pathway)
- member_giving_profiles (recurring_amount, last_gift_at)
- membership_stage_history (tracking transitions)
```

---

### 2. Congregation Demographics

**Route:** `/admin/insights/demographics`
**Purpose:** Understand WHO your church is serving
**Target Users:** Pastors, Ministry Leaders, Outreach Team

#### Age Distribution Analysis

**Visualization:** Interactive pie chart + bar chart

| Generation | Birth Years | Example Insight |
|------------|-------------|-----------------|
| Gen Z | 1997-2012 | "42 members (11%) - Youth ministry target" |
| Millennials | 1981-1996 | "127 members (34%) - Young families focus" |
| Gen X | 1965-1980 | "89 members (23%) - Leadership pipeline" |
| Boomers | 1946-1964 | "156 members (41%) - Legacy & wisdom" |
| Silent | Before 1946 | "18 members (5%) - Senior care ministry" |

**Filters:**
- By membership center/campus
- By membership type
- By membership stage

**Actionable Insights:**
- "Your youth ministry serves ages 13-18. You have 42 members in this range."
- "67% of your congregation is over 40. Consider multigenerational programming."

#### Gender Distribution

**Visualization:** Donut chart with percentages

- Male / Female / Other breakdown
- Compare across membership types
- Compare across campuses/centers

#### Marital Status Analysis

**Visualization:** Horizontal bar chart

| Status | Count | % | Ministry Opportunity |
|--------|-------|---|---------------------|
| Married | 234 | 58% | Marriage enrichment |
| Single | 112 | 28% | Singles ministry |
| Divorced | 32 | 8% | Divorce care groups |
| Widowed | 18 | 5% | Grief support |
| Engaged | 6 | 1% | Pre-marital counseling |

**Actionable Insight:**
- "You have 23 widowed members - consider a grief care ministry"
- "32 divorced members could benefit from DivorceCare groups"

#### Geographic Distribution

**Visualization:** Map with member density clusters

- Plot members by city/postal code
- Color-coded density (darker = more members)
- Identify geographic clusters

**Actionable Insights:**
- "47 members live in the Northside area - potential new outreach location"
- "Average commute distance: 12 miles. Consider satellite campuses in these areas: [list]"

#### Membership Tenure

**Visualization:** Stacked bar chart by year joined

| Tenure | Definition | Count | % |
|--------|------------|-------|---|
| New | 0-1 years | 89 | 22% |
| Establishing | 1-3 years | 124 | 31% |
| Established | 3-5 years | 78 | 19% |
| Core | 5-10 years | 67 | 17% |
| Legacy | 10+ years | 44 | 11% |

**Actionable Insight:**
- "62% of your members joined in the last 3 years - prioritize assimilation pathways"

#### Center/Campus Distribution

**Visualization:** Bar chart comparing locations

- Members by membership center
- Growth rate by location
- Engagement score by location

#### Previous Denomination Analysis

**Visualization:** Pie chart of religious backgrounds

- Track where members came from
- Identify assimilation needs for different backgrounds
- "34% of members came from Catholic background - consider bridge programming"

#### Data Sources Required

```
- members (birthday, gender, marital_status, address_*, membership_date, membership_center_id)
- membership_center (name, is_primary)
- religious_denominations (name)
```

---

### 3. Engagement Analytics

**Route:** `/admin/insights/engagement`
**Purpose:** Identify WHO is engaged and WHO is drifting away
**Target Users:** Pastors, Care Team, Group Leaders

#### Engagement Tier System

| Tier | Definition | Visual | Action |
|------|------------|--------|--------|
| **Highly Engaged** | Attended 3+/month, serving, in group | Green | Celebrate & mobilize for leadership |
| **Engaged** | Attended 2+/month, in group OR serving | Blue | Encourage continued growth |
| **Occasional** | Attended 1-2/month | Yellow | Personal outreach |
| **Disengaging** | No attendance 30-60 days | Orange | Urgent: Personal contact |
| **Inactive** | No attendance 60+ days | Red | Recovery outreach campaign |

**Visualization:** Funnel or stacked bar showing tier distribution

#### Engagement Tier Drill-Down

Each tier is clickable to reveal:
- Member list with photos, names, contact info
- Last attendance date
- Group membership status
- Serving status
- Quick actions: Add care plan, Send message, Export

#### Filter Capabilities

| Filter | Options |
|--------|---------|
| Center/Campus | All locations or specific |
| Membership Stage | Active, Inactive, New, etc. |
| Primary Group | Any group or specific |
| Age Range | Custom range or generation |
| Membership Tenure | New, Established, Core, etc. |
| Tags | Any assigned tags |

#### Tier Migration Analysis

**Visualization:** Sankey diagram or flow chart

Track monthly movement between tiers:
- Who moved UP (green arrows) - celebrate
- Who moved DOWN (red arrows) - intervene
- Trend line showing overall engagement health

#### Seasonal Pattern Detection

**Visualization:** Heat map calendar

- Identify predictable dips (summer, holidays)
- Plan proactive outreach before typical drop-off periods
- Compare year-over-year patterns

#### Data Sources Required

```
- members (last_attendance_date, attendance_rate, small_groups, serving_team)
- member_serving_assignments (team_name, is_active)
- family_members (group membership tracking)
- member_tags (for filtering)
```

---

### 4. Discipleship Pipeline

**Route:** `/admin/insights/discipleship`
**Purpose:** Track spiritual growth across the congregation
**Target Users:** Discipleship Pastor, Small Group Director, Leadership Development

#### Growth Pathway Funnel

**Visualization:** Vertical funnel with conversion rates

```
┌─────────────────────────────────────┐
│         Visitors (142)              │
└──────────────────┬──────────────────┘
                   │ 67% convert
┌──────────────────▼──────────────────┐
│       New Members (95)              │
└──────────────────┬──────────────────┘
                   │ 72% begin pathway
┌──────────────────▼──────────────────┐
│     Foundation Track (68)           │
└──────────────────┬──────────────────┘
                   │ 85% complete
┌──────────────────▼──────────────────┐
│      Growth Track (58)              │
└──────────────────┬──────────────────┘
                   │ 76% advance
┌──────────────────▼──────────────────┐
│  Leadership Development (44)        │
└──────────────────┬──────────────────┘
                   │ 68% commissioned
┌──────────────────▼──────────────────┐
│     Serving Leaders (30)            │
└─────────────────────────────────────┘
```

Each stage is clickable to see member lists.

#### Pathway Stage Metrics

| Pathway Stage | Count | Avg. Time | Completion Rate | Bottleneck? |
|---------------|-------|-----------|-----------------|-------------|
| Foundation | 68 | 6 weeks | 85% | No |
| Growth | 58 | 12 weeks | 76% | Watch |
| Leadership | 44 | 16 weeks | 68% | **Yes** |

**Actionable Insight:**
- "Leadership Development has lowest completion rate. Review curriculum or mentorship model."

#### Spiritual Gifts Distribution

**Visualization:** Horizontal bar chart

| Gift | Members | Currently Serving | Gap |
|------|---------|-------------------|-----|
| Teaching | 45 | 12 | 33 untapped |
| Administration | 38 | 28 | 10 untapped |
| Hospitality | 52 | 41 | 11 untapped |
| Mercy | 29 | 8 | 21 untapped |
| Leadership | 23 | 19 | 4 untapped |

**Actionable Insight:**
- "45 members have teaching gifts but only 12 serve in teaching roles. Opportunity for small group leaders."

#### Ministry Interests Analysis

**Visualization:** Tag cloud or bar chart

- Show most common ministry interests
- Compare interests vs. actual serving assignments
- Identify gaps and opportunities

#### Baptism & Salvation Tracking

**Visualization:** Year-over-year comparison

| Metric | This Year | Last Year | Change |
|--------|-----------|-----------|--------|
| Salvations | 34 | 28 | +21% |
| Baptisms | 42 | 38 | +11% |
| Awaiting Baptism | 8 | - | - |

**Drill-down lists:**
- Members who trusted Christ in last 90 days
- Members awaiting baptism (action: schedule)
- Baptism anniversaries this month (celebration opportunity)

#### Next Steps Dashboard

| Status | Count | Action |
|--------|-------|--------|
| Next step assigned (active) | 89 | Monitor |
| Completed this month | 23 | Celebrate |
| Stalled (60+ days) | 12 | Intervene |
| No next step assigned | 156 | Assign |

#### Data Sources Required

```
- members (spiritual_gifts, ministry_interests, discipleship_pathways, discipleship_next_step)
- members (date_trusted_christ, baptism_date, baptized_by_immersion)
- member_discipleship_plans (pathway, status, next_step, target_date)
- member_discipleship_milestones (name, milestone_date, celebrated_at)
```

---

### 5. Ministry & Serving Analysis

**Route:** `/admin/insights/ministry`
**Purpose:** Understand serving capacity and ministry interest alignment
**Target Users:** Ministry Directors, Volunteer Coordinator, HR/Staff

#### Ministry Interest Heat Map

**Visualization:** Matrix showing interest vs. serving

|  | Interested | Serving | Gap |
|--|------------|---------|-----|
| Children's Ministry | 47 | 12 | -35 |
| Worship Team | 23 | 18 | -5 |
| Hospitality | 56 | 52 | -4 |
| Tech/AV | 19 | 8 | -11 |
| Outreach | 34 | 15 | -19 |

**Actionable Insight:**
- "47 members expressed interest in Children's Ministry but only 12 are serving. Launch recruitment campaign."

#### Serving Team Health Dashboard

**Visualization:** Card grid with health indicators

| Team | Active | Needed | Status | Action |
|------|--------|--------|--------|--------|
| Kids Ministry | 12 | 20 | 🔴 Critical | Recruit |
| Worship Team | 8 | 10 | 🟡 Watch | Monitor |
| Hospitality | 25 | 25 | 🟢 Healthy | Maintain |
| Tech Team | 6 | 8 | 🟡 Watch | Recruit |
| Parking/Safety | 15 | 12 | 🟢 Healthy | Develop |

#### Volunteer Burnout Risk Analysis

**High Risk Indicators:**
- Serving in 3+ roles simultaneously
- Serving every week without rotation
- Serving 2+ years without break
- Recent care plan or life event

**Visualization:** Risk score list

| Member | Roles | Schedule | Tenure | Risk Level |
|--------|-------|----------|--------|------------|
| John D. | 4 | Weekly | 3 yrs | 🔴 High |
| Mary S. | 3 | Weekly | 2 yrs | 🟡 Medium |
| Bob T. | 2 | Bi-weekly | 1 yr | 🟢 Low |

#### Spiritual Gift → Ministry Matching

**Recommendation Engine:**

"Based on spiritual gifts and ministry interests, these members may be good fits:"

| Member | Gift | Interest | Suggested Ministry | Action |
|--------|------|----------|-------------------|--------|
| Sarah K. | Teaching | Youth | Youth Small Group Leader | Invite |
| Mike R. | Administration | Operations | Event Coordinator | Invite |
| Lisa M. | Mercy | Care | Hospital Visitation | Invite |

#### Volunteer Tenure & Succession Planning

**Visualization:** Tenure distribution by ministry

- Identify ministries dependent on long-tenured volunteers
- Flag succession risks
- Highlight apprenticeship needs

#### Data Sources Required

```
- members (spiritual_gifts, ministry_interests, serving_team, volunteer_roles)
- member_serving_assignments (team_name, role_name, status, start_on, is_primary)
- member_care_plans (for burnout risk assessment)
```

---

### 6. Groups & Connections

**Route:** `/admin/insights/groups`
**Purpose:** Ensure members are connected to community
**Target Users:** Small Groups Pastor, Connection Team, Assimilation Director

#### Connection Status Overview

**Visualization:** Large donut chart

| Status | Count | % | Color |
|--------|-------|---|-------|
| Connected (in group + serving) | 145 | 36% | Green |
| Partially Connected (group OR serving) | 89 | 22% | Blue |
| Not Connected | 168 | 42% | Orange |

**Actionable Insight:**
- "42% of your congregation is not connected to any group or serving team. This is your biggest assimilation opportunity."

#### Group Segmentation Analysis

**By Primary Group:**

| Group Type | Members | % of Total |
|------------|---------|------------|
| Life Groups | 156 | 39% |
| Bible Studies | 67 | 17% |
| Ministry Teams | 89 | 22% |
| Support Groups | 23 | 6% |
| No Group | 67 | 17% |

**By Number of Groups:**

| Groups | Members | Insight |
|--------|---------|---------|
| 0 groups | 168 | Priority outreach |
| 1 group | 145 | Encourage serving |
| 2 groups | 67 | Well connected |
| 3+ groups | 22 | Watch for burnout |

#### Group Health Metrics

| Group | Size | Growth | Attendance | Health |
|-------|------|--------|------------|--------|
| Smith Life Group | 12 | +2 | 85% | 🟢 |
| Downtown Bible Study | 8 | 0 | 70% | 🟡 |
| Young Adults | 25 | +5 | 60% | 🟡 |
| Empty Nesters | 6 | -2 | 90% | 🟡 |

**Flags:**
- Groups too small (<4) - merge candidates
- Groups too large (>15) - multiplication candidates
- Declining attendance - leader support needed

#### Connection Pathway Tracking

**Visualization:** Horizontal funnel

```
Visitor → Attended Event → Joined Group → Serving → Leading
  142        98 (69%)        67 (47%)     45 (32%)   12 (8%)
```

#### Unconnected Member Filters

Find unconnected members by:
- Membership tenure (prioritize new members)
- Age/generation (match to appropriate groups)
- Location (geographic group matching)
- Interests (affinity group matching)

**Example Query Results:**
- "34 members joined in the last 6 months and are not yet in a small group"
- "23 young adults (ages 18-25) are not connected to any group"

#### Family Connectivity Analysis

| Status | Families | Action |
|--------|----------|--------|
| Fully Connected (all members in groups) | 89 | Celebrate |
| Partially Connected | 56 | Connect remaining members |
| Not Connected | 34 | Family outreach |

#### Data Sources Required

```
- members (small_groups, primary_small_group, serving_team)
- family_members (for family connectivity)
- families (for family-level analysis)
- member_serving_assignments (for serving status)
```

---

### 7. Generosity & Stewardship

**Route:** `/admin/insights/giving`
**Purpose:** Understand giving patterns without exposing individual amounts
**Target Users:** Senior Pastor, Finance Committee, Stewardship Team
**Access Control:** Restricted to finance-authorized roles

#### Giving Unit Analysis

**Key Metrics (Aggregated, Not Individual):**

| Metric | Value | Trend |
|--------|-------|-------|
| Total Giving Units | 234 | +12 YoY |
| % Families with Active Giving | 67% | +3% |
| % with Recurring Giving | 45% | +8% |
| Average Gift Size | $XXX | +5% |

#### Giving Tier Distribution

**Visualization:** Pie chart (anonymous counts only)

| Tier | Definition | % of Givers | Count |
|------|------------|-------------|-------|
| First-time | First gift ever | 8% | 19 |
| Occasional | 1-3 gifts/year | 22% | 52 |
| Regular | Monthly giving | 45% | 105 |
| Committed | Weekly giving | 25% | 58 |

**No individual amounts displayed - only tier counts.**

#### Giving Trends

**Visualization:** Line chart with year-over-year comparison

- Monthly giving totals
- Seasonal patterns highlighted
- Year-over-year overlay
- Trend line projection

**Seasonal Insights:**
- "Giving typically dips 15% in July-August"
- "December giving is 140% of average month"

#### Pledge Campaign Dashboard

| Campaign | Goal | Pledged | Received | Fulfillment |
|----------|------|---------|----------|-------------|
| Building Fund | $500K | $450K | $380K | 84% |
| Missions 2026 | $100K | $95K | $72K | 76% |

**Drill-down (authorized users only):**
- List of pledge holders
- Fulfillment status by individual
- Pastoral outreach for unfulfilled pledges

#### Giving Correlation Insights

**Aggregated analysis (no individual data exposed):**

| Factor | Correlation with Giving |
|--------|------------------------|
| Group Participation | +45% more likely to give |
| Serving Involvement | +52% more likely to give |
| Attendance Frequency | +38% more likely to give |
| Membership Tenure (5+ yrs) | +28% higher average gift |

**Actionable Insight:**
- "Members who serve AND are in groups give 67% more consistently than those who aren't connected."

#### New Giver Tracking

- First-time givers this month
- Suggested follow-up (thank you note, next steps)
- Retention rate of new givers (do they give again?)

#### Data Sources Required

```
- member_giving_profiles (recurring_amount, recurring_frequency, last_gift_at, pledge_amount)
- members (giving_tier, giving_last_gift_at)
- financial_transactions (aggregated giving data)
```

---

### 8. Visitor Journey Analytics

**Route:** `/admin/insights/visitors`
**Purpose:** Optimize the front door experience
**Target Users:** Guest Services, Follow-Up Team, Outreach Pastor

#### Visitor Volume Metrics

| Period | First-Time Visitors | Return Rate |
|--------|---------------------|-------------|
| This Month | 47 | 68% |
| Last Month | 52 | 65% |
| This Quarter | 142 | 67% |
| YTD | 423 | 64% |

#### Visitor-to-Member Funnel

**Visualization:** Funnel with conversion rates

```
┌─────────────────────────────────────┐
│     First Visit (142 this quarter)  │
└──────────────────┬──────────────────┘
                   │ 68% return
┌──────────────────▼──────────────────┐
│        Second Visit (97)            │
└──────────────────┬──────────────────┘
                   │ 72% return
┌──────────────────▼──────────────────┐
│         Third Visit (70)            │
└──────────────────┬──────────────────┘
                   │ 80% connect
┌──────────────────▼──────────────────┐
│      Connected/Joined (56)          │
└─────────────────────────────────────┘

Overall Conversion Rate: 39%
Average Days to Membership: 67
```

#### Visitor Source Analysis

**Visualization:** Pie chart with drill-down

| Source | Count | % | Conversion Rate |
|--------|-------|---|-----------------|
| Member Invitation | 67 | 47% | 52% |
| Online Search | 34 | 24% | 38% |
| Social Media | 23 | 16% | 29% |
| Drive By | 12 | 8% | 42% |
| Community Event | 6 | 4% | 67% |

**Top Inviters Leaderboard:**
- John Smith - 8 guests this year (5 joined)
- Mary Johnson - 6 guests this year (4 joined)
- (Encourage and celebrate these members!)

#### Follow-Up Performance

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Time to First Contact | < 24 hrs | 18 hrs | 🟢 |
| Contact Attempt Rate | 100% | 94% | 🟡 |
| Successful Contact Rate | 80% | 72% | 🟡 |
| Second Visit Rate | 70% | 68% | 🟢 |

**Follow-Up Queue:**

| Visitor | First Visit | Status | Assigned To | Action |
|---------|-------------|--------|-------------|--------|
| Jane D. | 2 days ago | Pending | Unassigned | Assign |
| Mike T. | 3 days ago | Contacted | Sarah K. | Monitor |
| Lisa R. | 1 week ago | No Response | Bob M. | Escalate |

#### Conversion Insights

**By Day of First Visit:**
- Sunday AM: 72% conversion rate
- Sunday PM: 58% conversion rate
- Wednesday: 45% conversion rate

**By Season:**
- Easter visitors: 42% conversion
- Christmas visitors: 38% conversion
- Regular Sundays: 35% conversion

**By Demographic:**
- Families with kids: 56% conversion
- Young adults: 34% conversion
- Seniors: 48% conversion

#### Data Sources Required

```
- members (is_visitor, visitor_first_visit_date, visitor_how_heard, visitor_invited_by_*)
- members (visitor_follow_up_status, visitor_follow_up_notes, visitor_converted_to_member_date)
```

---

### 9. Care & Pastoral Dashboard

**Route:** `/admin/insights/care`
**Purpose:** Ensure no one falls through the cracks
**Target Users:** Care Pastor, Pastoral Team, Care Ministry Leaders

#### Active Care Plans Overview

**Visualization:** Status cards with counts

| Status | Count | Avg. Age | Action |
|--------|-------|----------|--------|
| Pending | 12 | 3 days | Assign |
| In Progress | 34 | 14 days | Monitor |
| Scheduled Visit | 8 | 7 days | Prepare |
| Follow-Up Due | 6 | Overdue | Urgent |
| Awaiting Response | 15 | 21 days | Re-contact |

#### Care Plans by Assigned Leader

| Leader | Active | Capacity | Load |
|--------|--------|----------|------|
| Pastor John | 12 | 15 | 80% |
| Pastor Sarah | 8 | 15 | 53% |
| Elder Bob | 14 | 10 | 140% 🔴 |
| Deacon Mary | 5 | 10 | 50% |

**Alert:** Elder Bob is over capacity. Reassign or add support.

#### Life Events This Week

**Celebrations:**

| Event | Members | Action |
|-------|---------|--------|
| Birthdays This Week | 12 | Send cards |
| Anniversaries This Week | 4 | Acknowledge |
| Membership Anniversaries | 8 | Celebrate |
| Baptism Anniversaries | 3 | Remember |

**Care Opportunities:**

| Event | Members | Action |
|-------|---------|--------|
| Recent Loss/Bereavement | 2 | Pastoral visit |
| Hospital/Illness | 3 | Visit/Call |
| New Baby | 1 | Meal train |
| Job Loss | 1 | Support |

#### At-Risk Member Identification

**Disengagement Risk:**

| Risk Factor | Members | Action |
|-------------|---------|--------|
| No attendance 30-60 days | 23 | Outreach call |
| No attendance 60+ days | 15 | Home visit |
| Attendance declining | 18 | Check in |
| Left small group | 7 | Follow up |
| Stopped serving | 12 | Conversation |

**Life Transition Risk:**

| Transition | Members | Suggested Care |
|------------|---------|----------------|
| Recently divorced | 3 | DivorceCare |
| Recently widowed | 2 | GriefShare |
| Empty nesters | 5 | Life stage group |
| New parents | 4 | Parent support |

#### Pastoral Notes Review

- Members with pastoral notes flagged for review
- Care plans needing supervisor review
- Escalated concerns

#### Data Sources Required

```
- member_care_plans (status_code, assigned_to_member_id, follow_up_at, priority)
- members (birthday, anniversary, membership_date, baptism_date)
- members (last_attendance_date, attendance_rate, marital_status)
- member_timeline_events (for life events tracking)
```

---

### 10. Custom Reports & Exports

**Route:** `/admin/insights/reports`
**Purpose:** Build custom views for specific needs
**Target Users:** All authorized staff

#### Report Builder

**Step 1: Select Data Fields**

Categories:
- [ ] Personal Info (name, contact, address)
- [ ] Demographics (age, gender, marital status)
- [ ] Membership (type, stage, center, date)
- [ ] Groups (primary, additional, small groups)
- [ ] Serving (team, role, schedule)
- [ ] Discipleship (pathway, stage, mentor)
- [ ] Giving (tier, recurring status - authorized only)
- [ ] Engagement (attendance, last activity)
- [ ] Tags

**Step 2: Apply Filters**

| Field | Operator | Value |
|-------|----------|-------|
| Membership Center | equals | Downtown Campus |
| Age | between | 25-40 |
| Primary Group | is not empty | - |
| Last Attendance | within | 30 days |

**Step 3: Sort & Group**

- Sort by: Last Name, First Name, Membership Date, Last Attendance
- Group by: Membership Center, Primary Group, Age Range

**Step 4: Save & Schedule**

- Save as template for reuse
- Schedule automated delivery (weekly/monthly email)
- Share with specific roles

#### Pre-Built Report Templates

| Report | Description | Schedule |
|--------|-------------|----------|
| New Members | Members joined last 30/60/90 days | Weekly |
| Inactive Members | No attendance 60+ days | Weekly |
| Birthday Report | Birthdays this week/month | Weekly |
| Anniversary Report | Anniversaries this month | Monthly |
| Volunteer Roster | Active volunteers by ministry | Monthly |
| Group Attendance | Group participation rates | Weekly |
| Care Plan Summary | Active care plans by status | Daily |
| Visitor Follow-Up | Visitors awaiting contact | Daily |

#### Export Options

| Format | Use Case |
|--------|----------|
| PDF | Formatted reports for printing/sharing |
| CSV | Data analysis in Excel/Sheets |
| Share Link | Time-limited secure link (expires in 24/48/72 hrs) |

#### Data Sources Required

```
- All member-related tables with appropriate joins
- Role-based field visibility enforcement
```

---

## Implementation Roadmap

### Phase 1: Foundation (Core Health Visibility)

**Pages:**
1. Church Health Dashboard
2. Engagement Analytics

**Value Delivered:**
- Immediate visibility into church health
- Actionable lists for pastoral outreach
- Trend awareness

**Data Requirements:**
- Attendance tracking must be active
- Member records must be current

**Estimated Complexity:** Medium

---

### Phase 2: Understanding (Demographics & Connections)

**Pages:**
3. Congregation Demographics
4. Groups & Connections

**Value Delivered:**
- Know WHO your church is
- Identify connection gaps
- Geographic insights for outreach

**Data Requirements:**
- Birthday data populated
- Address data current
- Group assignments tracked

**Estimated Complexity:** Medium

---

### Phase 3: Growth Tracking (Discipleship & Ministry)

**Pages:**
5. Discipleship Pipeline
6. Ministry & Serving Analysis

**Value Delivered:**
- Track spiritual growth
- Optimize volunteer placement
- Identify ministry gaps

**Data Requirements:**
- Discipleship pathways defined
- Spiritual gifts captured
- Serving assignments tracked

**Estimated Complexity:** High

---

### Phase 4: Front Door & Stewardship

**Pages:**
7. Visitor Journey Analytics
8. Generosity & Stewardship

**Value Delivered:**
- Optimize visitor conversion
- Understand giving health
- Improve follow-up processes

**Data Requirements:**
- Visitor tracking active
- Giving data integrated
- Follow-up workflows defined

**Estimated Complexity:** High

---

### Phase 5: Care & Flexibility

**Pages:**
9. Care & Pastoral Dashboard
10. Custom Reports & Exports

**Value Delivered:**
- Proactive pastoral care
- Custom reporting flexibility
- Export for external needs

**Data Requirements:**
- Care plan workflows active
- Timeline events tracked

**Estimated Complexity:** Medium-High

---

## Technical Considerations

### Role-Based Access Control

| Page | Roles with Access |
|------|-------------------|
| Church Health Dashboard | Pastor, Admin, Board |
| Demographics | Pastor, Admin, Ministry Leaders |
| Engagement Analytics | Pastor, Admin, Care Team |
| Discipleship Pipeline | Pastor, Discipleship Director |
| Ministry & Serving | Pastor, Ministry Directors, Volunteer Coord |
| Groups & Connections | Pastor, Groups Director |
| Giving & Stewardship | Pastor, Finance (restricted) |
| Visitor Journey | Pastor, Guest Services |
| Care & Pastoral | Pastor, Care Team (restricted) |
| Custom Reports | Based on field-level permissions |

### Performance Considerations

- Dashboard data should be cached/pre-computed
- Heavy aggregations run as background jobs
- Implement pagination for drill-down lists
- Consider materialized views for complex queries

### Data Privacy

- PII fields remain encrypted
- Giving data visible only to authorized roles
- Pastoral notes require elevated permissions
- Export audit logging required
- Share links must be time-limited and logged

### Metadata Framework Integration

All pages must follow the XML metadata framework:
- XML blueprints in `apps/web/metadata/authoring/blueprints/admin-insights/`
- Service handlers in `apps/web/src/lib/metadata/services/admin-insights.ts`
- Data binding through service contracts
- RBAC integration for component visibility

---

## Key Differentiators

### 1. No Excel Required
Professional visualizations built-in. Church leaders see polished dashboards, not raw data dumps.

### 2. Actionable, Not Just Informative
Every insight links to member lists. "23 members disengaging" → Click → See names → Add care plans.

### 3. Role-Based Access
Pastors see care data. Ministry leads see serving data. Finance sees giving data. Everyone sees only what they need.

### 4. Trend-Focused
Not just snapshots, but trajectories. "Your engagement is trending down 3% month-over-month."

### 5. Privacy-Conscious
Aggregate views for sensitive data. Individual drill-down only for authorized roles with audit logging.

### 6. Integrated Workflows
Insights connect to actions. Find disengaging members → Create care plans → Track follow-up → Measure recovery.

---

## Success Metrics

### Adoption Metrics
- % of church admins using insights weekly
- Average time spent on dashboards
- Most-viewed pages/reports

### Outcome Metrics
- Reduction in "inactive without contact" members
- Improvement in visitor conversion rate
- Increase in connected members (in groups + serving)
- Care plan response time improvement

### Data Quality Metrics
- % of members with complete profiles
- % of members with attendance tracked
- % of members with discipleship pathway assigned

---

## Appendix A: Data Model Summary

See `CLAUDE.md` and database migrations for complete schema details.

**Core Tables:**
- `members` - Primary member data
- `membership_type`, `membership_stage`, `membership_center` - Lookup tables
- `families`, `family_members` - Family relationships
- `member_care_plans`, `member_discipleship_plans` - Care and growth tracking
- `member_serving_assignments` - Volunteer management
- `member_tags`, `member_timeline_events` - Tagging and activity
- `member_giving_profiles` - Financial profiles

**Key Fields for Analytics:**
- Demographics: `birthday`, `gender`, `marital_status`, `address_*`
- Membership: `membership_type_id`, `membership_status_id`, `membership_center_id`, `membership_date`
- Engagement: `attendance_rate`, `last_attendance_date`, `small_groups`, `serving_team`
- Discipleship: `spiritual_gifts`, `ministry_interests`, `discipleship_pathways`
- Giving: `giving_tier`, `giving_last_gift_at`, `giving_recurring_amount`
- Visitor: `is_visitor`, `visitor_first_visit_date`, `visitor_follow_up_status`

---

## Appendix B: Component Library

Recommended visualization components for the insights module:

| Component | Use Case |
|-----------|----------|
| `MetricCard` | Single KPI with trend indicator |
| `DonutChart` | Distribution breakdowns |
| `BarChart` | Comparisons across categories |
| `LineChart` | Trends over time |
| `FunnelChart` | Conversion pipelines |
| `HeatMap` | Calendar patterns, geographic density |
| `DataTable` | Drill-down member lists |
| `SankeyDiagram` | Flow/migration analysis |
| `ProgressBar` | Goal tracking, capacity |
| `AlertCard` | Action items requiring attention |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude | Initial proposal |

---

*This document serves as the specification for the Church Insights & Analytics module. Implementation should follow the phases outlined and adhere to the StewardTrack metadata framework architecture.*
