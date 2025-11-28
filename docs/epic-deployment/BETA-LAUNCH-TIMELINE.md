# StewardTrack Beta Launch Timeline
## January - March 2026 (12 Weeks to Launch)

**Target Beta Launch Date:** March 31, 2026
**Total Available Time:** 12 weeks (84 days)
**Buffer Time:** 1 week for final testing and polish

---

## Epic Sequence & Timeline

### Phase 1: Core Infrastructure (Weeks 1-8) - P0 BUILD Epics

All P0 epics must be completed before Beta launch. These are **blocking** epics.

#### Epic 1: JWT Authentication (Weeks 1-2)
**Timeline:** January 6 - January 19, 2026
**Duration:** 2 weeks
**Type:** BUILD
**Priority:** P0 (Blocking)
**Dependencies:** None

**Deliverables:**
- JWT-based authentication with HTTP-only cookies
- Access tokens (15min) + Refresh tokens (7 days)
- Login/Register/Logout/Token Refresh APIs
- Authentication middleware
- Server context resolution

**Story Points:** ~20 points

---

#### Epic 2: Xendit Payment Integration (Weeks 3-4)
**Timeline:** January 20 - February 2, 2026
**Duration:** 2 weeks
**Type:** BUILD
**Priority:** P0 (Blocking)
**Dependencies:** Epic 1 (JWT Authentication)

**Deliverables:**
- XenditService for invoice creation
- Payment webhook handler with signature verification
- Support for GCash, PayMaya, Bank Transfer, OTC
- Subscription activation flow
- Integration with feature grants

**Story Points:** ~18 points

---

#### Epic 3: Simplified RBAC System (Weeks 5-6)
**Timeline:** February 3 - February 16, 2026
**Duration:** 2 weeks
**Type:** BUILD
**Priority:** P0 (Blocking)
**Dependencies:** Epic 1 (JWT Authentication)

**Deliverables:**
- 2-layer RBAC: Roles → Permissions (NO bundles)
- Multi-role support for users
- Role delegation with scope and time limits
- 4 default system roles (tenant_admin, staff, volunteer, member)
- RBAC seeding during tenant registration
- Feature-permission mapping

**Story Points:** ~22 points

---

#### Epic 4: Onboarding & Feature Grants (Weeks 7-8)
**Timeline:** February 17 - March 2, 2026
**Duration:** 2 weeks
**Type:** BUILD
**Priority:** P0 (Blocking)
**Dependencies:** Epic 2 (Xendit Payment), Epic 3 (RBAC)

**Deliverables:**
- 5-step onboarding wizard (Welcome, Church Details, RBAC Setup, Feature Tour, Complete)
- Automatic feature grants based on subscription plan
- OnboardingService for tracking wizard progress
- Integration with payment completion webhook
- Default RBAC roles seeding

**Story Points:** ~20 points

---

### Phase 2: Core Features Review (Weeks 9-10) - P1 REVIEW Epics

P1 epics focus on **reviewing and fixing** existing code. These are important but not blocking if basic functionality works.

#### Epic 5: Member & Account Management - Review (Week 9)
**Timeline:** March 3 - March 9, 2026
**Duration:** 1 week
**Type:** REVIEW & FIX
**Priority:** P1
**Dependencies:** Epic 1 (JWT Authentication), Epic 3 (RBAC)

**Focus Areas:**
- Verify Members, Membership Types, Accounts follow Dashboard → List → AddEdit → Profile pattern
- Test 1:1 Member-Account relationship enforcement
- Test account number auto-generation
- Verify search, filter, pagination
- Fix bugs found during testing

**Modules to Review:** 3 (Members, Membership Types, Accounts)

---

#### Epic 6: Church Finance Module - Review (Week 10)
**Timeline:** March 10 - March 16, 2026
**Duration:** 1 week
**Type:** REVIEW & FIX
**Priority:** P1
**Dependencies:** Epic 1 (JWT Authentication), Epic 3 (RBAC), Epic 5 (Members - Review)

**Focus Areas:**
- Verify all 9 finance modules follow Dashboard → List → AddEdit → Profile pattern
- Test donation recording, expense tracking, budget management
- Verify account balance updates correctly
- Test all RBAC permissions
- Fix bugs found during testing

**Modules to Review:** 9 (Donations, Expenses, Budgets, Funds, COA, Sources, Fiscal Year, Income/Expense Categories, Opening Balances)

---

### Phase 3: Final Testing & Polish (Week 11)

#### Integration Testing & Bug Fixes (Week 11)
**Timeline:** March 17 - March 23, 2026
**Duration:** 1 week

