# Metadata Authoring Directory - Architecture & Patterns

## Overview

The `metadata/authoring/` directory contains **XML-based page definitions** that power StewardTrack's metadata-driven UI system. Pages are authored in XML, validated against XSD schema, compiled to JSON, and rendered dynamically at runtime.

**Key Innovation:** Define entire pages (data sources, components, layouts, actions) in XML without writing React code.

## Directory Structure

```
metadata/authoring/
├── blueprints/                  # Base page definitions
│   ├── admin-community/         # Community management module
│   │   ├── members.xml          # Members page
│   │   ├── families.xml         # Families page
│   │   └── ...
│   ├── admin-settings/          # Settings module
│   └── ...
└── overlays/                    # Tenant/role/variant customizations
    ├── tenant-123/              # Tenant-specific overrides
    │   └── admin-community/
    │       └── members.xml      # Custom members page for tenant-123
    └── role-admin/              # Role-specific overrides
        └── ...
```

## Metadata System Architecture

### The Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     1. AUTHORING PHASE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Developer creates/edits XML files in:                               │
│  • metadata/authoring/blueprints/ (base definitions)                 │
│  • metadata/authoring/overlays/ (customizations)                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     2. COMPILATION PHASE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Command: npm run metadata:compile                                   │
│                                                                       │
│  Compiler (tools/metadata/compile.ts):                               │
│  1. Validates XML against XSD schema (metadata/xsd/)                 │
│  2. Transforms XML → Canonical JSON                                  │
│  3. Generates checksums for content versioning                       │
│  4. Outputs to metadata/compiled/ with version hashes                │
│  5. Updates metadata/registry/manifest.json                          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     3. RUNTIME PHASE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Request: /admin/community/members                                   │
│                                                                       │
│  Resolver (src/lib/metadata/resolver.ts):                            │
│  1. Loads manifest.json                                              │
│  2. Resolves base blueprint + overlays (by tenant/role/variant)      │
│  3. Merges layers (base + tenant + role + variant)                   │
│  4. Returns canonical JSON definition                                │
│                                                                       │
│  Interpreter (src/lib/metadata/interpreter.tsx):                     │
│  1. Walks canonical JSON definition                                  │
│  2. Resolves data sources (queries, API calls)                       │
│  3. Renders React components via component registry                  │
│  4. Evaluates conditions (RBAC, feature flags, expressions)          │
│  5. Binds data to component props                                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files in System

- **Schema:** `metadata/xsd/page-definition.xsd` (XML schema definition)
- **Compiler:** `tools/metadata/compile.ts` (validation + transformation)
- **Manifest:** `metadata/registry/manifest.json` (artifact registry)
- **Resolver:** `src/lib/metadata/resolver.ts` (layer merging)
- **Interpreter:** Imported package (JSON → React)
- **Component Registry:** `src/lib/metadata/component-registry.ts` (type → component)

## XML Page Definition Structure

