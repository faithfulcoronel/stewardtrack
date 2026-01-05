# Household Management Feature Revamp Plan

## Executive Summary

This document outlines a comprehensive plan to revamp the household/family management feature in StewardTrack. The goal is to create a stable, scalable system that properly models family relationships while supporting the requirement that **each member can have a primary family and also belong to other families**.

---

## Current State Analysis

### Existing Database Schema

#### `member_households` Table
- Stores household address and metadata
- One-to-many relationship with members (via `members.household_id`)
- No concept of primary vs secondary family membership
- `member_names` stored as text array (denormalized)

#### `family_relationships` Table
- Stores person-to-person relationships (spouse, parent, child, etc.)
- Uses categories table for relationship types
- No integration with household concept
- RLS policies are too permissive (`USING (true)`)

#### `members` Table
- Has `household_id` FK (single household only)
- No distinction between primary and secondary family membership

### Current Issues

1. **Single Household Limitation**: Members can only belong to one household
2. **No Primary/Secondary Distinction**: Cannot model a child living primarily with one parent but also connected to another family
3. **Disconnected Systems**: `family_relationships` and `member_households` don't integrate
4. **Denormalized Data**: `member_names` array in households duplicates member data
5. **Missing UI**: No interface to manage family relationships
6. **Weak RLS**: `family_relationships` policies allow all authenticated users
7. **No Family Head Concept**: Cannot designate household head for mailings

---

## Proposed Architecture

### Design Principles

1. **Members can have ONE primary family** (their main residence/household)
2. **Members can belong to MULTIPLE families** as secondary members
3. **Households are the unit for shared address**
4. **Family relationships exist between individual members** (not tied to households)
5. **Bidirectional relationships** are automatically maintained
6. **Role-based membership** in households (head, spouse, child, dependent, etc.)

### New Database Schema

#### 1. `families` Table (Rename from `member_households`)

```sql
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  name text NOT NULL,                    -- "The Smith Family", "Johnson Household"
  formal_name text,                      -- For formal correspondence

  -- Address (shared by family members)
  address_street text,
  address_street2 text,                  -- Apt, Suite, Unit
  address_city text,
  address_state text,
  address_postal_code text,
  address_country text DEFAULT 'USA',

  -- Church-specific
  family_photo_url text,                 -- Family portrait

  -- Metadata
  notes text,
  tags text[],

  -- Encryption
  encrypted_fields text[],
  encryption_key_version integer,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,

);

CREATE INDEX idx_families_tenant ON families(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_families_name ON families(tenant_id, name) WHERE deleted_at IS NULL;
```

#### 2. `family_members` Table (New Junction Table)

This is the key change - a proper many-to-many relationship between members and families with role information.

```sql
CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Relationships
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Membership Type
  is_primary boolean NOT NULL DEFAULT false,   -- TRUE = primary family, FALSE = secondary
  role text NOT NULL DEFAULT 'member',         -- 'head', 'spouse', 'child', 'dependent', 'other'

  -- Role Details
  role_notes text,                             -- "Stepchild", "Foster child", etc.

  -- Status
  is_active boolean NOT NULL DEFAULT true,     -- For soft-removing from family without deleting
  joined_at date DEFAULT CURRENT_DATE,         -- When they joined this family
  left_at date,                                -- When they left (for historical tracking)

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT family_members_unique UNIQUE (tenant_id, family_id, member_id),
  CONSTRAINT family_members_single_primary CHECK (
    -- Enforced via trigger, not check constraint (see below)
    true
  )
);

CREATE INDEX idx_family_members_family ON family_members(family_id) WHERE is_active = true;
CREATE INDEX idx_family_members_member ON family_members(member_id) WHERE is_active = true;
CREATE INDEX idx_family_members_primary ON family_members(member_id, is_primary) WHERE is_primary = true AND is_active = true;
```

#### 3. Trigger to Enforce Single Primary Family