**Activities:**
- End-to-end testing of complete user journey
- Cross-module integration testing
- Performance testing and optimization
- Security audit
- Fix critical bugs
- UI/UX polish

---

### Phase 4: Beta Launch Preparation (Week 12)

#### Launch Preparation (Week 12)
**Timeline:** March 24 - March 31, 2026
**Duration:** 1 week

**Activities:**
- Final smoke testing
- Production deployment setup
- Monitoring and logging setup
- Launch documentation
- Support materials preparation
- Soft launch to limited users

**Beta Launch Date:** March 31, 2026

---

## Post-Launch Epics (April 2026+) - P2

These epics are **NOT BLOCKING** for Beta launch and should be implemented after successful launch based on user feedback.

#### Epic 7: Reporting Suite (Post-Launch)
**Timeline:** April 2026+
**Duration:** 2-3 weeks
**Type:** BUILD
**Priority:** P2 (Nice to Have)
**Dependencies:** Epic 5 (Members - Review), Epic 6 (Finance - Review)

**Scope:** 7 simplified reports (3 Standard + 4 Advanced)

---

#### Epic 8: SaaS Admin Dashboard (Post-Launch)
**Timeline:** April/May 2026+
**Duration:** 2-3 weeks
**Type:** BUILD
**Priority:** P2 (Nice to Have)
**Dependencies:** Epic 5, Epic 6

**Scope:** Dashboard with KPIs, charts, activity feed, quick actions

---

## Team Capacity Planning

### Assumptions
- **1 Full Stack Developer** working full-time
- **Average velocity:** 10-12 story points per week
- **Total capacity over 11 weeks:** ~110-132 story points

### Epic Story Point Summary

| Epic | Type | Priority | Story Points | Weeks |
|------|------|----------|--------------|-------|
| Epic 1: JWT Auth | BUILD | P0 | 20 | 2 |
| Epic 2: Xendit Payment | BUILD | P0 | 18 | 2 |
| Epic 3: RBAC | BUILD | P0 | 22 | 2 |
| Epic 4: Onboarding | BUILD | P0 | 20 | 2 |
| Epic 5: Members Review | REVIEW | P1 | ~10 | 1 |
| Epic 6: Finance Review | REVIEW | P1 | ~10 | 1 |
| **Total (P0 + P1)** | | | **~100** | **10** |

**Buffer:** 1 week for integration testing + 1 week for launch prep = **2 weeks**

**Total Timeline:** 10 weeks work + 2 weeks buffer = **12 weeks** ✅

---

## Critical Path

```
Week 1-2:   Epic 1 (JWT Auth)
Week 3-4:   Epic 2 (Xendit Payment)
Week 5-6:   Epic 3 (RBAC)
Week 7-8:   Epic 4 (Onboarding & Feature Grants)
Week 9:     Epic 5 (Members Review)
Week 10:    Epic 6 (Finance Review)
Week 11:    Integration Testing & Bug Fixes
Week 12:    Launch Preparation
→ BETA LAUNCH: March 31, 2026
```

**Dependencies flow:**
- Epic 2 depends on Epic 1 (needs auth)
- Epic 3 depends on Epic 1 (needs auth)
- Epic 4 depends on Epic 2 & 3 (needs payment + RBAC)
- Epic 5 depends on Epic 1 & 3 (needs auth + RBAC)
- Epic 6 depends on Epic 1, 3, 5 (needs auth + RBAC + members)

---

## Risk Mitigation

### High-Risk Areas

1. **Epic 3 (RBAC) Complexity**
   - **Risk:** Simplified RBAC may still be complex with delegation + multi-role
   - **Mitigation:** Focus on core 2-layer model first, delegation as optional for Beta
   - **Contingency:** Reduce delegation scope to post-launch if needed

2. **Epic 4 (Onboarding) Integration**
   - **Risk:** Integrates with payment, RBAC, feature grants - many moving parts
   - **Mitigation:** Build incrementally, test each step independently
   - **Contingency:** Simplify wizard to 3 steps if needed (Welcome, Church Details, Complete)

3. **Epic 6 (Finance Review) Scope**
   - **Risk:** 9 modules to review in 1 week may be tight
   - **Mitigation:** Prioritize critical modules (Donations, Expenses, Budgets)
   - **Contingency:** Mark non-critical modules (Funds, Sources, Opening Balances) as post-launch

### Scope Adjustment Strategy

If timeline slips, **in order of priority**:

