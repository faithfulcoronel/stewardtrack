# Scheduler Feature - Implementation Progress

## Overview
The Scheduler feature manages ministry schedules (worship services, bible studies, rehearsals, conferences, seminars) with full registration and QR-based attendance tracking.

**Start Date:** 2026-01-10
**Target Route:** `/admin/community/planning/scheduler`

---

## Implementation Phases

### Phase 1: Database Schema
- [x] Create migration file: `20260110120000_create_scheduler_system.sql`
- [x] Tables created:
  - [x] `ministries` - Ministry entities
  - [x] `ministry_teams` - Team assignments with roles
  - [x] `ministry_schedules` - Recurring schedule definitions
  - [x] `schedule_occurrences` - Specific event instances
  - [x] `schedule_team_assignments` - Per-occurrence team assignments
  - [x] `schedule_registrations` - Event registrations
  - [x] `schedule_attendance` - Check-in records
- [x] Indexes created
- [x] RLS policies configured
- [x] Triggers for count updates
- [x] Feature permissions added:
  - `scheduler:view`, `scheduler:manage`, `scheduler:attendance`
  - `ministries:view`, `ministries:manage`
  - `registrations:view`, `registrations:manage`

### Phase 2: Models
- [x] Create `apps/web/src/models/scheduler/` directory
- [x] `ministry.model.ts`
- [x] `ministryTeam.model.ts`
- [x] `ministrySchedule.model.ts`
- [x] `scheduleOccurrence.model.ts`
- [x] `scheduleTeamAssignment.model.ts`
- [x] `scheduleRegistration.model.ts`
- [x] `scheduleAttendance.model.ts`
- [x] `index.ts` - Barrel export

### Phase 3: Adapters
- [x] `ministry.adapter.ts`
- [x] `ministryTeam.adapter.ts`
- [x] `ministrySchedule.adapter.ts`
- [x] `scheduleOccurrence.adapter.ts`
- [x] `scheduleTeamAssignment.adapter.ts`
- [x] `scheduleRegistration.adapter.ts`
- [x] `scheduleAttendance.adapter.ts`

### Phase 4: Repositories
- [x] `ministry.repository.ts`
- [x] `ministryTeam.repository.ts`
- [x] `ministrySchedule.repository.ts`
- [x] `scheduleOccurrence.repository.ts`
- [x] `scheduleTeamAssignment.repository.ts`
- [x] `scheduleRegistration.repository.ts`
- [x] `scheduleAttendance.repository.ts`

### Phase 5: DI Container
- [x] Update `apps/web/src/lib/types.ts` with symbols
- [x] Update `apps/web/src/lib/container.ts` with bindings

### Phase 6: Services
- [x] `MinistryService.ts`
- [x] `SchedulerService.ts`
- [x] `ScheduleOccurrenceService.ts`
- [x] `ScheduleRegistrationService.ts`
- [x] `ScheduleAttendanceService.ts`

### Phase 7: API Routes
#### Ministry Endpoints
- [x] `GET/POST /api/community/ministries`
- [x] `GET/PUT/DELETE /api/community/ministries/[id]`
- [x] `GET/POST /api/community/ministries/[id]/team`
- [x] `PUT/DELETE /api/community/ministries/[id]/team/[memberId]`

#### Scheduler Endpoints
- [x] `GET /api/community/scheduler` (dashboard)
- [x] `GET/POST /api/community/scheduler/schedules`
- [x] `GET/PUT/DELETE /api/community/scheduler/schedules/[id]`
- [x] `POST /api/community/scheduler/schedules/[id]/generate-occurrences`

#### Occurrence Endpoints
- [x] `GET /api/community/scheduler/occurrences`
- [x] `GET/PUT /api/community/scheduler/occurrences/[id]`
- [x] `POST /api/community/scheduler/occurrences/[id]/cancel`
- [x] `GET/POST /api/community/scheduler/occurrences/[id]/qr-token`
- [x] `GET/POST /api/community/scheduler/occurrences/[id]/registrations`
- [x] `GET/POST /api/community/scheduler/occurrences/[id]/attendance`