```sql
-- Ensure each member has at most ONE primary family
CREATE OR REPLACE FUNCTION enforce_single_primary_family()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true AND NEW.is_active = true THEN
    -- Check if member already has a primary family
    IF EXISTS (
      SELECT 1 FROM family_members
      WHERE member_id = NEW.member_id
        AND is_primary = true
        AND is_active = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      -- Option A: Raise error
      -- RAISE EXCEPTION 'Member already has a primary family';

      -- Option B: Auto-demote existing primary (recommended)
      UPDATE family_members
      SET is_primary = false, updated_at = now()
      WHERE member_id = NEW.member_id
        AND is_primary = true
        AND is_active = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER family_members_enforce_primary
  BEFORE INSERT OR UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_family();
```

#### 4. Update `family_relationships` Table

Keep existing structure but add improvements:

```sql
-- Add inverse relationship tracking
ALTER TABLE family_relationships
  ADD COLUMN IF NOT EXISTS inverse_relationship_id uuid REFERENCES family_relationships(id),
  ADD COLUMN IF NOT EXISTS is_auto_created boolean DEFAULT false;

-- Add index for inverse lookups
CREATE INDEX IF NOT EXISTS idx_family_relationships_inverse
  ON family_relationships(inverse_relationship_id);

-- Function to auto-create inverse relationships
CREATE OR REPLACE FUNCTION create_inverse_family_relationship()
RETURNS TRIGGER AS $$
DECLARE
  inverse_category_id uuid;
  inverse_rel_id uuid;
BEGIN
  -- Skip if this is an auto-created inverse relationship
  IF NEW.is_auto_created = true THEN
    RETURN NEW;
  END IF;

  -- Get the inverse relationship category
  SELECT id INTO inverse_category_id
  FROM categories
  WHERE tenant_id = NEW.tenant_id
    AND type = 'relationship_type'
    AND code = (
      CASE (SELECT code FROM categories WHERE id = NEW.relationship_category_id)
        WHEN 'spouse' THEN 'spouse'
        WHEN 'parent' THEN 'child'
        WHEN 'child' THEN 'parent'
        WHEN 'sibling' THEN 'sibling'
        WHEN 'grandparent' THEN 'grandchild'
        WHEN 'grandchild' THEN 'grandparent'
        WHEN 'uncle' THEN 'nephew'
        WHEN 'aunt' THEN 'niece'
        WHEN 'nephew' THEN 'uncle'
        WHEN 'niece' THEN 'aunt'
        WHEN 'cousin' THEN 'cousin'
        WHEN 'guardian' THEN 'dependent'
        WHEN 'dependent' THEN 'guardian'
        ELSE NULL
      END
    );

  -- Create inverse relationship if category found
  IF inverse_category_id IS NOT NULL THEN
    INSERT INTO family_relationships (
      member_id, related_member_id, relationship_category_id,
      tenant_id, is_auto_created, notes
    )
    VALUES (
      NEW.related_member_id, NEW.member_id, inverse_category_id,
      NEW.tenant_id, true, NEW.notes
    )
    RETURNING id INTO inverse_rel_id;

    -- Link them together
    UPDATE family_relationships SET inverse_relationship_id = inverse_rel_id WHERE id = NEW.id;
    UPDATE family_relationships SET inverse_relationship_id = NEW.id WHERE id = inverse_rel_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER family_relationships_auto_inverse
  AFTER INSERT ON family_relationships
  FOR EACH ROW
  EXECUTE FUNCTION create_inverse_family_relationship();
```

#### 5. View for Easy Family Member Queries

```sql
CREATE OR REPLACE VIEW family_members_view AS
SELECT
  fm.id,
  fm.tenant_id,
  fm.family_id,
  fm.member_id,
  fm.is_primary,
  fm.role,
  fm.role_notes,
  fm.is_active,
  fm.joined_at,
  fm.left_at,
  f.name as family_name,
  f.address_street,
  f.address_city,
  f.address_state,
  f.address_postal_code,
  m.first_name,
  m.last_name,
  m.email,
  m.contact_number,
  m.profile_picture_url
FROM family_members fm
JOIN families f ON f.id = fm.family_id
JOIN members m ON m.id = fm.member_id
WHERE fm.is_active = true
  AND f.deleted_at IS NULL
  AND m.deleted_at IS NULL;
```

#### 6. RLS Policies

