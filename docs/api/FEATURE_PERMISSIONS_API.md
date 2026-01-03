# Feature Permissions API

API endpoints for managing feature permissions and role templates in the Licensing Studio.

**Base URL:** `/api/licensing/features`

**Authentication:** All endpoints require super admin privileges.

---

## Endpoints

### 1. List Feature Permissions

Get all permissions for a feature with their role templates.

**Endpoint:** `GET /api/licensing/features/:id/permissions`

**URL Parameters:**
- `id` (string, required) - Feature ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "feature_id": "uuid",
      "permission_code": "members:view",
      "display_name": "View Members",
      "description": "View member information",
      "category": "members",
      "action": "view",
      "is_required": true,
      "display_order": 0,
      "role_templates": [
        {
          "id": "uuid",
          "feature_permission_id": "uuid",
          "role_key": "tenant_admin",
          "is_recommended": true,
          "reason": "Admins need full access",
          "created_at": "2025-12-19T10:00:00Z",
          "updated_at": "2025-12-19T10:00:00Z"
        }
      ],
      "created_at": "2025-12-19T10:00:00Z",
      "updated_at": "2025-12-19T10:00:00Z"
    }
  ]
}
```

---

### 2. Create Permission with Templates

Create a new permission for a feature with optional role templates.

**Endpoint:** `POST /api/licensing/features/:id/permissions`

**URL Parameters:**
- `id` (string, required) - Feature ID

**Request Body:**
```json
{
  "permission": {
    "permission_code": "members:edit",
    "display_name": "Manage Members",
    "description": "Create, update, and delete members",
    "is_required": false,
    "display_order": 1
  },
  "roleTemplates": [
    {
      "role_key": "tenant_admin",
      "is_recommended": true,
      "reason": "Admins need management capabilities"
    },
    {
      "role_key": "staff",
      "is_recommended": true,
      "reason": "Staff may need to manage members"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "permission": {
      "id": "uuid",
      "feature_id": "uuid",
      "permission_code": "members:edit",
      "display_name": "Manage Members",
      "description": "Create, update, and delete members",
      "category": "members",
      "action": "manage",
      "is_required": false,
      "display_order": 1,
      "created_at": "2025-12-19T10:00:00Z",
      "updated_at": "2025-12-19T10:00:00Z"
    },
    "templates": [
      {
        "id": "uuid",
        "feature_permission_id": "uuid",
        "role_key": "tenant_admin",
        "is_recommended": true,
        "reason": "Admins need management capabilities",
        "created_at": "2025-12-19T10:00:00Z",
        "updated_at": "2025-12-19T10:00:00Z"
      }
    ]
  },
  "message": "Permission created successfully"
}
```

**Validation:**
- `permission.permission_code` is required and must match format `{category}:{action}`
- `permission.display_name` is required
- Permission code must be unique within the feature
- Role keys must be lowercase snake_case

---

### 3. Get Single Permission

Get a specific permission with its role templates.

**Endpoint:** `GET /api/licensing/features/permissions/:id`

**URL Parameters:**
- `id` (string, required) - Permission ID

**Response:**
```json
{
  "success": true,
  "data": {
    "permission": {
      "id": "uuid",
      "feature_id": "uuid",
      "permission_code": "members:view",
      "display_name": "View Members",
      "description": "View member information",
      "category": "members",
      "action": "view",
      "is_required": true,
      "display_order": 0,
      "created_at": "2025-12-19T10:00:00Z",
      "updated_at": "2025-12-19T10:00:00Z"
    },
    "templates": [
      {
        "id": "uuid",
        "feature_permission_id": "uuid",
        "role_key": "tenant_admin",
        "is_recommended": true,
        "reason": null,
        "created_at": "2025-12-19T10:00:00Z",
        "updated_at": "2025-12-19T10:00:00Z"
      }
    ]
  }
}
```

---

### 4. Update Permission

Update a feature permission.

**Endpoint:** `PUT /api/licensing/features/permissions/:id`

**URL Parameters:**
- `id` (string, required) - Permission ID

**Request Body:**
```json
{
  "permission_code": "members:view_all",
  "display_name": "View All Members",
  "description": "Updated description",
  "is_required": true,
  "display_order": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "feature_id": "uuid",
    "permission_code": "members:view_all",
    "display_name": "View All Members",
    "description": "Updated description",
    "category": "members",
    "action": "view_all",
    "is_required": true,
    "display_order": 0,
    "created_at": "2025-12-19T10:00:00Z",
    "updated_at": "2025-12-19T10:30:00Z"
  },
  "message": "Permission updated successfully"
}
```

**Note:** Updating `permission_code` validates that the new code is not already in use.

---

### 5. Delete Permission

Delete a feature permission and all its role templates.

**Endpoint:** `DELETE /api/licensing/features/permissions/:id`

**URL Parameters:**
- `id` (string, required) - Permission ID

**Response:**
```json
{
  "success": true,
  "message": "Permission deleted successfully"
}
```

**Note:** Deletes are cascaded - all role templates for this permission are also deleted.

---

### 6. Update Role Templates

Replace all role templates for a permission.

**Endpoint:** `PUT /api/licensing/features/permissions/:id/templates`

**URL Parameters:**
- `id` (string, required) - Permission ID

**Request Body:**
```json
{
  "templates": [
    {
      "role_key": "tenant_admin",
      "is_recommended": true,
      "reason": "Admins need this permission"
    },
    {
      "role_key": "staff",
      "is_recommended": false,
      "reason": "Optional for staff"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "feature_permission_id": "uuid",
      "role_key": "tenant_admin",
      "is_recommended": true,
      "reason": "Admins need this permission",
      "created_at": "2025-12-19T10:00:00Z",
      "updated_at": "2025-12-19T10:00:00Z"
    },
    {
      "id": "uuid",
      "feature_permission_id": "uuid",
      "role_key": "staff",
      "is_recommended": false,
      "reason": "Optional for staff",
      "created_at": "2025-12-19T10:00:00Z",
      "updated_at": "2025-12-19T10:00:00Z"
    }
  ],
  "message": "Role templates updated successfully"
}
```

**Note:** This replaces ALL existing templates. Previous templates are deleted.

---

### 7. Get Permission Suggestions

Get suggested permissions for a feature based on its surface_id.

**Endpoint:** `GET /api/licensing/features/:id/permissions/suggestions`

**URL Parameters:**
- `id` (string, required) - Feature ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "permission_code": "members:view",
      "display_name": "View",
      "description": "View Members Directory information",
      "is_required": true,
      "recommended_roles": ["tenant_admin", "staff", "volunteer"]
    },
    {
      "permission_code": "members:edit",
      "display_name": "Manage",
      "description": "Manage Members Directory (create, update, delete)",
      "is_required": false,
      "recommended_roles": ["tenant_admin", "staff"]
    },
    {
      "permission_code": "members:export",
      "display_name": "Export",
      "description": "Export Members Directory data",
      "is_required": false,
      "recommended_roles": ["tenant_admin"]
    }
  ],
  "message": "Permission suggestions generated successfully"
}
```