### Complete Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pageDefinition
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:noNamespaceSchemaLocation="../../xsd/page-definition.xsd"
  id="admin-community-members"
  version="1.0"
  module="admin-community"
  route="members">

  <!-- Metadata -->
  <metadata>
    <title>Member Management</title>
    <description>Manage church members, families, and contacts</description>
    <author>StewardTrack Team</author>
    <created>2024-01-15</created>
    <updated>2024-03-20</updated>
    <tags>
      <tag>members</tag>
      <tag>community</tag>
      <tag>administration</tag>
    </tags>
  </metadata>

  <!-- Access Control -->
  <accessControl>
    <permissions>
      <permission>members:read</permission>
    </permissions>
    <roles>
      <role>tenant_admin</role>
      <role>staff</role>
    </roles>
    <featureFlags>
      <feature>member_management</feature>
    </featureFlags>
  </accessControl>

  <!-- Data Sources -->
  <dataSources>
    <dataSource id="membersList" type="query">
      <query>
        <table>members</table>
        <select>id, first_name, last_name, email, phone, status</select>
        <where>tenant_id = $tenantId AND deleted_at IS NULL</where>
        <orderBy>last_name ASC, first_name ASC</orderBy>
      </query>
    </dataSource>

    <dataSource id="memberStats" type="api">
      <endpoint>/api/members/stats</endpoint>
      <method>GET</method>
    </dataSource>
  </dataSources>

  <!-- Layout -->
  <layout type="admin-workspace">
    <regions>
      <!-- Header Region -->
      <region id="header" slot="header">
        <components>
          <component id="page-header" type="PageHeader">
            <props>
              <prop name="title" value="Member Management" />
              <prop name="subtitle" value="Manage your church community" />
            </props>
          </component>
        </components>
      </region>

      <!-- Main Content Region -->
      <region id="main" slot="main">
        <components>
          <!-- Metric Cards -->
          <component id="metric-cards" type="AdminMetricCards">
            <dataBinding property="metrics" source="memberStats" path="data.metrics" />
          </component>

          <!-- Data Table -->
          <component id="members-table" type="AdminDataGridSection">
            <dataBinding property="data" source="membersList" />
            <props>
              <prop name="title" value="All Members" />
              <prop name="searchable" value="true" />
              <prop name="filterable" value="true" />
              <prop name="exportable" value="true" />
            </props>
            <columns>
              <column id="name" label="Name" sortable="true" />
              <column id="email" label="Email" sortable="true" />
              <column id="phone" label="Phone" sortable="false" />
              <column id="status" label="Status" sortable="true" />
            </columns>
            <actions>
              <action id="view" label="View" actionRef="viewMember" />
              <action id="edit" label="Edit" actionRef="editMember" />
              <action id="delete" label="Delete" actionRef="deleteMember" />
            </actions>
          </component>
        </components>
      </region>

      <!-- Sidebar Region -->
      <region id="sidebar" slot="sidebar">
        <components>
          <component id="quick-filters" type="QuickFilters">
            <props>
              <prop name="filters">
                <arrayValue>
                  <item>
                    <objectValue>
                      <prop name="label" value="Active Members" />
                      <prop name="filter" value="status:active" />
                    </objectValue>
                  </item>
                  <item>
                    <objectValue>
                      <prop name="label" value="New This Month" />
                      <prop name="filter" value="created:thisMonth" />
                    </objectValue>
                  </item>
                </arrayValue>
              </prop>
            </props>
          </component>
        </components>
      </region>
    </regions>
  </layout>

  <!-- Actions -->
  <actions>
    <action id="viewMember" type="navigate">
      <target>/admin/community/members/{id}</target>
    </action>

    <action id="editMember" type="dialog">
      <dialog>
        <title>Edit Member</title>
        <component type="MemberEditForm">
          <dataBinding property="member" source="selectedMember" />
        </component>
      </dialog>
    </action>

    <action id="deleteMember" type="confirm">
      <confirmation>
        <title>Delete Member</title>
        <message>Are you sure you want to delete this member?</message>
        <onConfirm>
          <apiCall>
            <endpoint>/api/members/{id}</endpoint>
            <method>DELETE</method>
          </apiCall>
        </onConfirm>
      </confirmation>
    </action>
  </actions>

</pageDefinition>
```

## Key XML Elements

### 1. Root Element (`<pageDefinition>`)

```xml
<pageDefinition
  id="unique-page-id"
  version="1.0"
  module="admin-community"
  route="members">
  <!-- ... -->
</pageDefinition>
```

**Attributes:**
- **`id`**: Unique identifier for the page
- **`version`**: Semantic version (for compatibility)
- **`module`**: Module/category (e.g., `admin-community`, `admin-settings`)
- **`route`**: URL route segment (e.g., `members` → `/admin/community/members`)

### 2. Metadata (`<metadata>`)

```xml
<metadata>
  <title>Page Title</title>
  <description>Page description</description>
  <author>Author Name</author>
  <created>2024-01-15</created>
  <updated>2024-03-20</updated>
  <tags>
    <tag>members</tag>
    <tag>administration</tag>
  </tags>