### Phase 8: React Components
- [x] `SchedulerDashboard.tsx`
- [x] `ScheduleCalendarView.tsx`
- [x] `MinistryTeamManager.tsx`
- [x] `TeamAssignmentGrid.tsx`
- [x] `RegistrationFormBuilder.tsx`
- [x] `RegistrationList.tsx`
- [x] `QRScannerView.tsx`
- [x] `EventQRCode.tsx`
- [x] `AttendanceTracker.tsx`
- [x] `PublicEventRegistration.tsx`
- [x] Register components in `component-registry.ts`

### Phase 9: Metadata XML Pages
- [x] `scheduler-dashboard.xml`
- [x] `scheduler-calendar.xml`
- [x] `scheduler-ministries.xml`
- [x] `scheduler-ministry-detail.xml`
- [x] `scheduler-schedules.xml`
- [x] `scheduler-schedule-manage.xml`
- [x] `scheduler-occurrences.xml`
- [x] `scheduler-occurrence-detail.xml`
- [x] `scheduler-checkin.xml`
- [x] `event-registration.xml` (portal)

### Phase 10: Integration
- [x] Update `PlanningDashboard.tsx` to include Scheduler link
- [x] Update navigation/sidebar for Scheduler (via Planning hub)
- [x] Calendar integration (sync to calendar_events) - with notifications
- [x] Compile metadata

### Phase 12: Metadata Service Handlers (CRITICAL)
**Note:** The metadata framework requires service handlers to provide data to XML-driven pages.
Without these handlers, pages render but data is disconnected.

- [x] Create `admin-community-scheduler.ts` service handlers file
- [x] Implement service handlers for each page:
  - [x] `admin-community.scheduler.dashboard.hero` - Dashboard hero section
  - [x] `admin-community.scheduler.dashboard.quickLinks` - Dashboard quick links
  - [x] `admin-community.scheduler.dashboard.upcoming` - Dashboard upcoming events
  - [x] `admin-community.scheduler.ministries.list.hero` - Ministries list hero
  - [x] `admin-community.scheduler.ministries.list.table` - Ministries table data
  - [x] `admin-community.scheduler.schedules.list.hero` - Schedules list hero
  - [x] `admin-community.scheduler.schedules.list.table` - Schedules table data
  - [x] `admin-community.scheduler.occurrences.list.hero` - Occurrences list hero
  - [x] `admin-community.scheduler.occurrences.list.table` - Occurrences table data
- [x] Register handlers in `admin-community.ts` exports
- [x] Update XML blueprints with DataSource and service bindings:
  - [x] `scheduler-dashboard.xml` - Add HeroSection, QuickLinks, Timeline components with bindings
  - [x] `scheduler-ministries.xml` - Add HeroSection, AdminDataGridSection with bindings
  - [x] `scheduler-schedules.xml` - Add HeroSection, AdminDataGridSection with bindings
  - [x] `scheduler-occurrences.xml` - Add HeroSection, AdminDataGridSection with bindings
- [x] Update page routes to use `renderSchedulerPage` properly
- [x] Recompile metadata: `pnpm metadata:compile`
- [x] Verify pages render with connected data
- [x] Fix API endpoint validation (null/new ministry ID handling)
- [x] Update scheduler components to use existing `/api/user-member-link/search` endpoint for member lists

### Phase 11: Calendar & Notification Integration
- [x] Update `CalendarEvent` model with `schedule` type and `schedule_occurrence` source type
- [x] Add calendar sync methods to `CalendarEventAdapter`:
  - `syncFromScheduleOccurrences()` - Bulk sync all occurrences
  - `syncSingleOccurrence(occurrenceId)` - Sync single occurrence
  - `deleteBySource(sourceType, sourceId)` - Soft delete calendar event
- [x] Add reminder/notification methods to `CalendarEventAdapter`:
  - `createEventReminders()` - Create reminders at 24h, 1h, 15min before events
  - `getPendingReminders()` - Get reminders ready to send
  - `markReminderSent()` - Mark reminder as sent
  - `deleteEventReminders()` - Delete reminders for an event