```sql
-- Families table
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families_tenant_view" ON families
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "families_tenant_manage" ON families
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Family members table
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_tenant_view" ON family_members
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "family_members_tenant_manage" ON family_members
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Fix family_relationships RLS (currently too permissive)
DROP POLICY IF EXISTS "Family relationships are viewable by authenticated users" ON family_relationships;
DROP POLICY IF EXISTS "Family relationships can be managed by authenticated users" ON family_relationships;

CREATE POLICY "family_relationships_tenant_view" ON family_relationships
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "family_relationships_tenant_manage" ON family_relationships
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
```

---

## Data Migration Strategy

### Phase 1: Create New Schema (Non-Breaking)

1. Create `families` table (new name)
2. Create `family_members` junction table
3. Add new columns to `family_relationships`
4. Create views and functions

### Phase 2: Migrate Existing Data

```sql
-- Migrate member_households to families
INSERT INTO families (
  id, tenant_id, name, address_street, address_city, address_state,
  address_postal_code, notes, encrypted_fields,
  encryption_key_version, created_at, updated_at, created_by, updated_by, deleted_at
)
SELECT
  id, tenant_id,
  COALESCE(name, 'Family ' || id::text),
  address_street, address_city, address_state, address_postal_code,
  notes, encrypted_fields, encryption_key_version,
  created_at, updated_at, created_by, updated_by, deleted_at
FROM member_households;

-- Create family_members entries for existing member-household relationships
INSERT INTO family_members (
  tenant_id, family_id, member_id, is_primary, role, is_active, created_at
)
SELECT
  m.tenant_id,
  m.household_id,
  m.id,
  true,  -- All existing relationships become primary
  'member',  -- Default role
  true,
  m.created_at
FROM members m
WHERE m.household_id IS NOT NULL
  AND m.deleted_at IS NULL
ON CONFLICT (tenant_id, family_id, member_id) DO NOTHING;
```

### Phase 3: Update Application Code

1. Update adapters to use new tables
2. Update services to support primary/secondary families
3. Update UI components

### Phase 4: Deprecate Old Schema

1. Remove `members.household_id` column (after full migration)
2. Drop `member_households` table
3. Remove deprecated code paths

---

## Application Layer Changes

### New/Updated Models

#### `Family` Model (replaces `MemberHousehold`)

```typescript
// apps/web/src/models/family.model.ts
export interface Family extends BaseModel {
  name: string;
  formal_name?: string | null;
  address_street?: string | null;
  address_street2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  family_photo_url?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  encrypted_fields?: string[] | null;
  encryption_key_version?: number | null;

  // Computed/joined fields
  members?: FamilyMember[];
  member_count?: number;
  head?: FamilyMember | null;
}
```

#### `FamilyMember` Model (New)

```typescript
// apps/web/src/models/familyMember.model.ts
export type FamilyRole = 'head' | 'spouse' | 'child' | 'dependent' | 'other';

export interface FamilyMember extends BaseModel {
  family_id: string;
  member_id: string;
  is_primary: boolean;
  role: FamilyRole;
  role_notes?: string | null;
  is_active: boolean;
  joined_at?: string | null;
  left_at?: string | null;

  // Joined data
  family?: Family;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    contact_number?: string | null;
    profile_picture_url?: string | null;
  };
}
```

#### Updated `Member` Model

```typescript
// Add to existing Member interface
export interface Member extends BaseModel {
  // ... existing fields ...

  // Replace household_id with computed primary family
  primary_family?: Family | null;
  families?: FamilyMember[];  // All family memberships
}
```

### New Services

#### `FamilyService`

