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
      <permission>members:view</permission>
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
    <permission>members:view</permission>
    <permission>members:edit</permission>
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
    <condition type="permission" value="members:edit" />
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

### Pattern 3: Manage/Form Page

**IMPORTANT:** For form pages, use `AdminFormSection` (NOT `FormSection`). The component requires specific prop names.

```xml
<PageDefinition kind="blueprint" module="admin-finance" route="funds/manage" ...>
  <Page id="admin-finance-funds-manage">
    <Title>Manage fund</Title>
    <Regions>
      <Region id="main">
        <Component id="form-header" type="HeroSection">
          <Props>
            <Prop name="variant" kind="static">minimal</Prop>
            <Prop name="eyebrow" kind="binding" contract="formHeader.eyebrow"/>
            <Prop name="headline" kind="binding" contract="formHeader.headline"/>
            <Prop name="description" kind="binding" contract="formHeader.description"/>
          </Props>
        </Component>
        <!-- CORRECT: Use AdminFormSection with proper props -->
        <Component id="entity-form" type="AdminFormSection">
          <Props>
            <Prop name="title" kind="static">Entity information</Prop>
            <Prop name="description" kind="static">Enter the entity details.</Prop>
            <Prop name="fields" kind="binding" contract="form.fields"/>
            <Prop name="initialValues" kind="binding" contract="form.values"/>
            <Prop name="validation" kind="binding" contract="form.validation"/>
            <Prop name="submitAction" kind="action" actionId="save-entity"/>
            <Prop name="cancelAction" kind="action" actionId="cancel"/>
          </Props>
        </Component>
      </Region>
    </Regions>
    <DataSources>
      <DataSource id="formHeader" kind="service">
        <Contract>
          <Field name="eyebrow" path="eyebrow"/>
          <Field name="headline" path="headline"/>
          <Field name="description" path="description"/>
        </Contract>
        <Config>
          <Handler>admin-module.entity.manage.header</Handler>
        </Config>
      </DataSource>
      <DataSource id="form" kind="service">
        <Contract>
          <Field name="fields" path="fields"/>
          <Field name="values" path="values"/>
          <Field name="validation" path="validation"/>
        </Contract>
        <Config>
          <Handler>admin-module.entity.manage.form</Handler>
        </Config>
      </DataSource>
    </DataSources>
    <Actions>
      <Action id="save-entity" kind="submit">
        <Config>
          <Label>Save entity</Label>
          <Handler>admin-module.entity.save</Handler>
          <SuccessUrl>/admin/module/entities</SuccessUrl>
          <SuccessMessage>Entity saved successfully</SuccessMessage>
          <Variant>primary</Variant>
        </Config>
      </Action>
      <Action id="cancel" kind="link">
        <Config>
          <Label>Cancel</Label>
          <Url>/admin/module/entities</Url>
          <Variant>secondary</Variant>
        </Config>
      </Action>
    </Actions>
  </Page>
</PageDefinition>
```

**Key Points for AdminFormSection:**
- Use `AdminFormSection` type, NOT `FormSection`
- Use `initialValues` prop, NOT `values`
- Use `submitAction` and `cancelAction` with `kind="action"` and `actionId`
- Do NOT use `submitLabel`, `cancelUrl`, or `onSubmit` props

**Service Handler Pattern for Form:**
```typescript
const resolveEntityManageForm: ServiceDataSourceHandler = async (request) => {
  const entityId = request.params?.entityId as string;
  const repository = container.get<IEntityRepository>(TYPES.IEntityRepository);

  let values = { name: '', code: '', isActive: true };

  if (entityId) {
    const entity = await repository.findById(entityId);
    if (entity) {
      values = { name: entity.name, code: entity.code || '', isActive: entity.isActive !== false };
    }
  }

  return {
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 'half' },
      { name: 'code', label: 'Code', type: 'text', colSpan: 'half' },
      { name: 'isActive', label: 'Active', type: 'toggle', colSpan: 'full', helperText: 'Description shown below the toggle' },
    ],
    values,
    validation: { name: { required: true } },
  };
};
```

**Important Field Types:**
- `text` - Standard text input
- `textarea` - Multi-line text (use `rows` prop)
- `toggle` - Boolean switch (NOT `checkbox` or `switch`)
- `select` - Dropdown selection
- `number` - Numeric input

**CRITICAL: Action Handler Registration**

For `kind="submit"` actions in XML to work, you must register **both**:

1. **Service Handler** in `src/lib/metadata/services/admin-<module>.ts`:
```typescript
const saveEntity: ServiceDataSourceHandler = async (request) => {
  // CRITICAL: Form values are wrapped in 'values' by AdminFormSubmitHandler
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;
  const entityId = (values.entityId ?? params.entityId) as string | undefined;

  // Extract form data from values, NOT directly from params
  const formData = {
    name: values.name as string,
    code: values.code as string | undefined,
    isActive: values.isActive === true || values.isActive === 'true',
  };

  // ... save logic using formData
  return { success: true, message: 'Saved successfully', redirectUrl: '/admin/module/entities' };
};

export const adminModuleHandlers = {
  'admin-module.entity.save': saveEntity,
  'admin-module.entity.delete': deleteEntity,
};
```

