# Licensing Studio Workflows

**Common Scenarios and Step-by-Step Solutions**

---

## Table of Contents

1. [Manually Assigning Licenses to New Churches](#workflow-1-manually-assigning-licenses-to-new-churches)
2. [Launching a New Product Tier](#workflow-2-launching-a-new-product-tier)
3. [Adding Premium Features](#workflow-3-adding-premium-features)
4. [Migrating Churches to New Plans](#workflow-4-migrating-churches-to-new-plans)
5. [Running a Limited-Time Promotion](#workflow-5-running-a-limited-time-promotion)
6. [Decommissioning an Old Plan](#workflow-6-decommissioning-an-old-plan)
7. [Monthly Reporting](#workflow-7-monthly-reporting)

---

## Workflow 1: Manually Assigning Licenses to New Churches

### Scenario
A new church has signed up and you need to manually assign them the Professional Plan with a promotional discount noted in the system.

### Timeline: ~5 minutes per church

### Steps

#### Part 1: Gather Information (1 min)

1. **Confirm Church Details**
   - Church name and organization
   - Desired plan/tier
   - Any special notes (promotion, discount, trial period)
   - Contact person

2. **Verify Church Exists in System**
   - Go to License Assignments tab
   - Look for the church in the table
   - If not found, church may need to be created first

#### Part 2: Assign the License (3 min)

3. **Open Assignment Wizard**
   - Click **"Assign New License"** button (top right)
   - Two-step wizard appears

4. **Step 1: Select Church & Offering**
   - **Church Dropdown**:
     - Type church name to search
     - Select the correct church
     - Note: Shows current plan if any

   - **Offering Dropdown**:
     - Select "Professional Plan" (or desired tier)
     - See plan details: price, features, limits
     - Click **"Next"**

5. **Step 2: Review & Confirm**
   - **Review Feature Changes**:
     - ✅ Green checkmarks = Features being granted
     - ❌ Red X marks = Features being removed (if changing plans)
     - 📝 Gray = Features staying the same

   - **Add Assignment Note**:
     ```
     Example notes:
     - "New church signup - Professional tier with 20% promotional discount"
     - "Initial license assignment - Standard pricing"
     - "Requested upgrade from sales team - Quote #12345"
     ```

   - Click **"Assign License"**

6. **Confirm Success**
   - Success message appears
   - Church row updates with new offering
   - Features are immediately available to church users

#### Part 3: Follow-Up (1 min)

7. **Verify Assignment**
   - Find the church in the table
   - Confirm "Current Offering" column shows correct plan
   - Expand the row (click ">" arrow) to view history
   - Verify assignment appears with your email and note

8. **Notify Church Admin** (optional)
   - Send welcome email
   - Include login instructions
   - Highlight key features they now have access to

### Common Variations

**Scenario A: Upgrading an Existing Church**
- Same steps, but Step 2 will show:
  - Features being added (upgrade)
  - Features staying the same
  - Note: "Upgrade from Starter to Professional - requested by pastor"

**Scenario B: Downgrading a Church**
- Same steps, but Step 2 will show:
  - Features being removed (red X marks)
  - Features staying the same
  - ⚠️ Important: Add clear note explaining downgrade reason
  - Example note: "Downgrade to Starter - church requested due to budget"

**Scenario C: Trial Assignment**
- Assign trial plan
- Note: "30-day trial - expires [date]"
- Set calendar reminder to follow up before expiration

### Success Criteria
- ✅ Church appears in License Assignments table with correct offering
- ✅ Assignment history shows your action with timestamp
- ✅ Church admin can access features immediately
- ✅ Assignment note clearly documents the reason

### Troubleshooting

**Problem**: Church not in dropdown
- **Solution**: Church may need to be created in system first

**Problem**: Feature changes not loading
- **Solution**: Wait 2-3 seconds, or click Back then Next again

**Problem**: Assignment fails
- **Solution**: Check error message, verify church and offering exist, try again

---

## Workflow 2: Launching a New Product Tier

### Scenario
You want to launch a "Growth Plan" between Starter and Professional at $49/month.

### Timeline: ~30 minutes

### Steps

#### Part 1: Create the Feature Bundle (10 min)

1. **Go to Feature Bundles**
2. **Create "Growth Bundle"**
   - Name: `Growth Church Bundle`
   - Type: `core`
   - Category: `foundation`
   - Description: `Essential features for growing churches`
   - Is Active: ✓

3. **Add Features to Bundle**
   - ✓ Member Management
   - ✓ Event Calendar & Registration
   - ✓ Online Giving
   - ✓ Email Communication
   - ✓ Basic Reporting
   - ✓ Mobile Access

4. **Save and Verify**
   - Confirm all features are listed
   - Check that bundle shows "6 features"

#### Part 2: Create the Product Offering (10 min)

5. **Go to Product Offerings**
6. **Create New Offering**
   ```
   Name: Growth Plan
   Code: growth_plan (auto-generated)
   Description: Perfect for churches with 100-250 members who want to grow their engagement

   Tier: Professional
   Type: subscription
   Base Price: 49
   Currency: USD
   Billing Cycle: monthly

   Max Users: 100
   Max Tenants: 1

   Is Active: ✓
   Is Featured: ✓ (if this is your recommended plan)
   Sort Order: 2 (between Starter=1 and Pro=3)
   ```

7. **Link the Feature Bundle**
   - Add "Growth Church Bundle"
   - Mark as required

8. **Save and Test**

#### Part 3: Announce and Monitor (10 min)

9. **Create Announcement**
   - Email existing customers
   - Update website pricing page
   - Add to signup flow

10. **Monitor Adoption**
    - Go to Analytics tab
    - Watch "Subscriptions by Tier"
    - Track signups daily for first week

### Success Criteria
- ✅ New plan appears on pricing page
- ✅ Churches can select it during signup
- ✅ All features work for new subscribers
- ✅ Analytics show the new tier

---

## Workflow 3: Adding Premium Features

### Scenario
You've developed "Advanced Reporting" and want to add it to Professional and Enterprise plans only.

### Timeline: ~20 minutes

### Steps

#### Part 1: Create the Feature Bundle (5 min)

1. **Go to Feature Bundles**
2. **Create "Advanced Reporting Bundle"**
   ```
   Name: Advanced Reporting
   Type: add_on
   Category: reporting
   Description: Custom reports, advanced analytics, and data exports
   Is Active: ✓
   ```

3. **Add Features**
   - ✓ Custom Report Builder
   - ✓ Advanced Analytics Dashboard
   - ✓ Data Export (CSV, Excel)
   - ✓ Scheduled Reports
   - ✓ Trend Analysis

#### Part 2: Add to Existing Plans (10 min)

4. **Go to Product Offerings**
5. **Edit Professional Plan**
   - Click pencil icon on "Professional Plan"
   - Scroll to "Feature Bundles"
   - Add "Advanced Reporting" bundle
   - Click Update

6. **Edit Enterprise Plan**
   - Same steps as Professional
   - Add "Advanced Reporting" bundle
   - Click Update

7. **Verify Starter Plan Does NOT Have It**
   - View Starter Plan
   - Confirm Advanced Reporting is NOT listed

#### Part 3: Notify Customers (5 min)

8. **Send Announcement**
   - Email Professional/Enterprise customers
   - "New Feature Available: Advanced Reporting"
   - Include quick start guide

9. **Update Documentation**
   - Add to feature comparison chart
   - Update help docs
   - Create tutorial video

### Success Criteria
- ✅ Pro/Enterprise customers see new features
- ✅ Starter customers do NOT see new features
- ✅ Feature adoption tracked in Analytics
- ✅ No access errors reported

---

## Workflow 4: Migrating Churches to New Plans

### Scenario
You're discontinuing "Basic Plan" ($19/month) and moving churches to "Starter Plan" ($29/month).

### Timeline: ~2 hours (+ customer communication time)

### Steps

#### Part 1: Preparation (30 min)

1. **Identify Affected Churches**
   - Go to License Assignments
   - Filter by "Basic Plan"
   - Export list (take screenshot)
   - Count total: _____ churches

2. **Compare Plans**
   - List features in Basic Plan
   - List features in Starter Plan
   - Identify any gaps
   - Document changes

3. **Create Migration Plan**
   ```
   From: Basic Plan ($19/mo)
   To: Starter Plan ($29/mo)
   Price Increase: $10/month
   Feature Additions: [list new features]
   Timeline: 30 days notice
   Grandfathering: [decide policy]
   ```

#### Part 2: Customer Communication (1 hour)

4. **Send Advance Notice (Day 0)**
   - Email all Basic Plan churches
   - Subject: "Important: Plan Update in 30 Days"
   - Explain changes
   - Highlight new features
   - Offer assistance

5. **Send Reminder (Day 15)**
   - Follow-up email
   - "15 Days Until Plan Migration"
   - Answer FAQs
   - Provide support contact

6. **Send Final Notice (Day 25)**
   - Last reminder
   - "5 Days Until Plan Migration"
   - Confirm migration date

#### Part 3: Execute Migration (30 min)

7. **Day 30: Perform Migration**

   **Using the Manual License Assignment Feature:**

   For each church on the Basic Plan:

   a. **Go to License Assignments Tab**

   b. **Click "Assign New License"**

   c. **Step 1 - Select Church & Offering:**
      - Church: Select the church from dropdown
      - Offering: Select "Starter Plan"
      - Click "Next"

   d. **Step 2 - Review & Confirm:**
      - Review features being added (should show new features in green)
      - Add note: "Migration from Basic Plan - 30 day notice provided"
      - Click "Assign License"

   e. **Send Confirmation Email** to church admin

   f. **Repeat for all churches** (or batch process if many churches)

   **Pro Tip:** Keep a checklist of churches to track migration progress.

8. **Verify Migration**
   - Check License Assignments tab
   - Confirm all previously Basic Plan churches now show "Starter Plan"
   - Expand a few church rows to view assignment history
   - Test feature access for 2-3 sample churches

9. **Deactivate Old Plan**
   - Go to Product Offerings
   - Edit "Basic Plan"
   - Uncheck "Is Active"
   - Click Update
   - The plan is now hidden from new signups but history is preserved

#### Part 4: Post-Migration (as needed)

10. **Monitor for Issues**
    - Watch support tickets
    - Check for access problems
    - Respond to complaints
    - Fix any errors immediately

11. **Update Documentation**
    - Remove Basic Plan from pricing page
    - Update sales materials
    - Archive old plan documentation

### Success Criteria
- ✅ All churches migrated successfully
- ✅ No loss of service
- ✅ All features working
- ✅ Minimal customer complaints (<5%)
- ✅ Old plan deactivated

---

## Workflow 5: Running a Limited-Time Promotion

### Scenario
Black Friday sale: 50% off Professional Plan for 3 days.

### Timeline: ~45 minutes setup + monitoring

### Steps

#### Part 1: Create Promotional Offering (20 min)

1. **Go to Product Offerings**
2. **Clone Existing Professional Plan**
   - Copy all settings from Professional Plan
   - Give it a new name

3. **Create "Black Friday Professional Plan"**
   ```
   Name: Black Friday Professional Plan
   Code: black_friday_pro_2025
   Description: LIMITED TIME: Professional Plan at 50% off!

   Tier: Professional
   Type: subscription
   Base Price: 49.50 (was 99)
   Billing Cycle: monthly

   [Same features as regular Professional]

   Is Active: ✓ (only during sale)
   Is Featured: ✓
   Sort Order: 0 (show first)
   ```

4. **Add Metadata**
   - In metadata field: `{"promotion": "black_friday_2025", "discount": 50, "expires": "2025-11-27"}`

#### Part 2: Schedule Activation (15 min)

5. **Set Reminders**
   - Calendar: Nov 24, 12:00 AM - Activate
   - Calendar: Nov 27, 11:59 PM - Deactivate
   - Set phone alarms

6. **Prepare Marketing**
   - Update website banner
   - Prepare email blast
   - Social media posts ready
   - Ad campaign scheduled

#### Part 3: Launch Day (10 min)

7. **Nov 24, 12:00 AM: Go Live**
   - Verify promo plan is Active
   - Hide or deactivate regular Professional Plan (temporarily)
   - Send marketing emails
   - Post on social media

8. **Monitor Signups**
   - Watch Analytics every hour
   - Track conversion rate
   - Celebrate new signups!

#### Part 4: Close Promotion (10 min)

9. **Nov 27, 11:59 PM: End Sale**
   - Deactivate "Black Friday Professional Plan"
   - Reactivate regular Professional Plan
   - Update website (remove sale banner)

10. **Send "Last Chance" Reminder**
    - 6 hours before deadline
    - Create urgency
    - "Sale ends tonight at midnight!"

#### Part 5: Post-Promotion (as needed)

11. **Review Results**
    - Count new signups
    - Calculate revenue
    - Analyze conversion rate
    - Document lessons learned

12. **Grandfathering Decision**
    - Option A: Keep promotional price for life
    - Option B: Increase to regular price after 12 months
    - Option C: Increase to regular price immediately
    - Document your policy

### Success Criteria
- ✅ Sale activated on time
- ✅ X new signups achieved
- ✅ No pricing errors
- ✅ Sale ended on schedule
- ✅ Results documented

---

## Workflow 6: Decommissioning an Old Plan

### Scenario
"Legacy Plan" is outdated and you want to remove it entirely.

### Timeline: ~3 months (30-day notice + 60-day grace period)

### Steps

#### Phase 1: Assessment (Week 1)

1. **Identify Impact**
   - Go to License Assignments
   - Count churches on Legacy Plan: _____
   - Estimate monthly revenue: $____
   - List affected features

2. **Choose Replacement**
   - Which plan will customers move to?
   - Professional Plan ($99/mo)
   - Will you offer discount for migration?

3. **Calculate Financial Impact**
   - Current MRR from Legacy: $____
   - Projected MRR after migration: $____
   - Potential churn: ____%

#### Phase 2: Communication (Month 1)

4. **Week 1: Announcement**
   - Email subject: "Important: Legacy Plan Retirement Notice"
   - Explain why (outdated, better options available)
   - Present migration options
   - Offer transition support

5. **Week 2: Follow-Up**
   - Personal calls to largest customers
   - Answer questions
   - Address concerns
   - Offer incentives (if needed)

6. **Week 3: Reminder**
   - Second email
   - Deadline reminder: "30 days remaining"
   - Highlight benefits of new plan

7. **Week 4: Final Notice**
   - Last email before cutoff
   - "One week remaining"
   - Urgency: "Act now to choose your plan"

#### Phase 3: Forced Migration (Month 2)

8. **Day 30: Deactivate for New Signups**
   - Go to Product Offerings
   - Edit Legacy Plan
   - Uncheck "Is Active"
   - Existing customers keep access

9. **Days 31-60: Grace Period**
   - Legacy customers still active
   - Weekly reminders to migrate
   - Personal outreach to holdouts
   - Offer assistance

#### Phase 4: Final Shutdown (Month 3)

10. **Day 60: Forced Migration**
    - For remaining customers:
      - Automatically move to chosen plan
      - Or apply default (Professional Plan)
    - Send confirmation emails
    - Provide immediate support

11. **Day 61: Verify Completion**
    - Check License Assignments
    - Confirm zero churches on Legacy Plan
    - Resolve any errors

12. **Day 65: Archive Plan**
    - Delete the Legacy Plan offering
    - Archive documentation
    - Update all marketing materials

#### Phase 5: Post-Decommission (Ongoing)

13. **Monitor Churn**
    - Track cancellations
    - Reach out to at-risk customers
    - Offer retention deals if needed

14. **Document Lessons**
    - What went well?
    - What could improve?
    - Update procedures for next time

### Success Criteria
- ✅ All customers migrated
- ✅ Churn < 10%
- ✅ MRR maintained or increased
- ✅ No service disruptions
- ✅ Plan fully removed

---

## Workflow 7: Monthly Reporting

### Scenario
It's the first of the month and you need to generate reports for management.

### Timeline: ~15 minutes

### Steps

#### Part 1: Gather Data (5 min)

1. **Open Licensing Studio**
2. **Go to Analytics Tab**
3. **Take Screenshots**
   - Overview cards (Total Offerings, Bundles, Subscriptions)
   - Subscriptions by Tier chart
   - Feature Adoption table
   - Save as: `licensing-report-2025-10.png`

#### Part 2: Calculate Metrics (5 min)

4. **Record Numbers**
   ```
   Month: October 2025

   Total Active Subscriptions: ___
   New Signups This Month: ___
   Cancellations This Month: ___
   Net Growth: ___

   By Tier:
   - Starter: ___ churches (__%)
   - Professional: ___ churches (__%)
   - Enterprise: ___ churches (__%)

   Total MRR: $_____
   Growth Rate: +__%
   ```

5. **Top Features**
   - List top 5 most-used features
   - Note adoption percentages
   - Identify underused features

#### Part 3: Create Report (5 min)

6. **Write Summary**
   ```
   LICENSING REPORT - OCTOBER 2025

   Executive Summary:
   - Total Subscriptions: ___ (+_% from last month)
   - Monthly Recurring Revenue: $_____
   - Most Popular Tier: Professional (___)
   - Feature Adoption Leader: Member Management (100%)

   Highlights:
   - [Note any significant changes]
   - [New plan launches]
   - [Customer feedback]

   Action Items:
   - [Plans for next month]
   - [Features to promote]
   - [Issues to address]
   ```

7. **Share Report**
   - Email to management
   - Post in team channel
   - Archive for records

### Recurring Tasks Checklist

**Monthly (1st of month):**
- [ ] Generate Analytics report
- [ ] Calculate MRR
- [ ] Review tier distribution
- [ ] Check feature adoption
- [ ] Send report to management

**Quarterly (every 3 months):**
- [ ] Review all product offerings
- [ ] Analyze pricing effectiveness
- [ ] Survey customer satisfaction
- [ ] Plan new features/bundles
- [ ] Update documentation

**Annually (once per year):**
- [ ] Comprehensive pricing review
- [ ] Competitive analysis
- [ ] Customer interviews
- [ ] Feature roadmap planning
- [ ] Decommission outdated plans

---

## Tips for Success

### Before Starting Any Workflow

1. **Backup First** - Take screenshots of current state
2. **Test on Staging** - If available, test changes first
3. **Communicate** - Notify stakeholders before major changes
4. **Document** - Write down what you're about to do
5. **Schedule** - Pick low-traffic times for changes

### During Execution

1. **Go Slow** - Rush causes mistakes
2. **Double-Check** - Verify each step before moving on
3. **Screenshot** - Capture evidence of each stage
4. **Ask Questions** - When unsure, ask for help
5. **Stay Calm** - Most issues are fixable

### After Completion

1. **Verify** - Test that everything works
2. **Monitor** - Watch for issues in next 24 hours
3. **Collect Feedback** - Ask customers how it went
4. **Document** - Record what worked and what didn't
5. **Improve** - Update procedures for next time

---

## Need Help?

📚 **Full Manual**: [Licensing Studio User Guide](./licensing-studio-user-guide.md)
🚀 **Quick Start**: [5-Minute Quick Start](./licensing-studio-quick-start.md)
💬 **Support**: support@stewardtrack.com

---

*Last updated: October 4, 2025*
