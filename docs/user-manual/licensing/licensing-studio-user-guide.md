# Licensing Studio User Manual

**Version 1.0** | **Last Updated**: October 4, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Product Offerings Management](#product-offerings-management)
4. [Feature Bundles Management](#feature-bundles-management)
5. [License Assignments](#license-assignments)
6. [Analytics Dashboard](#analytics-dashboard)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)
10. [Support](#support)

---

## Introduction

### What is the Licensing Studio?

The Licensing Studio is StewardTrack's powerful administrative tool that allows you to manage your church management software's licensing system. Think of it as your control center for:

- **Creating pricing plans** (Starter, Professional, Enterprise)
- **Organizing features** into reusable bundles
- **Assigning licenses** to churches (tenants)
- **Monitoring usage** and adoption metrics

### Who Should Use This?

This tool is designed for:
- **Product Owners** - Managing product offerings and pricing
- **System Administrators** - Assigning licenses to churches
- **Business Analysts** - Monitoring adoption and usage trends

### What You'll Need

Before you begin, make sure you have:
- ✅ Admin access to StewardTrack
- ✅ A web browser (Chrome, Firefox, Safari, or Edge)
- ✅ Basic understanding of your church software features

---

## Getting Started

### Accessing the Licensing Studio

1. **Log in to StewardTrack**
   - Go to your StewardTrack admin dashboard
   - Use your administrator credentials

2. **Navigate to Licensing Studio**
   - Click on **"Administration"** in the sidebar
   - Select **"Licensing Studio"** from the menu
   - You'll see a dashboard with four main tabs

### Understanding the Interface

The Licensing Studio has four main sections (tabs):

| Tab | Purpose | What You'll Do |
|-----|---------|----------------|
| **Product Offerings** | Manage subscription plans | Create/edit pricing tiers |
| **Feature Bundles** | Organize features into groups | Group related features together |
| **License Assignments** | Assign plans to churches | Match churches with their subscriptions |
| **Analytics** | View usage statistics | Monitor adoption and trends |

---

## Product Offerings Management

### What is a Product Offering?

A **Product Offering** is a subscription plan that you sell to churches. For example:
- **Starter Plan** - $0/month for small churches
- **Professional Plan** - $99/month for growing churches
- **Enterprise Plan** - Custom pricing for large churches

### Viewing All Offerings

1. Click on the **"Product Offerings"** tab
2. You'll see a table with all your current plans
3. Each row shows:
   - Plan name (e.g., "Professional Plan")
   - Tier (Starter, Professional, Enterprise, Custom)
   - Type (subscription, one_time, trial)
   - Price and billing cycle
   - User limits and features
   - Status (Active/Inactive)

### Creating a New Product Offering

**Step-by-step guide:**

1. **Click the "Create Offering" Button**
   - Located in the top-right of the Product Offerings tab

2. **Fill Out the Form**

   **Basic Information:**
   - **Name**: Give your plan a descriptive name
     - Example: "Professional Plan"
   - **Code**: A unique identifier (auto-generated from name)
     - Example: "professional_plan"
   - **Description**: Explain what this plan includes
     - Example: "Perfect for growing churches with 100-500 members"

   **Pricing Details:**
   - **Tier**: Choose the tier level
     - Options: Starter, Professional, Enterprise, Custom
   - **Type**: Select the offering type
     - `subscription` - Recurring monthly/annual payment
     - `one_time` - Single payment
     - `trial` - Free trial period
   - **Base Price**: Enter the price (in dollars)
     - Example: `99` for $99
   - **Billing Cycle**: Choose how often to charge
     - Options: Monthly, Annual, Lifetime

   **Limits:**
   - **Max Users**: Maximum number of users allowed
     - Enter `-1` for unlimited
     - Example: `100` for 100 users
   - **Max Tenants**: Number of church locations
     - Usually `1` for single church, `-1` for multi-campus

   **Visibility:**
   - **Is Active**: Check to make it available for signup
   - **Is Featured**: Check to highlight this plan (shows "Most Popular" badge)

3. **Click "Create"**
   - Wait for the confirmation message
   - Your new offering will appear in the table

### Editing an Existing Offering

1. Find the offering in the table
2. Click the **pencil icon** (✏️) in the Actions column
3. Update any fields you want to change
4. Click **"Update"**
   - Note: The code cannot be changed after creation

### Deleting an Offering

⚠️ **Warning**: Deleting an offering cannot be undone!

1. Find the offering you want to remove
2. Click the **trash icon** (🗑️) in the Actions column
3. Confirm the deletion when prompted
4. The offering will be removed

### Best Practices for Product Offerings

✅ **DO:**
- Create clear, descriptive names (e.g., "Starter Plan for Small Churches")
- Set realistic user limits based on church size
- Use the "Featured" flag for your most popular plan
- Keep pricing competitive and transparent

❌ **DON'T:**
- Delete offerings that have active subscribers
- Change prices without notifying existing customers
- Create too many similar tiers (confuses customers)
- Leave offerings active if they're not ready

---

## Feature Bundles Management

### What is a Feature Bundle?

A **Feature Bundle** is a group of related features that you can assign together. Think of it as a "package" of capabilities.

**Examples:**
- **Foundation Bundle** - Basic features (members, events, giving)
- **Communication Bundle** - Email, SMS, notifications
- **Advanced Reporting** - Analytics, custom reports, exports

### Why Use Feature Bundles?

Instead of assigning features one-by-one, bundles allow you to:
- ✅ Group related features together
- ✅ Reuse the same groups across multiple plans
- ✅ Quickly grant or revoke multiple features at once
- ✅ Keep your licensing organized and maintainable

### Viewing Feature Bundles

1. Click on the **"Feature Bundles"** tab
2. You'll see all existing bundles in a table
3. Each row shows:
   - Bundle name
   - Type (core, add_on, module, custom)
   - Category (foundation, engagement, admin, etc.)
   - Number of features in the bundle
   - Status (Active/Inactive)

### Creating a New Feature Bundle

**Step-by-step guide:**

1. **Click "Create Bundle"**
   - Button in the top-right corner

2. **Fill Out the Bundle Details**

   **Basic Information:**
   - **Name**: Descriptive name for the bundle
     - Example: "Advanced Reporting Bundle"
   - **Code**: Unique identifier (auto-generated)
     - Example: "advanced_reporting_bundle"
   - **Description**: What features are included
     - Example: "Custom reports, exports, and analytics dashboards"

   **Classification:**
   - **Type**: Choose the bundle type
     - `core` - Essential features for all plans
     - `add_on` - Optional upgrades
     - `module` - Complete functional modules
     - `custom` - Special purpose bundles

   - **Category**: Functional grouping
     - Options: foundation, engagement, financial, admin, communication, reporting, multi_campus

   **Status:**
   - **Is Active**: Check to make it available for use
   - **Is System**: Check if this is a system-level bundle (cannot be deleted)

3. **Click "Create"**
   - Your bundle is created (empty - you'll add features next)

### Adding Features to a Bundle

After creating a bundle, you need to add features to it:

1. **Find your bundle** in the table
2. **Click the bundle name** to open details
3. **Click "Add Features"**
4. **Select features** from the list
   - Check the features you want to include
   - Mark some as "Required" if needed
5. **Set display order** (optional)
   - Drag to reorder how features appear
6. **Save changes**

### Editing a Feature Bundle

1. Find the bundle in the table
2. Click the **pencil icon** (✏️)
3. Update the details
4. Click **"Update"**

### Deleting a Feature Bundle

⚠️ **Warning**: Cannot delete system bundles or bundles in use!

1. Find the bundle (must NOT have "System" badge)
2. Click the **trash icon** (🗑️)
3. Confirm deletion
4. Bundle is removed

### Bundle Best Practices

✅ **DO:**
- Create logical groupings (e.g., all communication features together)
- Use clear, feature-focused names
- Mark essential bundles as "System" to prevent accidental deletion
- Document what each bundle includes in the description

❌ **DON'T:**
- Mix unrelated features in one bundle
- Create too many tiny bundles (hard to manage)
- Delete bundles that are assigned to active offerings
- Forget to activate bundles after creation

---

## License Assignments

### What is License Assignment?

**License Assignment** is the process of connecting a church (tenant) to a product offering, which automatically grants them access to the included features.

### Viewing License Assignments

1. Click on the **"License Assignments"** tab
2. You'll see a table of all church licenses
3. Each row shows:
   - Church (tenant) name
   - Current product offering
   - Subscription tier
   - Number of active features
   - Status (Active/Inactive)

### How License Assignment Works

When you assign a license:
1. The church is linked to a Product Offering
2. All features from that offering are automatically granted
3. The church users can access those features
4. The license remains active until changed or expired

### Assigning a License Manually

You can now manually assign licenses to churches using the built-in wizard! This is perfect for:
- Setting up new churches
- Upgrading/downgrading subscriptions
- Handling special promotions or trials

**Step-by-step guide:**

1. **Open the Assignment Dialog**
   - Click on the **"License Assignments"** tab
   - Click the **"Assign New License"** button (top right)
   - A two-step wizard will appear

2. **Step 1: Select Church & Offering**
   - **Choose a Church**: Use the dropdown to select the church (tenant)
     - Shows church name and current plan
     - Search by typing to filter results
   - **Choose an Offering**: Select the new product offering
     - See plan details, price, and feature count
     - Current plan is highlighted
   - Click **"Next"** to continue

3. **Step 2: Review & Confirm**
   - **Review the Changes**: See what will happen:
     - ✅ **Features Added**: New features being granted
     - ❌ **Features Removed**: Features being revoked (if downgrading)
     - 📝 **Unchanged Features**: Features staying the same
   - **Add Notes** (optional): Document why you're making this change
     - Example: "Promotional upgrade" or "Requested by pastor"
   - Click **"Assign License"** to confirm

4. **Confirmation**
   - You'll see a success message
   - The church's license is updated immediately
   - All features are granted/revoked automatically
   - Assignment is logged in the history

**What Happens When You Assign:**
- The church's subscription is updated to the new offering
- Features from the old offering (if any) that aren't in the new offering are revoked
- New features from the new offering are granted immediately
- The assignment is recorded with timestamp, who did it, and notes
- The church's users can access new features right away

### Viewing Assignment History

Every license change is tracked for audit purposes:

1. **Expand a Church Row**
   - Click the **">"** arrow next to any church in the table
   - The row expands to show the history panel

2. **View the Timeline**
   - See all assignment changes in chronological order (newest first)
   - Each entry shows:
     - 📅 **Date & Time**: When the change was made
     - 👤 **Assigned By**: Who made the change (email)
     - 📦 **From → To**: Old offering → New offering
     - 📝 **Notes**: Any comments left during assignment

3. **Understanding the Timeline**
   - **Initial assignments** show no "From" offering
   - **Upgrades** show tier progression (e.g., Starter → Professional)
   - **Downgrades** show tier regression (e.g., Enterprise → Professional)
   - **Re-assignments** to same tier are also tracked

### Checking a Church's License Status

1. Go to **License Assignments** tab
2. Find the church in the table
3. Review the information:
   - **Church Name**: The tenant organization
   - **Current Offering**: The active product offering
   - **Tier**: Starter, Professional, Enterprise, etc.
   - **Active Features**: Count of currently granted features
   - **Last Assignment**: When the license was last changed
   - **Status**: Active or Inactive subscription

### Upgrading/Downgrading a License

Use the manual assignment wizard (see "Assigning a License Manually" above):

**To Upgrade:**
1. Click **"Assign New License"**
2. Select the church
3. Choose a higher-tier offering
4. Review the new features being added
5. Confirm the assignment

**To Downgrade:**
1. Click **"Assign New License"**
2. Select the church
3. Choose a lower-tier offering
4. ⚠️ **Important**: Review features that will be removed
5. Add a note explaining the downgrade
6. Confirm the assignment

**Best Practices:**
- Always review the feature changes before confirming
- Add notes to document business reasons
- Check the assignment history to understand past changes
- Communicate with the church before making changes

---

## Analytics Dashboard

### What Can You Monitor?

The Analytics tab gives you insights into:
- **Total Offerings** - How many plans you have
- **Feature Bundles** - Total bundles and features
- **Active Subscriptions** - Churches on paid plans
- **Growth Trends** - Month-over-month changes

### Viewing Analytics

1. Click on the **"Analytics"** tab
2. You'll see dashboard cards with metrics

### Understanding the Metrics

#### Overview Cards

**Total Offerings**
- Shows total number of product offerings
- Includes count of active offerings
- Example: "3 Total (2 Active)"

**Feature Bundles**
- Total bundles created
- Total features across all bundles
- Example: "7 Bundles (45 Features)"

**Active Subscriptions**
- Number of churches with active licenses
- Example: "24 Churches"

**Growth Trend**
- Percentage change from last period
- Example: "+12% from last month"

#### Subscriptions by Tier

Visual breakdown showing:
- How many churches on each tier
- Percentage distribution
- Progress bars for easy comparison

**Example:**
```
Starter:       ████████░░ 45% (12 churches)
Professional:  ██████░░░░ 30% (8 churches)
Enterprise:    ████░░░░░░ 25% (6 churches)
```

#### Feature Adoption

Shows the top 5 most-used features:
- Feature name
- Number of churches using it
- Usage percentage

**Example:**
```
1. Member Management    - 24 churches (100%)
2. Event Calendar      - 22 churches (92%)
3. Online Giving       - 20 churches (83%)
4. Email Communication - 18 churches (75%)
5. Reporting          - 15 churches (63%)
```

### Auto-Refresh

The analytics dashboard automatically refreshes every 30 seconds to show the latest data. Look for the "Auto-refresh" indicator at the bottom.

### Exporting Data (Coming Soon)

Future features will include:
- CSV export of all metrics
- Custom date range selection
- Detailed revenue reports
- Feature adoption trends over time

---

## Common Tasks

### Task 1: Create a New Pricing Plan

**Scenario**: You want to launch a "Church Starter Pack" for small churches at $29/month.

**Steps:**
1. Go to **Product Offerings** tab
2. Click **"Create Offering"**
3. Fill out the form:
   - Name: "Church Starter Pack"
   - Tier: Starter
   - Type: subscription
   - Base Price: 29
   - Billing Cycle: monthly
   - Max Users: 25
   - Is Active: ✓ (checked)
4. Click **"Create"**
5. ✅ Done! Your plan is now available for churches to sign up

### Task 2: Bundle Features for a New Plan

**Scenario**: Your new Starter Pack should include basic features only.

**Steps:**
1. Go to **Feature Bundles** tab
2. Click **"Create Bundle"**
3. Fill out:
   - Name: "Starter Essentials"
   - Type: core
   - Category: foundation
   - Is Active: ✓
4. Click **"Create"**
5. Open the bundle and **"Add Features"**
6. Select:
   - ✓ Member Management
   - ✓ Event Calendar
   - ✓ Basic Giving
7. Click **"Save"**
8. ✅ Done! Features are bundled and ready to assign

### Task 3: Check Which Churches Have Premium Features

**Scenario**: You want to see which churches are using the advanced reporting feature.

**Steps:**
1. Go to **Analytics** tab
2. Scroll to **Feature Adoption** section
3. Find "Advanced Reporting" in the list
4. Note the church count
5. For detailed list:
   - Go to **License Assignments** tab
   - Filter by tier "Professional" or higher
   - These churches have access to advanced features
6. ✅ Done! You now know the adoption rate

### Task 4: Deactivate an Outdated Plan

**Scenario**: You're discontinuing the old "Basic Plan" but existing customers keep it.

**Steps:**
1. Go to **Product Offerings** tab
2. Find "Basic Plan"
3. Click the **edit icon** (✏️)
4. **Uncheck "Is Active"**
5. Click **"Update"**
6. ✅ Done! New signups won't see it, but existing customers keep their subscription

### Task 5: Manually Assign a License to a New Church

**Scenario**: A new church signed up and needs to be assigned the Professional Plan.

**Steps:**
1. Go to **License Assignments** tab
2. Click **"Assign New License"** button
3. **Step 1 - Select Church & Offering:**
   - Church dropdown: Select "First Baptist Church"
   - Offering dropdown: Select "Professional Plan"
   - Click **"Next"**
4. **Step 2 - Review & Confirm:**
   - Review the features being added
   - Add note: "New church signup - Professional tier"
   - Click **"Assign License"**
5. ✅ Done! The church now has access to all Professional features

### Task 6: Upgrade a Church from Starter to Professional

**Scenario**: A church wants to upgrade to get advanced features.

**Steps:**
1. Go to **License Assignments** tab
2. Click **"Assign New License"** button
3. **Step 1:**
   - Select the church from dropdown
   - Select "Professional Plan"
   - Click **"Next"**
4. **Step 2:**
   - Review new features being granted (✅ green)
   - Review features staying the same (📝 gray)
   - Add note: "Requested upgrade for advanced reporting"
   - Click **"Assign License"**
5. ✅ Done! The church is upgraded and can access new features immediately

### Task 7: View a Church's License History

**Scenario**: You want to see all license changes for a specific church.

**Steps:**
1. Go to **License Assignments** tab
2. Find the church in the table
3. Click the **">"** arrow on the left to expand the row
4. View the timeline showing:
   - All past assignments
   - Who made each change
   - When changes occurred
   - Notes left during assignment
5. ✅ Done! You can see the complete audit trail

### Task 8: View Subscription Distribution

**Scenario**: Your boss asks "How many churches are on each plan?"

**Steps:**
1. Go to **Analytics** tab
2. Look at the **Subscriptions by Tier** section
3. Note the breakdown:
   - Starter: X churches (Y%)
   - Professional: X churches (Y%)
   - Enterprise: X churches (Y%)
4. Take a screenshot or write down the numbers
5. ✅ Done! You have the distribution data

---

## Troubleshooting

### Problem: "Create Offering" Button Not Working

**Symptoms**: You click the button but nothing happens.

**Solutions:**
1. **Check your internet connection** - Page may not be loading properly
2. **Refresh the page** - Press F5 or Ctrl+R
3. **Clear browser cache** - Try Ctrl+Shift+Delete, clear cache
4. **Try a different browser** - Switch to Chrome/Firefox/Edge
5. **Check admin permissions** - Ensure you have "Licensing Admin" role

### Problem: Offering Saved But Not Showing Up

**Symptoms**: You created an offering but don't see it in the table.

**Solutions:**
1. **Refresh the page** - Click the browser refresh button
2. **Check if it's inactive** - Filter view to show inactive offerings
3. **Look at all tiers** - Make sure you're not filtering by tier
4. **Wait a moment** - Database may be processing (30 seconds max)
5. **Check browser console** - Press F12, look for error messages

### Problem: Can't Delete a Bundle

**Symptoms**: Delete button is grayed out or shows an error.

**Possible Causes:**
1. **System Bundle** - Cannot delete bundles marked as "System"
2. **In Use** - Bundle is assigned to an active offering
3. **No Permission** - You don't have delete rights

**Solutions:**
- For System bundles: Contact a super admin
- For bundles in use: Remove from offerings first, then delete
- For permissions: Request admin access from your manager

### Problem: License Assignment Wizard Not Opening

**Symptoms**: Clicking "Assign New License" does nothing.

**Solutions:**
1. **Check permissions** - Ensure you have "Licensing Admin" role
2. **Refresh the page** - Press F5 or Ctrl+R
3. **Clear browser cache** - Try Ctrl+Shift+Delete
4. **Check browser console** - Press F12, look for JavaScript errors
5. **Try different browser** - Switch to Chrome/Firefox/Edge

### Problem: Can't See Feature Changes in Step 2

**Symptoms**: The review step shows "Loading..." or is empty.

**Solutions:**
1. **Wait a moment** - Feature comparison may take 2-3 seconds
2. **Check your connection** - Slow internet may delay loading
3. **Go back and retry** - Click "Back" then "Next" again
4. **Refresh and restart** - Close dialog and start over

### Problem: Assignment Fails with Error Message

**Symptoms**: Clicking "Assign License" shows an error.

**Common Errors:**
1. **"Tenant not found"**
   - The church may have been deleted
   - Refresh the page and try again

2. **"Offering not found"**
   - The product offering may have been deleted
   - Choose a different active offering

3. **"Permission denied"**
   - You need "Licensing Admin" role
   - Contact your system administrator

4. **"Database error"**
   - Server may be experiencing issues
   - Wait 1 minute and retry
   - Contact support if persists

### Problem: History Panel Shows No Data

**Symptoms**: Expanding a church row shows "No assignment history".

**Causes:**
1. **First-time assignment** - Church has never been manually assigned a license
2. **Automatic assignment** - Church was assigned during signup (not logged in history)
3. **Data not loaded** - Wait a moment and collapse/expand again

**Note**: Only manual assignments made through the wizard are tracked in history. Automatic assignments during church signup are not included.

### Problem: Analytics Not Updating

**Symptoms**: Numbers seem outdated or frozen.

**Solutions:**
1. **Wait for auto-refresh** - Updates every 30 seconds
2. **Manual refresh** - Reload the page (F5)
3. **Check server status** - Contact IT if issue persists
4. **Clear cache** - Browser may be showing cached data

### Problem: Features Not Appearing for Church

**Symptoms**: Church has a license but can't access features.

**Causes & Solutions:**
1. **License not activated**
   - Check License Assignments tab
   - Ensure status shows "Active" (green)

2. **Features not in bundle**
   - Go to Feature Bundles
   - Verify the bundle includes needed features

3. **Bundle not in offering**
   - Go to Product Offerings
   - Edit the offering
   - Add the required bundle

4. **Cache issue**
   - Church admin should log out and back in
   - Features should appear after fresh login

---

## FAQ

### General Questions

**Q: How many product offerings should I create?**
A: Start with 3 tiers (Starter, Professional, Enterprise). Add more only if needed. Too many options confuse customers.

**Q: What's the difference between a feature and a bundle?**
A:
- **Feature** - A single capability (e.g., "Member Management")
- **Bundle** - A group of features (e.g., "Foundation Bundle" contains Member Management + Events + Giving)

**Q: Can I change prices after churches sign up?**
A: Yes, but it only affects new signups. Existing customers keep their original price unless you explicitly change their subscription.

**Q: What happens if I delete an offering?**
A: You cannot delete offerings that have active subscribers. You must first migrate those churches to a different plan.

### Technical Questions

**Q: Where is the data stored?**
A: All licensing data is stored in the Supabase database with full encryption and backups.

**Q: Can I export the analytics data?**
A: Export feature is coming soon. For now, you can take screenshots or manually record metrics.

**Q: How often does the system check licenses?**
A: License checks happen in real-time. When a user tries to access a feature, the system immediately verifies their license.

**Q: What if a church exceeds their user limit?**
A: The system prevents new user additions when the limit is reached. Church admin sees an upgrade prompt.

### Billing Questions

**Q: How do I set up payment processing?**
A: Payment integration is configured separately. Contact your system administrator for setup.

**Q: Can churches have free trials?**
A: Yes! Create an offering with `type: trial` and set a trial period duration.

**Q: What about annual vs monthly billing?**
A: You can create separate offerings for each billing cycle or use the "Billing Cycle" option when creating an offering.

### License Assignment Questions

**Q: Can I manually assign licenses to churches?**
A: Yes! Use the "Assign New License" button in the License Assignments tab to open the assignment wizard.

**Q: What happens when I upgrade a church's license?**
A:
- The church is assigned to the new higher-tier offering
- New features from the higher tier are granted immediately
- Existing features are kept
- The change is logged in the assignment history

**Q: What happens when I downgrade a church?**
A:
- The church is assigned to the new lower-tier offering
- Features not in the lower tier are revoked immediately
- Remaining features are kept
- You should add a note explaining the downgrade
- ⚠️ The church will lose access to removed features right away

**Q: Can I see who made changes to a church's license?**
A: Yes! Expand the church's row in the License Assignments tab to view the complete history with timestamps, who made each change, and any notes left.

**Q: Why doesn't the history panel show the initial license assignment?**
A: The history only tracks manual assignments made through the wizard. Automatic assignments during church signup are not included in the history.

**Q: Can I undo a license assignment?**
A: There's no "undo" button, but you can simply assign a different license. Each assignment is tracked in the history, so you can always see what the previous offering was.

**Q: What should I write in the assignment notes?**
A: Include the business reason for the change, such as:
- "New church signup - Professional tier"
- "Requested upgrade for advanced reporting"
- "Promotional trial for 3 months"
- "Downgrade due to payment issues"
- "Migration from old billing system"

**Q: How long does it take for feature changes to take effect?**
A: Immediately! As soon as you confirm the assignment, features are granted/revoked and the church's users can (or cannot) access them right away.

**Q: Can a church have multiple licenses?**
A: No, each church (tenant) can only have one active product offering at a time. Assigning a new license replaces the previous one.

---

## Support

### Getting Help

If you encounter issues not covered in this manual:

**Level 1: Documentation**
- Re-read this manual
- Check the FAQ section
- Review the troubleshooting guide

**Level 2: Internal Support**
- Contact your IT department
- Email: support@stewardtrack.com
- Include screenshots of the issue

**Level 3: Developer Support**
- For technical issues or bugs
- Create a support ticket
- Include:
  - What you were trying to do
  - What happened instead
  - Error messages (screenshots)
  - Your browser and version

### Feature Requests

Have an idea for improving the Licensing Studio?

1. Document your idea clearly
2. Explain the business value
3. Submit via your product management team
4. Include use cases and examples

### Training Resources

**Available Resources:**
- 📚 This user manual
- 🎥 Video tutorials (coming soon)
- 💬 Live training sessions (monthly)
- 📧 Email newsletter with tips

**Best Practices Webinars:**
- First Tuesday of each month
- Topics: Pricing strategy, feature bundling, customer success
- Register at: training.stewardtrack.com

---

## Appendix

### Glossary of Terms

| Term | Definition |
|------|------------|
| **Product Offering** | A subscription plan with pricing, features, and limits |
| **Feature Bundle** | A group of related features packaged together |
| **Tenant** | A church organization using StewardTrack |
| **License Assignment** | Connecting a church to a product offering |
| **Tier** | Pricing level (Starter, Professional, Enterprise, Custom) |
| **SKU** | Stock Keeping Unit - unique product identifier (same as "code") |
| **Active Features** | Number of features currently accessible to a church |
| **Subscription Status** | Whether a license is active, expired, or trial |

### Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Refresh page | F5 or Ctrl+R | Cmd+R |
| Open dev tools | F12 or Ctrl+Shift+I | Cmd+Option+I |
| Find on page | Ctrl+F | Cmd+F |
| Close modal | Esc | Esc |
| Submit form | Ctrl+Enter | Cmd+Enter |

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 4, 2025 | Initial release |

---

**End of User Manual**

For updates to this manual, visit: [docs.stewardtrack.com/licensing-studio](https://docs.stewardtrack.com/licensing-studio)

---

*© 2025 StewardTrack. All rights reserved.*