- [x] Update `ScheduleOccurrenceService` with calendar integration:
  - Added `ICalendarEventAdapter` dependency
  - `syncToCalendar(occurrenceId)` - Sync single occurrence
  - `syncAllToCalendar()` - Bulk sync all occurrences
  - `removeFromCalendar(occurrenceId)` - Remove from calendar
  - Status changes (cancel, start, complete) trigger automatic calendar sync
- [x] Create calendar sync API endpoint: `POST /api/community/scheduler/calendar-sync`

---

## Key Files Reference

| Category | Path |
|----------|------|
| Migration | `supabase/migrations/20260110120000_create_scheduler_system.sql` |
| Models | `apps/web/src/models/scheduler/` |
| Adapters | `apps/web/src/adapters/` |
| Repositories | `apps/web/src/repositories/` |
| Services | `apps/web/src/services/` |
| API Routes | `apps/web/src/app/api/community/` |
| Calendar Sync API | `apps/web/src/app/api/community/scheduler/calendar-sync/route.ts` |
| Components | `apps/web/src/components/dynamic/admin/` |
| Metadata | `apps/web/metadata/authoring/blueprints/admin-community/` |
| Types | `apps/web/src/lib/types.ts` |
| Container | `apps/web/src/lib/container.ts` |
| Calendar Model | `apps/web/src/models/calendarEvent.model.ts` |
| Calendar Adapter | `apps/web/src/adapters/calendarEvent.adapter.ts` |

---

## Testing Checklist

- [ ] Apply migration: `npx supabase db push`
- [ ] Compile metadata: `pnpm metadata:compile`
- [ ] Start dev server: `pnpm dev:web`
- [ ] Test scenarios:
  - [ ] Create ministry with team
  - [ ] Create recurring schedule
  - [ ] Generate occurrences
  - [ ] Register member for event
  - [ ] Staff QR scan check-in
  - [ ] Self-check-in via event QR
  - [ ] View attendance stats
  - [ ] Calendar sync (POST /api/community/scheduler/calendar-sync)
  - [ ] Verify calendar events appear in planning calendar
  - [ ] Verify status changes sync to calendar (cancel, start, complete)

---

## Notes

- Permission codes use underscore format: `scheduler:view`, `ministries:manage`
- QR tokens generated using UUID for uniqueness
- Registration form schema stored as JSONB for flexibility
- Calendar integration uses polymorphic `source_type='schedule_occurrence'`
- **Supabase Type Casting:** When casting Supabase query results to model types in adapters, use `unknown` as an intermediate type to avoid TypeScript errors (e.g., `data as unknown as MyModel[]`)

### Calendar Integration Details

The scheduler integrates with the planning calendar system via the `calendar_events` table:

**Sync Mechanism:**
- Schedule occurrences are synced to `calendar_events` with `source_type='schedule_occurrence'` and `source_id=occurrence.id`
- Idempotent sync: existing events are updated, new ones are created
- Event details (title, description, location) use occurrence overrides if present, otherwise fall back to schedule defaults
- Cancelled occurrences set `status='cancelled'` on the corresponding calendar event

**Automatic Sync Triggers:**
- `cancelOccurrence()` - Syncs cancellation status to calendar
- `startOccurrence()` - Syncs in_progress status to calendar
- `completeOccurrence()` - Syncs completed status to calendar

**Manual Sync:**
- `POST /api/community/scheduler/calendar-sync` - Bulk sync all occurrences
- `GET /api/community/scheduler/calendar-sync` - Check sync status

**Notification/Reminder Support:**
- Reminders created at configurable intervals (default: 24h, 1h, 15min before event)
- `getPendingReminders()` returns reminders ready to send (scheduled_for <= now, not sent)
- `markReminderSent()` marks reminder as sent after notification delivery
- Reminders use `calendar_event_reminders` table with polymorphic recipient support

**Event Type:**
- Schedule occurrences use `event_type='schedule'` in calendar events
- Ministry metadata (name, color, icon) included for display