**Use Case:** This endpoint helps Product Owners quickly create permissions by suggesting common actions based on the feature's metadata surface.

---

### 8. Validate Feature Configuration

Validate that a feature has proper permission configuration.

**Endpoint:** `GET /api/licensing/features/:id/permissions/validate`

**URL Parameters:**
- `id` (string, required) - Feature ID

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": []
  },
  "message": "Feature configuration is valid"
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "data": {
    "valid": false,
    "errors": [
      "Feature must have at least one permission"
    ],
    "warnings": [
      "Permission 'members:view' has no role templates. Consider adding default role assignments."
    ]
  },
  "message": "Feature configuration has errors"
}
```

**Validation Rules:**
- Feature must have at least one permission
- At least one permission should be marked as `is_required: true`
- Each permission should have role templates assigned

---

## Error Responses

All endpoints may return the following error responses:

### 403 Forbidden
```json
{
  "success": false,
  "error": "Unauthorized. Super admin access required."
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Permission code is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Permission with ID 'uuid' not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create permission"
}
```

---

## Permission Code Format

Permission codes must follow the format: `{category}:{action}`

**Valid Examples:**
- `members:view`
- `finance:manage`
- `events:export`
- `member_profile:update`

**Invalid Examples:**
- `Members:View` (uppercase not allowed)
- `members_view` (missing colon separator)
- `members:` (missing action)
- `:view` (missing category)

**Validation Rules:**
- Must contain exactly one colon (`:`)
- Category and action must start with a lowercase letter
- Only lowercase letters, numbers, and underscores allowed
- Regex: `/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/`

---

## Role Key Format

Role keys must be lowercase snake_case.

**Valid Examples:**
- `tenant_admin`
- `staff`
- `volunteer`
- `custom_role_123`

**Invalid Examples:**
- `TenantAdmin` (uppercase not allowed)
- `tenant-admin` (hyphens not allowed)
- `123_role` (cannot start with number)
- `tenant admin` (spaces not allowed)

**Validation Rules:**
- Must start with a lowercase letter
- Only lowercase letters, numbers, and underscores allowed
- Regex: `/^[a-z][a-z0-9_]*$/`

---

## Common Role Keys

Standard role keys used in the system:

- `tenant_admin` - Full access to tenant resources
- `staff` - Staff-level access
- `volunteer` - Volunteer-level access
- `member` - Basic member access

Tenants can create custom roles, so this list is not exhaustive.

---

## Usage Examples

### Example 1: Create a Feature with Permissions

```javascript
// 1. Create feature (existing API)
const feature = await fetch('/api/licensing/features', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Members Directory',
    description: 'Manage church member information',
    tier: 'professional',
    surface_id: 'admin/members/directory',
    surface_type: 'page',
    module: 'members'
  })
});