</metadata>
```

**Purpose:** Documentation and discoverability.

### 3. Access Control (`<accessControl>`)

```xml
<accessControl>
  <permissions>
    <permission>members:read</permission>
    <permission>members:write</permission>
  </permissions>
  <roles>
    <role>tenant_admin</role>
    <role>staff</role>
  </roles>
  <featureFlags>
    <feature>member_management</feature>
  </featureFlags>
</accessControl>
```

**Enforcement:**
- **Permissions:** User must have ALL listed permissions
- **Roles:** User must have AT LEAST ONE listed role
- **Feature Flags:** Tenant must have ALL listed features

**Result:** Page returns 403 if any check fails.

### 4. Data Sources (`<dataSources>`)

#### Query Data Source

```xml
<dataSource id="membersList" type="query">
  <query>
    <table>members</table>
    <select>id, first_name, last_name, email</select>
    <where>tenant_id = $tenantId AND deleted_at IS NULL</where>
    <orderBy>last_name ASC</orderBy>
    <limit>100</limit>
  </query>
</dataSource>
```

#### API Data Source

```xml
<dataSource id="memberStats" type="api">
  <endpoint>/api/members/stats</endpoint>
  <method>GET</method>
  <params>
    <param name="tenantId" value="$tenantId" />
  </params>
</dataSource>
```

#### Static Data Source

```xml
<dataSource id="statusOptions" type="static">
  <data>
    [
      { "value": "active", "label": "Active" },
      { "value": "inactive", "label": "Inactive" }
    ]
  </data>
</dataSource>
```

**Variables:**
- `$tenantId` - Current tenant ID
- `$userId` - Current user ID
- `$role` - Current user role
- Custom variables defined in context

### 5. Layout & Regions (`<layout>`)

```xml
<layout type="admin-workspace">
  <regions>
    <region id="header" slot="header">
      <components>...</components>
    </region>

    <region id="main" slot="main">
      <components>...</components>
    </region>

    <region id="sidebar" slot="sidebar">
      <components>...</components>
    </region>
  </regions>
</layout>
```

**Layout Types:**
- **`admin-workspace`**: Standard admin page layout (header, main, sidebar)
- **`full-width`**: Full-width content (no sidebar)
- **`dashboard`**: Dashboard grid layout
- **`wizard`**: Multi-step wizard

**Slots:**
- **`header`**: Page header area
- **`main`**: Primary content area
- **`sidebar`**: Side panel
- **`footer`**: Footer area

### 6. Components (`<component>`)

```xml
<component id="members-table" type="AdminDataGridSection">
  <!-- Data Binding -->
  <dataBinding property="data" source="membersList" />

  <!-- Static Props -->
  <props>
    <prop name="title" value="All Members" />
    <prop name="searchable" value="true" />
  </props>

  <!-- Conditional Rendering -->
  <conditions>
    <condition type="permission" value="members:write" />
    <condition type="feature" value="advanced_tables" />
  </conditions>

  <!-- Nested Elements (e.g., columns, actions) -->
  <columns>
    <column id="name" label="Name" sortable="true" />
  </columns>
</component>
```

**Component Types:** Defined in `src/lib/metadata/component-registry.ts`

**Common Components:**
- **`AdminDataGridSection`**: Data table with filtering, sorting, pagination
- **`AdminFormSection`**: Form with validation
- **`AdminMetricCards`**: KPI metric cards
- **`AdminDetailPanels`**: Detail view panels
- **`PageHeader`**: Page title and breadcrumbs
- **`Button`**, **`Card`**, **`Dialog`**, etc. (UI primitives)

### 7. Data Binding (`<dataBinding>`)

```xml
<!-- Bind entire data source to property -->
<dataBinding property="data" source="membersList" />

<!-- Bind specific path from data source -->
<dataBinding property="metrics" source="memberStats" path="data.metrics" />