```typescript
// apps/web/src/services/FamilyService.ts
@injectable()
export class FamilyService {
  constructor(
    @inject(TYPES.IFamilyRepository) private familyRepo: IFamilyRepository,
    @inject(TYPES.IFamilyMemberRepository) private familyMemberRepo: IFamilyMemberRepository,
  ) {}

  // Family CRUD
  async createFamily(data: Partial<Family>): Promise<Family>;
  async updateFamily(id: string, data: Partial<Family>): Promise<Family>;
  async deleteFamily(id: string): Promise<void>;
  async getFamilyById(id: string): Promise<Family | null>;
  async getFamiliesByTenant(tenantId: string): Promise<Family[]>;
  async searchFamilies(tenantId: string, query: string): Promise<Family[]>;

  // Family membership management
  async addMemberToFamily(
    familyId: string,
    memberId: string,
    options: { isPrimary?: boolean; role?: FamilyRole; roleNotes?: string }
  ): Promise<FamilyMember>;

  async removeMemberFromFamily(familyId: string, memberId: string): Promise<void>;

  async updateMemberRole(
    familyId: string,
    memberId: string,
    role: FamilyRole,
    roleNotes?: string
  ): Promise<FamilyMember>;

  async setPrimaryFamily(memberId: string, familyId: string): Promise<void>;

  async getMemberFamilies(memberId: string): Promise<FamilyMember[]>;
  async getPrimaryFamily(memberId: string): Promise<Family | null>;
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]>;
  async getFamilyHead(familyId: string): Promise<FamilyMember | null>;

  // Bulk operations
  async createFamilyWithMembers(
    familyData: Partial<Family>,
    members: Array<{ memberId: string; role: FamilyRole; isPrimary?: boolean }>
  ): Promise<Family>;
}
```

#### `FamilyRelationshipService` (Enhanced)

```typescript
// Enhanced apps/web/src/services/FamilyRelationshipService.ts
@injectable()
export class FamilyRelationshipService {
  // ... existing methods ...

  // New methods
  async createRelationshipWithInverse(
    memberId: string,
    relatedMemberId: string,
    relationshipTypeCode: string,
    notes?: string
  ): Promise<FamilyRelationship>;

  async deleteRelationshipWithInverse(relationshipId: string): Promise<void>;

  async getMemberRelationships(memberId: string): Promise<FamilyRelationship[]>;

  async getFamilyTree(memberId: string): Promise<FamilyTreeNode>;
}
```

---

## UI Components

### 1. Family List Page (`/admin/community/families/list`)

**Features:**
- Searchable table of all families
- Columns: Family Name, Address, Member Count, Actions
- Quick actions: View, Edit, Add Member
- Stats hero: Total families, Families with children, New this month

### 2. Family Profile Page (`/admin/community/families/[familyId]`)

**Features:**
- Family header with name, address, photo
- Member list with roles (head badge, spouse badge, etc.)
- Quick add member button
- Edit family details inline
- Family relationships visualization (optional)

### 3. Family Manage Page (`/admin/community/families/manage`)

**Features:**
- Create/edit family form
- Name, formal name, address fields
- Notes
- Member assignment section (add existing members or create new)

### 4. Member Family Tab (in Member Profile/Edit)

**Features:**
- Show primary family with details
- List secondary family memberships
- Button to change primary family
- Button to add to another family
- Family relationship editor

### 5. Family Relationship Manager Component

**Features:**
- Visual display of member's relationships
- Add relationship: Select member, select relationship type
- Remove relationship (with confirmation)
- Edit relationship notes
- Auto-shows inverse relationship

### 6. Family Tree Visualization (Optional Enhancement)

**Features:**
- Visual family tree diagram
- Shows spouse connections, parent-child relationships
- Click to view member profile
- Zoom and pan controls

---

## Implementation Phases

### Phase 1: Database Schema (Migration)

**Tasks:**
1. Create `families` table with new schema
2. Create `family_members` junction table
3. Create triggers for primary family enforcement
4. Create trigger for inverse relationships
5. Update RLS policies for `family_relationships`
6. Create migration to copy data from `member_households`
7. Create migration to populate `family_members` from existing relationships

**Deliverables:**
- New migration file(s)
- Backward-compatible schema (old tables still exist)

### Phase 2: Backend Services

**Tasks:**
1. Create `Family` model
2. Create `FamilyMember` model
3. Create `FamilyAdapter`
4. Create `FamilyMemberAdapter`
5. Create `IFamilyRepository` and implementation
6. Create `IFamilyMemberRepository` and implementation
7. Create `FamilyService`
8. Enhance `FamilyRelationshipService` with inverse relationship support
9. Register in DI container
10. Create API routes for families

**Deliverables:**
- New service layer files
- Updated container bindings
- API routes

### Phase 3: UI - Family Management

**Tasks:**
1. Create families list metadata page
2. Create family profile metadata page
3. Create family manage (create/edit) metadata page
4. Create metadata service handlers
5. Create metadata action handlers
6. Add family management to admin sidebar