**IMPORTANT:** AdminFormSubmitHandler wraps form values in a `{ mode, values }` structure. Service handlers MUST extract values from `params.values`, NOT directly from `params`. Accessing `params.name` directly will be `undefined`.

2. **Action Handler** in `src/lib/metadata/actions/admin-<module>/index.ts`:
```typescript
async function handleSaveEntity(execution: MetadataActionExecution): Promise<MetadataActionResult> {
  const serviceHandler = adminModuleHandlers['admin-module.entity.save'];
  const result = await serviceHandler({ params: execution.input, context: execution.context });
  return {
    success: result.success,
    status: result.success ? 200 : 400,
    message: result.message,
    redirectUrl: result.redirectUrl,
  };
}

export const adminModuleActionHandlers = {
  'admin-module.entity.save': handleSaveEntity,
  'admin-module.entity.delete': handleDeleteEntity,
};
```

3. **Register in Module Manifest** (`src/lib/metadata/modules/admin-<module>.manifest.ts`):
```typescript
export const adminModuleManifest: MetadataModuleManifest = {
  id: 'admin-module',
  actions: adminModuleActionHandlers,  // Action handlers for form submissions
  services: adminModuleHandlers,        // Service handlers for data fetching
};
```

**Why Two Layers?**
- Service handlers handle data fetching AND mutations (business logic)
- Action handlers wrap service handlers with proper `MetadataActionResult` formatting
- The metadata system routes `kind="submit"` actions through action handlers

## Troubleshooting

### Issue: Changes Not Reflected

**Solution:** Run `npm run metadata:compile`

### Issue: Compilation Errors

**Solution:** Check XML against XSD schema. Common errors:
- Missing required attributes
- Invalid element nesting
- Typos in element/attribute names

### Issue: Empty Container Elements

**Problem:** XSD validation fails with error like:
```
Element 'DataSources': Missing child element(s). Expected is ( DataSource ).
```

**Cause:** Empty container elements like `<DataSources />` or `<Actions />` are not allowed by the XSD schema. Container elements must either have at least one child element OR be omitted entirely.

**Solution:** If a page doesn't need DataSources or Actions, simply omit the element entirely instead of including an empty one:

```xml
<!-- WRONG: Empty container elements -->
<Page id="my-page">
  <Regions>...</Regions>
  <DataSources />  <!-- ❌ Not allowed - will fail validation -->
  <Actions />      <!-- ❌ Not allowed - will fail validation -->
</Page>

<!-- CORRECT: Omit unused container elements -->
<Page id="my-page">
  <Regions>...</Regions>
  <!-- No DataSources or Actions needed - just omit them entirely -->
</Page>
```

**Note:** This applies to all container elements in the XSD schema that require child elements (DataSources, Actions, etc.)

### Issue: Component Not Found

**Solution:** Register component in `src/lib/metadata/component-registry.ts`

### Issue: Data Source Not Loading

**Solution:**
- Check data source ID matches `dataBinding` source
- Verify query syntax or API endpoint
- Check browser console for errors

### Issue: "Unsupported action kind: submit"

**Problem:** Form submission fails with error:
```
Error: Unsupported action kind: submit
```

**Cause:** The action handler is not registered for the handler ID specified in the XML `<Handler>` element.

**Solution:** Ensure the action handler is registered in `src/lib/metadata/actions/admin-<module>/index.ts`:

1. Create the action handler function that delegates to the service handler
2. Register it in the `adminModuleActionHandlers` export with the correct handler ID
3. Ensure the module manifest includes both `actions` and `services`

Example - if your XML has:
```xml
<Action id="save-entity" kind="submit">
  <Config>
    <Handler>admin-finance.funds.save</Handler>
  </Config>
</Action>
```

You need this in `admin-finance/index.ts`:
```typescript
export const adminFinanceActionHandlers = {
  'admin-finance.funds.save': handleSaveFund,  // Must match the Handler value
};
```

### Issue: Form Field Renders as Text Input Instead of Toggle

**Problem:** A boolean field like `isActive` renders as a text input showing "true" or "false" instead of a toggle switch.

**Cause:** Using wrong field type. The `fieldRenderers.tsx` only handles `toggle` type for boolean switches - `checkbox` and `switch` fall through to the default text input.

**Solution:** Use `type: 'toggle'` in the service handler:
```typescript
// WRONG - will render as text input
{ name: 'isActive', label: 'Active', type: 'checkbox', colSpan: 'full' }
{ name: 'isActive', label: 'Active', type: 'switch', colSpan: 'full' }

// CORRECT - will render as toggle switch
{ name: 'isActive', label: 'Active', type: 'toggle', colSpan: 'full', helperText: 'Description text' }
```

## Related Documentation

- **Component Registry:** `src/lib/metadata/component-registry.ts`
- **Resolver:** `src/lib/metadata/resolver.ts`
- **Compiler:** `tools/metadata/compile.ts`
- **Schema:** `metadata/xsd/page-definition.xsd`
- **Root Guide:** `CLAUDE.md`