<!-- Transform data before binding -->
<dataBinding property="chartData" source="memberStats" transform="toChartFormat" />
```

**Binding Attributes:**
- **`property`**: Component prop name
- **`source`**: Data source ID
- **`path`**: JSONPath to specific data (optional)
- **`transform`**: Transformation function (optional)

### 8. Actions (`<actions>`)

#### Navigate Action

```xml
<action id="viewMember" type="navigate">
  <target>/admin/community/members/{id}</target>
</action>
```

#### Dialog Action

```xml
<action id="editMember" type="dialog">
  <dialog>
    <title>Edit Member</title>
    <component type="MemberEditForm">
      <dataBinding property="member" source="selectedMember" />
    </component>
  </dialog>
</action>
```

#### API Call Action

```xml
<action id="deleteMember" type="apiCall">
  <apiCall>
    <endpoint>/api/members/{id}</endpoint>
    <method>DELETE</method>
    <onSuccess>
      <refresh source="membersList" />
      <toast message="Member deleted successfully" type="success" />
    </onSuccess>
    <onError>
      <toast message="Failed to delete member" type="error" />
    </onError>
  </apiCall>
</action>
```

#### Confirm Action

```xml
<action id="deleteMember" type="confirm">
  <confirmation>
    <title>Delete Member</title>
    <message>Are you sure?</message>
    <onConfirm>
      <apiCall>
        <endpoint>/api/members/{id}</endpoint>
        <method>DELETE</method>
      </apiCall>
    </onConfirm>
  </confirmation>
</action>
```

## Overlay System (Customization)

### Purpose

Overlays allow **tenant-specific**, **role-specific**, or **variant-specific** customizations without modifying base blueprints.

### Overlay Structure

```
metadata/authoring/overlays/
├── tenant-{tenantId}/           # Tenant-specific overrides
│   └── admin-community/
│       └── members.xml          # Custom members page
├── role-{roleId}/               # Role-specific overrides
│   └── admin-community/
│       └── members.xml
└── variant-{variantName}/       # Variant overrides (e.g., mobile)
    └── admin-community/
        └── members.xml
```

### Overlay Example

**Base Blueprint** (`blueprints/admin-community/members.xml`):
```xml
<pageDefinition id="admin-community-members">
  <layout>
    <region id="main">
      <component id="members-table" type="AdminDataGridSection">
        <props>
          <prop name="title" value="All Members" />
        </props>
      </component>
    </region>
  </layout>
</pageDefinition>
```

**Tenant Overlay** (`overlays/tenant-123/admin-community/members.xml`):
```xml
<pageDefinition id="admin-community-members">
  <layout>
    <region id="main">
      <!-- Override title for tenant-123 -->
      <component id="members-table" type="AdminDataGridSection">
        <props>
          <prop name="title" value="Congregation Members" />
        </props>
      </component>
    </region>
  </layout>
</pageDefinition>
```

**Merged Result** (for tenant-123):
```xml
<pageDefinition id="admin-community-members">
  <layout>
    <region id="main">
      <component id="members-table" type="AdminDataGridSection">
        <props>
          <prop name="title" value="Congregation Members" /> <!-- Overridden -->
        </props>
      </component>
    </region>
  </layout>
</pageDefinition>
```

### Merge Strategy

Overlays merge by **element ID**:
- **Matching ID**: Overlay replaces base
- **New ID**: Overlay adds to base
- **Omitted ID**: Base remains unchanged

## Critical Commands

### Compile Metadata

```bash
# Compile all metadata files
npm run metadata:compile