// 2. Get permission suggestions
const suggestions = await fetch(`/api/licensing/features/${feature.id}/permissions/suggestions`);

// 3. Create permissions based on suggestions
for (const suggestion of suggestions.data) {
  await fetch(`/api/licensing/features/${feature.id}/permissions`, {
    method: 'POST',
    body: JSON.stringify({
      permission: {
        permission_code: suggestion.permission_code,
        display_name: suggestion.display_name,
        description: suggestion.description,
        is_required: suggestion.is_required
      },
      roleTemplates: suggestion.recommended_roles.map(role => ({
        role_key: role,
        is_recommended: true
      }))
    })
  });
}

// 4. Validate configuration
const validation = await fetch(`/api/licensing/features/${feature.id}/permissions/validate`);
console.log('Valid:', validation.data.valid);
```

### Example 2: Update Permission Templates

```javascript
// Get existing permission
const permission = await fetch('/api/licensing/features/permissions/uuid');

// Update role templates
await fetch(`/api/licensing/features/permissions/${permission.data.permission.id}/templates`, {
  method: 'PUT',
  body: JSON.stringify({
    templates: [
      { role_key: 'tenant_admin', is_recommended: true },
      { role_key: 'staff', is_recommended: true },
      { role_key: 'volunteer', is_recommended: false }
    ]
  })
});
```

---

## Implementation Notes

1. **Atomic Operations:** Creating a permission with templates is atomic - if template creation fails, the permission is rolled back.

2. **Cascading Deletes:** Deleting a permission automatically deletes all its role templates.

3. **Permission Code Uniqueness:** Permission codes must be unique within a feature. You can reuse the same code across different features.

4. **Category/Action Parsing:** The system automatically parses `category` and `action` from `permission_code`. You don't need to provide them separately.

5. **Template Replacement:** The PUT `/templates` endpoint replaces ALL existing templates. Use this when you want to completely redefine role assignments.

6. **Super Admin Only:** All endpoints require super admin privileges. Tenant admins cannot manage feature permissions - they can only customize role assignments for their licensed features (future phase).

---

## Related Documentation

- [FEATURE_CREATION_WITH_SURFACE_PERMISSIONS_IMPLEMENTATION_PLAN.md](../implementation-plans/FEATURE_CREATION_WITH_SURFACE_PERMISSIONS_IMPLEMENTATION_PLAN.md)
- [PHASE_1_COMPLETION_SUMMARY.md](../implementation-plans/PHASE_1_COMPLETION_SUMMARY.md)
- [LICENSING_ARCHITECTURE.md](../architecture/LICENSING_ARCHITECTURE.md)