**Deliverables:**
- XML metadata pages
- TypeScript service handlers
- Navigation updates

### Phase 4: UI - Member Integration

**Tasks:**
1. Add "Families" tab to member profile page
2. Add family assignment to member edit form
3. Create "Add to Family" modal component
4. Create "Change Primary Family" functionality
5. Update member list to show primary family column

**Deliverables:**
- Updated member metadata pages
- New modal components

### Phase 5: Relationship Management UI

**Tasks:**
1. Create relationship manager component
2. Add to member profile page
3. Add to family profile page
4. Handle inverse relationship display
5. Create add/edit/delete relationship actions

**Deliverables:**
- Relationship manager component
- Integration with existing pages

### Phase 6: Testing & Polish

**Tasks:**
1. Write E2E tests for family management
2. Write E2E tests for family relationships
3. Test data migration on staging
4. Fix any edge cases
5. Performance optimization

**Deliverables:**
- E2E test files
- Bug fixes

### Phase 7: Cleanup

**Tasks:**
1. Remove `members.household_id` column
2. Drop `member_households` table
3. Remove deprecated adapter/repository/service code
4. Update documentation

**Deliverables:**
- Final migration
- Code cleanup

---

## API Endpoints

### Family Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/families` | List all families for tenant |
| GET | `/api/families/:id` | Get family by ID with members |
| POST | `/api/families` | Create new family |
| PUT | `/api/families/:id` | Update family |
| DELETE | `/api/families/:id` | Soft delete family |
| GET | `/api/families/:id/members` | Get family members |
| POST | `/api/families/:id/members` | Add member to family |
| DELETE | `/api/families/:id/members/:memberId` | Remove member from family |
| PUT | `/api/families/:id/members/:memberId` | Update member role in family |

### Member Family Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/members/:id/families` | Get all families for member |
| GET | `/api/members/:id/primary-family` | Get member's primary family |
| PUT | `/api/members/:id/primary-family` | Set member's primary family |
| GET | `/api/members/:id/relationships` | Get member's family relationships |
| POST | `/api/members/:id/relationships` | Add family relationship |
| DELETE | `/api/members/:id/relationships/:relId` | Remove family relationship |

---

## Success Criteria

1. **Data Integrity**: Members can have exactly one primary family and multiple secondary families
2. **Bidirectional Relationships**: Creating a parent-child relationship auto-creates child-parent
3. **Role Management**: Family roles (head, spouse, child) are properly tracked
4. **UI Completeness**: Users can manage families and relationships through the UI
5. **Performance**: Family queries execute in <100ms for typical family sizes
6. **Test Coverage**: E2E tests pass for all family management scenarios
7. **Backward Compatibility**: Existing data is properly migrated without loss

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Create backup, test migration on staging first |
| Performance degradation | Medium | Add proper indexes, use views for common queries |
| UI complexity | Medium | Phase implementation, get feedback early |
| Breaking existing features | High | Keep old schema during transition, feature flag new UI |

---

## Timeline Estimate

- **Phase 1 (Database)**: Foundation work
- **Phase 2 (Backend)**: Service layer implementation
- **Phase 3 (UI - Families)**: Family management pages
- **Phase 4 (UI - Members)**: Member integration
- **Phase 5 (Relationships)**: Relationship UI
- **Phase 6 (Testing)**: QA and fixes
- **Phase 7 (Cleanup)**: Technical debt removal (can be deferred)

---

## Appendix: Relationship Type Mappings

| Relationship | Inverse |
|-------------|---------|
| spouse | spouse |
| parent | child |
| child | parent |
| sibling | sibling |
| grandparent | grandchild |
| grandchild | grandparent |
| uncle | nephew/niece |
| aunt | nephew/niece |
| nephew | uncle/aunt |
| niece | uncle/aunt |
| cousin | cousin |
| guardian | dependent |
| dependent | guardian |

---

## Appendix: Family Role Definitions

| Role | Description | Typical Use |
|------|-------------|-------------|
| `head` | Primary household head | Main contact for mailings |
| `spouse` | Spouse/partner of head | Co-head for communications |
| `child` | Child in the household | Minor or adult child living at home |
| `dependent` | Other dependent | Elderly parent, foster child, etc. |
| `other` | Other relationship | Roommate, boarder, etc. |