# Watch for changes (auto-compile)
npm run metadata:watch
```

**What it does:**
1. Validates XML against XSD schema
2. Transforms XML → JSON
3. Generates checksums
4. Updates `metadata/registry/manifest.json`
5. Outputs to `metadata/compiled/`

### Regenerate TypeScript Types

```bash
npm run metadata:types
```

**When to run:** After modifying `metadata/xsd/page-definition.xsd`

## Best Practices

### 1. Always Compile After Changes

```bash
# After editing any XML file
npm run metadata:compile
```

**Why:** Dev server doesn't auto-compile metadata. Changes won't reflect until compiled.

### 2. Validate Schema

Ensure XML is valid before compiling:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<pageDefinition
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:noNamespaceSchemaLocation="../../xsd/page-definition.xsd">
  <!-- ... -->
</pageDefinition>
```

### 3. Use Meaningful IDs

```xml
<!-- GOOD: Descriptive IDs -->
<component id="members-table" type="AdminDataGridSection">
<component id="export-button" type="Button">

<!-- BAD: Generic IDs -->
<component id="comp1" type="AdminDataGridSection">
<component id="btn" type="Button">
```

### 4. Document with Metadata

```xml
<metadata>
  <title>Clear, concise page title</title>
  <description>Detailed description of page purpose</description>
  <author>Team/Individual Name</author>
  <tags>
    <tag>descriptive-tag</tag>
  </tags>
</metadata>
```

### 5. Use Overlays for Customization

**Don't modify base blueprints** for tenant-specific changes. Use overlays instead.

### 6. Register Components Before Use

Before using a component in XML:
```typescript
// src/lib/metadata/component-registry.ts
import { MyNewComponent } from '@/components/MyNewComponent';

export const componentRegistry = {
  'MyNewComponent': MyNewComponent,
};
```

## Common Patterns

### Pattern 1: CRUD Page

```xml
<pageDefinition id="admin-members">
  <dataSources>
    <dataSource id="membersList" type="query">
      <query>
        <table>members</table>
        <select>*</select>
        <where>tenant_id = $tenantId</where>
      </query>
    </dataSource>
  </dataSources>

  <layout type="admin-workspace">
    <region id="main">
      <component id="members-table" type="AdminDataGridSection">
        <dataBinding property="data" source="membersList" />
        <actions>
          <action id="create" label="New Member" actionRef="createMember" />
          <action id="edit" label="Edit" actionRef="editMember" />
          <action id="delete" label="Delete" actionRef="deleteMember" />
        </actions>
      </component>
    </region>
  </layout>

  <actions>
    <action id="createMember" type="dialog">...</action>
    <action id="editMember" type="dialog">...</action>
    <action id="deleteMember" type="confirm">...</action>
  </actions>
</pageDefinition>
```

### Pattern 2: Dashboard Page

```xml
<pageDefinition id="admin-dashboard">
  <dataSources>
    <dataSource id="dashboardStats" type="api">
      <endpoint>/api/dashboard/stats</endpoint>
    </dataSource>
  </dataSources>

  <layout type="dashboard">
    <region id="main">
      <component id="metric-cards" type="AdminMetricCards">
        <dataBinding property="metrics" source="dashboardStats" path="data.metrics" />
      </component>

      <component id="recent-activity" type="AdminActivityTimeline">
        <dataBinding property="activities" source="dashboardStats" path="data.activities" />
      </component>
    </region>
  </layout>
</pageDefinition>
```

## Troubleshooting

### Issue: Changes Not Reflected

**Solution:** Run `npm run metadata:compile`

### Issue: Compilation Errors

**Solution:** Check XML against XSD schema. Common errors:
- Missing required attributes
- Invalid element nesting
- Typos in element/attribute names

### Issue: Component Not Found

**Solution:** Register component in `src/lib/metadata/component-registry.ts`

### Issue: Data Source Not Loading

**Solution:**
- Check data source ID matches `dataBinding` source
- Verify query syntax or API endpoint
- Check browser console for errors

## Related Documentation

- **Component Registry:** `src/lib/metadata/component-registry.ts`
- **Resolver:** `src/lib/metadata/resolver.ts`
- **Compiler:** `tools/metadata/compile.ts`
- **Schema:** `metadata/xsd/page-definition.xsd`
- **Root Guide:** `CLAUDE.md`