1. **Keep P0 Epics 1-4** (Absolutely required for launch)
2. **Reduce Epic 5 scope:** Review only Members module, defer Membership Types & Accounts to post-launch
3. **Reduce Epic 6 scope:** Review only Donations & Expenses, defer other 7 modules to post-launch
4. **Extend launch date by 1-2 weeks** as last resort

---

## Weekly Milestones

### January 2026

**Week 1 (Jan 6-12):**
- ✅ JWT token generation and validation
- ✅ Login/Register APIs
- ✅ HTTP-only cookie implementation

**Week 2 (Jan 13-19):**
- ✅ Token refresh mechanism
- ✅ Authentication middleware
- ✅ Server context resolution
- **DEMO:** End-to-end auth flow working

**Week 3 (Jan 20-26):**
- ✅ XenditService implementation
- ✅ Invoice creation API
- ✅ Webhook handler skeleton

**Week 4 (Jan 27-Feb 2):**
- ✅ Payment method support (GCash, PayMaya, etc.)
- ✅ Webhook signature verification
- ✅ Subscription activation flow
- **DEMO:** Complete payment flow working

### February 2026

**Week 5 (Feb 3-9):**
- ✅ RBAC database schema (2-layer)
- ✅ Core RBAC services (Role, Permission management)
- ✅ Default role seeding

**Week 6 (Feb 10-16):**
- ✅ Multi-role support
- ✅ Role delegation (basic)
- ✅ Feature-permission mapping
- **DEMO:** RBAC working with test roles

**Week 7 (Feb 17-23):**
- ✅ Onboarding wizard UI (5 steps)
- ✅ OnboardingService
- ✅ Progress tracking

**Week 8 (Feb 24-Mar 2):**
- ✅ Feature grants integration
- ✅ Payment webhook → feature grants flow
- ✅ Default RBAC seeding during registration
- **DEMO:** Complete onboarding flow from signup to dashboard

### March 2026

**Week 9 (Mar 3-9):**
- ✅ Member module review & testing
- ✅ Membership Types review & testing
- ✅ Accounts review & testing
- ✅ Bug fixes
- **DEMO:** Member management working end-to-end

**Week 10 (Mar 10-16):**
- ✅ Finance modules review & testing
- ✅ Critical modules (Donations, Expenses, Budgets) verified
- ✅ Bug fixes
- **DEMO:** Finance workflows working

**Week 11 (Mar 17-23):**
- ✅ Integration testing
- ✅ Performance optimization
- ✅ Security audit
- ✅ Critical bug fixes
- **DEMO:** Full user journey from signup to finance management

**Week 12 (Mar 24-31):**
- ✅ Final smoke testing
- ✅ Production deployment
- ✅ Monitoring setup
- ✅ Documentation
- **🚀 BETA LAUNCH: March 31, 2026**

---

## Success Criteria for Beta Launch

### Must Have (P0 - Blocking)
- ✅ User can register and login with JWT authentication
- ✅ User can select and pay for subscription (Xendit integration)
- ✅ User is assigned tenant_admin role automatically
- ✅ User can complete onboarding wizard
- ✅ Features are granted based on subscription plan
- ✅ RBAC permissions enforce access control
- ✅ User can manage members (create, edit, view, delete)
- ✅ User can record donations and expenses
- ✅ All P0 epics completed and tested

### Should Have (P1 - Important)
- ✅ Member management works smoothly (search, filter, pagination)
- ✅ Finance modules work correctly (balances update, calculations accurate)
- ✅ All metadata pages follow standard pattern
- ✅ No critical bugs in core flows

### Nice to Have (P2 - Post-Launch)
- ⬜ Reporting Suite
- ⬜ SaaS Admin Dashboard with charts
- ⬜ Advanced delegation features

---

## Communication & Reporting

### Weekly Demos
- **Every Friday at 2pm:** Demo completed work to stakeholders
- **Format:** Live walkthrough of user flows
- **Duration:** 30 minutes max

### Daily Standup (Optional)
- **When:** Every morning 9am
- **Duration:** 15 minutes
- **Format:** What I did yesterday, what I'm doing today, any blockers

### Status Reports
- **When:** Every Monday morning
- **To:** Project stakeholders
- **Content:**
  - Work completed last week
  - Work planned this week
  - Risks and blockers
  - Timeline status (on track / at risk / behind)

---

## Next Steps

1. **Week 1 (Starting Jan 6):** Begin Epic 1 (JWT Authentication)
2. **Setup development environment** with all necessary tools
3. **Review Epic 1 document** thoroughly before starting
4. **Create first task list** from Epic 1 user stories
5. **Start coding!** 🚀
