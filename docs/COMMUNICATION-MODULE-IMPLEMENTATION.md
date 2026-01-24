# Communication Module Implementation Plan

> **Status**: In Progress (Phase 3 Complete, Phase 4 Next)
> **Started**: 2026-01-25
> **Updated**: 2026-01-25
> **Branch**: `for-q2-2026-release`

## Table of Contents

- [Key Decisions](#key-decisions)
- [Overview](#overview)
- [Architecture](#architecture)
- [Implementation Phases](#implementation-phases)
- [File Structure](#file-structure)
- [Database Schema](#database-schema)
- [Page Specifications](#page-specifications)
- [AI Integration](#ai-integration)
- [Permissions](#permissions)
- [Progress Tracking](#progress-tracking)

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Menu Location** | Top-level sidebar section | Same level as Community, Finance for visibility |
| **AI Credit Model** | Use existing tenant AI credit balance | Leverages existing `AICreditService` infrastructure |
| **Approval Workflow** | No approval needed | Users with permission can send immediately |
| **Recipient Sources** | All sources | Members, families, event attendees, ministry groups, custom lists |

---

## Overview

A comprehensive Communication module for StewardTrack enabling individual and mass messaging to congregation members via Email and SMS channels.

### Core Features

- **Individual Messaging**: Send personalized messages to single recipients
- **Mass Messaging (Campaigns)**: Bulk messaging to member segments, groups, or custom lists
- **Multi-Channel Delivery**: Email (Resend) and SMS (Twilio) via existing channel infrastructure
- **Template System**: Reusable message templates with variable substitution

### AI-Powered Features

- **Smart Compose**: AI-assisted message drafting with tone/style suggestions
- **Template Generator**: AI generates templates based on context
- **Personalization Assistant**: Auto-personalize messages for bulk sends
- **Subject Line Optimizer**: AI suggests compelling subject lines
- **Recipient Suggestions**: Smart audience targeting based on message content

---

## Architecture

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   XML Blueprint │────▶│  Service Handler │────▶│   React Page    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Communication   │
                        │    Services      │
                        └──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Campaign │    │ Template │    │ Delivery │
        │  Service │    │  Service │    │  Service │
        └──────────┘    └──────────┘    └──────────┘
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  Repos   │    │  Repos   │    │ Channels │
        └──────────┘    └──────────┘    └──────────┘
              │                │                │
              ▼                ▼                ▼
        ┌─────────────────────────────────────────┐
        │              Supabase DB                │
        └─────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| **Models** | TypeScript interfaces for domain entities |
| **Adapters** | Database queries, row ↔ model conversion |
| **Repositories** | Data access contracts, tenant isolation |
| **Services** | Business logic, validation, orchestration |
| **Service Handlers** | Metadata XML data binding |
| **Components** | UI rendering via component registry |

---

## Implementation Phases

### Phase 1: Foundation ✅
- [x] Create database migration for all tables
- [x] Create models (Campaign, Template, Recipient, Preference, AISuggestion)
- [x] Create adapters with audit logging
- [x] Create repositories with tenant isolation
- [x] Create core services (CommunicationService, CampaignService, TemplateService, RecipientService, DeliveryService)
- [x] Add type symbols to `types.ts`
- [x] Register in DI container
- [x] Add sidebar menu item and icons

### Phase 2: Basic Pages ✅
- [x] Create page routes in Next.js app directory
  - Dashboard (`/admin/communication`)
  - Campaigns List (`/admin/communication/campaigns`)
  - Campaign Profile (`/admin/communication/campaigns/[id]`)
  - Compose (`/admin/communication/compose`)
  - Templates (`/admin/communication/templates`)
- [x] Create API routes for campaigns and templates
- [x] Create loading states for all pages
- [x] XML blueprints + service handlers for metadata-driven rendering
  - Dashboard XML blueprint with hero, metrics, quick links, activity
  - Campaign List XML blueprint with data grid
  - Campaign Profile XML blueprint with stats and details
  - Campaign Manage XML blueprint with CampaignComposer
  - Template List XML blueprint with data grid
  - Service handlers (admin-communication.ts) - 16 handlers
  - Action handlers for campaign/template CRUD operations
  - Module manifest registered in metadata modules

### Phase 3: Compose Experience ✅
- [x] Create `MessageComposer` component with rich text editor
- [x] Create `RecipientSelector` component (all sources)
- [x] Create `TemplateSelector` component with preview
- [x] Create `VariableInserter` component for personalization
- [x] Create `CampaignComposer` main page component
- [x] Register components in metadata component registry
- [x] Update compose page to use CampaignComposer
- [x] Create API routes for recipients (members, search, groups, group members)
- [x] Create API route for campaign send
- [x] Create AI assist endpoint (improve, subject, personalize, grammar)
- [x] Create AI template generation endpoint
- [x] Delivery service integrated (uses existing Email/SMS channels)

### Phase 4: AI Integration ⬜
- [ ] Create `CommunicationAIService`
- [ ] Create AI Tools (ComposeMessage, GenerateTemplate, SuggestAudience)
- [ ] Add `AIAssistantPanel` component
- [ ] Wire AI suggestions into compose flow
- [ ] Integrate with existing AI credit system

### Phase 5: Analytics & Polish ⬜
- [ ] Campaign Profile page with analytics
- [ ] Delivery tracking and real-time updates
- [ ] Template management with AI generator
- [ ] Mobile-first responsive refinements
- [ ] E2E tests with Playwright

---

## File Structure

```
apps/web/
├── src/
│   ├── models/
│   │   └── communication/
│   │       ├── campaign.model.ts
│   │       ├── template.model.ts
│   │       ├── recipient.model.ts
│   │       └── preference.model.ts
│   │
│   ├── adapters/
│   │   └── communication/
│   │       ├── campaign.adapter.ts
│   │       ├── template.adapter.ts
│   │       ├── recipient.adapter.ts
│   │       └── preference.adapter.ts
│   │
│   ├── repositories/
│   │   └── communication/
│   │       ├── campaign.repository.ts
│   │       ├── template.repository.ts
│   │       ├── recipient.repository.ts
│   │       └── preference.repository.ts
│   │
│   ├── services/
│   │   └── communication/
│   │       ├── CommunicationService.ts
│   │       ├── CampaignService.ts
│   │       ├── TemplateService.ts
│   │       ├── RecipientService.ts
│   │       ├── DeliveryService.ts
│   │       └── CommunicationAIService.ts
│   │
│   ├── lib/
│   │   ├── ai-assistant/
│   │   │   └── infrastructure/tools/plugins/
│   │   │       └── communication/
│   │   │           ├── ComposeMessageTool.ts
│   │   │           ├── GenerateTemplateTool.ts
│   │   │           └── SuggestAudienceTool.ts
│   │   │
│   │   └── metadata/
│   │       ├── services/
│   │       │   └── admin-communication.ts
│   │       └── actions/
│   │           └── admin-communication/
│   │               └── index.ts
│   │
│   ├── components/
│   │   └── dynamic/admin/
│   │       ├── MessageComposer.tsx
│   │       ├── RecipientSelector.tsx
│   │       ├── TemplateSelector.tsx
│   │       ├── CampaignPreview.tsx
│   │       ├── DeliveryStats.tsx
│   │       └── AIAssistantPanel.tsx
│   │
│   └── app/
│       └── admin/
│           └── communication/
│               ├── page.tsx                    # Dashboard
│               ├── campaigns/
│               │   ├── page.tsx                # List
│               │   └── [id]/
│               │       └── page.tsx            # Profile
│               ├── compose/
│               │   └── page.tsx                # Manage
│               └── templates/
│                   └── page.tsx                # Templates
│
├── metadata/
│   └── authoring/
│       └── blueprints/
│           └── admin-communication/
│               ├── communication-dashboard.xml
│               ├── campaign-list.xml
│               ├── campaign-profile.xml
│               ├── campaign-manage.xml
│               └── template-list.xml
```

---

## Database Schema

### Tables

#### `communication_campaigns`
Primary table for email/SMS campaigns.

```sql
CREATE TABLE communication_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('individual', 'bulk', 'scheduled', 'recurring')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed')),
  channels TEXT[] NOT NULL DEFAULT '{"email"}',
  subject TEXT,
  content_html TEXT,
  content_text TEXT,
  template_id UUID REFERENCES communication_templates(id),
  recipient_criteria JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

#### `communication_templates`
Reusable message templates.

```sql
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('welcome', 'event', 'newsletter', 'prayer', 'announcement', 'follow-up', 'birthday', 'anniversary', 'custom')),
  channels TEXT[] NOT NULL DEFAULT '{"email"}',
  subject TEXT,
  content_html TEXT,
  content_text TEXT,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

#### `campaign_recipients`
Individual recipient tracking.

```sql
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('member', 'account', 'external')),
  recipient_id UUID,
  email TEXT,
  phone TEXT,
  personalization_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed')),
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `communication_preferences`
Opt-in/opt-out tracking.

```sql
CREATE TABLE communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID REFERENCES members(id),
  email TEXT,
  phone TEXT,
  email_opted_in BOOLEAN DEFAULT true,
  sms_opted_in BOOLEAN DEFAULT true,
  opted_out_at TIMESTAMPTZ,
  opted_out_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, member_id),
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, phone)
);
```

#### `communication_ai_suggestions`
AI suggestion tracking.

```sql
CREATE TABLE communication_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id UUID REFERENCES communication_campaigns(id),
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('subject', 'content', 'personalization', 'audience', 'schedule')),
  original_input TEXT,
  suggested_content TEXT NOT NULL,
  ai_model TEXT,
  tokens_used INTEGER,
  accepted BOOLEAN,
  feedback TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Page Specifications

### 1. Dashboard (`/admin/communication`)

**Purpose**: Overview of communication activity and quick actions

| Component | Type | Data Source |
|-----------|------|-------------|
| Hero Section | `HeroSection` (stats-panel) | `admin-communication.dashboard.hero` |
| Channel Metrics | `AdminMetricCards` | `admin-communication.dashboard.channels` |
| Recent Activity | `Timeline` | `admin-communication.dashboard.activity` |
| Quick Links | `QuickLinks` | Static |

**Hero Metrics**:
- Total messages sent (30 days)
- Delivery rate percentage
- Open rate percentage
- Active campaigns count

### 2. Campaign List (`/admin/communication/campaigns`)

**Purpose**: View all campaigns with filtering

| Component | Type | Data Source |
|-----------|------|-------------|
| Hero Section | `HeroSection` | `admin-communication.campaigns.hero` |
| Campaign Grid | `AdminDataGridSection` | `admin-communication.campaigns.table` |

**Grid Columns**: Name, Type, Status, Channels, Recipients, Sent, Opened, Created

**Filters**: Status, Channel, Date range

**Actions**: View, Edit, Duplicate, Delete, Resend

### 3. Campaign Profile (`/admin/communication/campaigns/[id]`)

**Purpose**: Detailed campaign view with analytics

| Component | Type | Data Source |
|-----------|------|-------------|
| Hero Section | `HeroSection` | `admin-communication.campaign.hero` |
| Details | `AdminDetailPanels` | `admin-communication.campaign.details` |
| Delivery Stats | `DeliveryStats` | `admin-communication.campaign.stats` |
| Recipients | `AdminDataGridSection` | `admin-communication.campaign.recipients` |

### 4. Campaign Manage (`/admin/communication/compose`)

**Purpose**: Create/edit campaigns with AI assistance

**Layout**: Split-view with AI sidebar

| Component | Purpose |
|-----------|---------|
| `MessageComposer` | Rich text editor with AI integration |
| `RecipientSelector` | Multi-source audience picker |
| `ChannelSelector` | Email, SMS, or both |
| `ScheduleSelector` | Send now, schedule, or recurring |
| `AIAssistantPanel` | Floating AI suggestions |

### 5. Template List (`/admin/communication/templates`)

**Purpose**: Manage reusable templates

| Component | Type | Data Source |
|-----------|------|-------------|
| Hero Section | `HeroSection` | `admin-communication.templates.hero` |
| Template Grid | `AdminDataGridSection` | `admin-communication.templates.table` |

---

## AI Integration

### CommunicationAIService Interface

```typescript
interface CommunicationAIService {
  // Message composition
  suggestSubjectLines(content: string, context: CampaignContext): Promise<string[]>;
  improveContent(content: string, tone: ToneType): Promise<string>;
  personalizeMessage(template: string, recipientData: RecipientData): Promise<string>;

  // Template generation
  generateTemplate(prompt: string, category: TemplateCategory): Promise<Template>;
  suggestVariables(content: string): Promise<Variable[]>;

  // Audience
  suggestAudience(content: string, memberData: MemberSummary[]): Promise<AudienceSuggestion>;

  // Scheduling
  suggestSendTime(audience: Audience, campaignType: string): Promise<Date>;
}
```

### AI Tools

| Tool | Purpose | Example Prompt |
|------|---------|----------------|
| `ComposeMessageTool` | Draft messages via AI chat | "Draft a prayer request follow-up email" |
| `GenerateTemplateTool` | Create templates | "Create a birthday greeting template" |
| `SuggestAudienceTool` | Recommend recipients | "Who should receive this event announcement?" |

### Credit Integration

- Uses existing `AICreditService.hasSufficientCredits()`
- Deducts credits after successful AI generation
- Falls back gracefully if insufficient credits

---

## Permissions

### Feature Permissions

```
communication:view          -- View campaigns and templates
communication:send          -- Send individual messages
communication:bulk_send     -- Send bulk campaigns
communication:manage        -- Create/edit campaigns and drafts
communication:templates     -- Create and manage templates
communication:analytics     -- View delivery analytics
communication:ai_assist     -- Use AI composition features
communication:delete        -- Delete campaigns and templates
```

### Role Mappings

| Role | Permissions |
|------|-------------|
| `member` | `communication:view` |
| `volunteer` | `communication:view`, `communication:send` |
| `staff` | All except `communication:delete` |
| `tenant_admin` | All permissions |

---

## Sidebar Menu

Add to `sidebar-nav.tsx`:

```typescript
// Icons
messaging: MessageSquare,
campaigns: Send,
templates: FileText,
compose: PenSquare,

// Menu Section
{
  label: "Communication",
  items: [
    { title: "Dashboard", href: "/admin/communication", icon: "messaging" },
    { title: "Campaigns", href: "/admin/communication/campaigns", icon: "campaigns" },
    { title: "Compose", href: "/admin/communication/compose", icon: "compose" },
    { title: "Templates", href: "/admin/communication/templates", icon: "templates" },
  ]
}
```

---

## Progress Tracking

### Files Created

| File | Status | Notes |
|------|--------|-------|
| Database Migration | ✅ | `20260125021646_communication_module.sql` |
| **Models** | | |
| `campaign.model.ts` | ✅ | Includes Campaign, CreateCampaignDto, UpdateCampaignDto, CampaignStats |
| `template.model.ts` | ✅ | Includes Template, TemplateCategory, TemplateVariable |
| `recipient.model.ts` | ✅ | Includes CampaignRecipient, ResolvedRecipient, RecipientSource |
| `preference.model.ts` | ✅ | Includes CommunicationPreference, OptOutRequest |
| `ai-suggestion.model.ts` | ✅ | Includes AISuggestion, ToneType, AI request/response types |
| `index.ts` | ✅ | Barrel export |
| **Adapters** | | |
| `campaign.adapter.ts` | ✅ | Full CRUD with stats and activity |
| `template.adapter.ts` | ✅ | Template CRUD with usage tracking |
| `recipient.adapter.ts` | ✅ | Bulk creation, status updates |
| `preference.adapter.ts` | ✅ | Opt-in/opt-out management |
| `index.ts` | ✅ | Barrel export |
| **Repositories** | | |
| `campaign.repository.ts` | ✅ | Uses `ICommCampaignAdapter` |
| `template.repository.ts` | ✅ | Uses `ITemplateAdapter` |
| `recipient.repository.ts` | ✅ | Uses `IRecipientAdapter` |
| `preference.repository.ts` | ✅ | Uses `IPreferenceAdapter` |
| `index.ts` | ✅ | Barrel export |
| **Services** | | |
| `CommunicationService.ts` | ✅ | Main orchestrator |
| `CampaignService.ts` | ✅ | Campaign CRUD, duplication, status |
| `TemplateService.ts` | ✅ | Template management |
| `RecipientService.ts` | ✅ | Recipient resolution |
| `DeliveryService.ts` | ✅ | Email/SMS sending (placeholder) |
| `index.ts` | ✅ | Barrel export |
| `CommunicationAIService.ts` | ⬜ | Phase 4 |
| **DI Configuration** | | |
| `types.ts` updates | ✅ | Communication module symbols added |
| `container.ts` updates | ✅ | All services registered |
| **Navigation** | | |
| `sidebar-nav.tsx` updates | ✅ | Icons added |
| `layout.tsx` updates | ✅ | Menu section added |
| **Page Routes** | | |
| `/admin/communication/page.tsx` | ✅ | Dashboard |
| `/admin/communication/campaigns/page.tsx` | ✅ | Campaign list |
| `/admin/communication/campaigns/[id]/page.tsx` | ✅ | Campaign profile |
| `/admin/communication/compose/page.tsx` | ✅ | Compose (client component) |
| `/admin/communication/templates/page.tsx` | ✅ | Templates list |
| Loading files (5x) | ✅ | All pages have loading states |
| **API Routes** | | |
| `/api/admin/communication/campaigns/route.ts` | ✅ | GET, POST |
| `/api/admin/communication/campaigns/[id]/route.ts` | ✅ | GET, PUT, DELETE |
| `/api/admin/communication/campaigns/[id]/send/route.ts` | ✅ | POST - Send campaign |
| `/api/admin/communication/templates/route.ts` | ✅ | GET, POST |
| `/api/admin/communication/templates/generate/route.ts` | ✅ | POST - AI template generation |
| `/api/admin/communication/recipients/members/route.ts` | ✅ | GET - List members |
| `/api/admin/communication/recipients/members/search/route.ts` | ✅ | GET - Search members |
| `/api/admin/communication/recipients/groups/route.ts` | ✅ | GET - List groups (families, events, ministries) |
| `/api/admin/communication/recipients/[source]/[groupId]/members/route.ts` | ✅ | GET - Group members |
| `/api/admin/communication/ai/assist/route.ts` | ✅ | POST - AI assist (improve, subject, personalize, grammar) |
| **Metadata XML** | | |
| Dashboard XML | ✅ | `communication-dashboard.xml` |
| Campaign List XML | ✅ | `campaign-list.xml` |
| Campaign Profile XML | ✅ | `campaigns-profile.xml` |
| Campaign Manage XML | ✅ | `campaign-manage.xml` |
| Template List XML | ✅ | `template-list.xml` |
| `admin-communication.ts` handlers | ✅ | 16 handlers (dashboard, campaigns, templates) |
| `admin-communication/index.ts` actions | ✅ | Campaign & template CRUD actions |
| `admin-communication.manifest.ts` | ✅ | Module manifest registered |
| **Components** | | |
| `MessageComposer.tsx` | ✅ | Rich text editor with variable insertion |
| `RecipientSelector.tsx` | ✅ | Multi-source recipient picker |
| `TemplateSelector.tsx` | ✅ | Template browser with preview |
| `VariableInserter.tsx` | ✅ | Personalization variable dropdown |
| `CampaignComposer.tsx` | ✅ | Main compose page component |
| `communication/index.ts` | ✅ | Component exports |
| `AIAssistantPanel.tsx` | ⬜ | Phase 4 |
| **AI Tools** | | |
| `ComposeMessageTool.ts` | ⬜ | Phase 4 |
| `GenerateTemplateTool.ts` | ⬜ | Phase 4 |
| `SuggestAudienceTool.ts` | ⬜ | Phase 4 |

### Legend

- ⬜ Not Started
- 🔄 In Progress
- ✅ Complete
- ⚠️ Blocked

---

## Critical Files to Modify

1. `apps/web/src/components/admin/sidebar-nav.tsx` - Add Communication menu
2. `apps/web/src/lib/types.ts` - Add new type symbols
3. `apps/web/src/lib/container.ts` - Register new services
4. `apps/web/src/lib/metadata/component-registry.ts` - Register new components
5. `apps/web/src/lib/metadata/services/admin-communication.ts` - Create handlers

---

## Testing Checklist

- [ ] Database migration applies cleanly
- [ ] Campaign CRUD operations work
- [ ] Template CRUD operations work
- [ ] Recipient resolution from all sources
- [ ] Email delivery via Resend
- [ ] SMS delivery via Twilio
- [ ] AI suggestions work with credit deduction
- [ ] Permissions enforced correctly
- [ ] Mobile responsive design
- [ ] E2E test for campaign creation flow

---

## References

- [CLAUDE.md](../CLAUDE.md) - Project conventions
- [Metadata XML Framework](../apps/web/metadata/) - XML blueprints
- [Existing Notification Channels](../apps/web/src/lib/notifications/) - Email/SMS infrastructure
- [AI Assistant](../apps/web/src/lib/ai-assistant/) - AI tool patterns
