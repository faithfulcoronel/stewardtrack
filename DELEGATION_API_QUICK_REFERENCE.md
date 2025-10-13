# Delegation API Quick Reference

## Base URL
All delegation endpoints are under: `/api/rbac/delegation/`

## Authentication
All endpoints require:
- Valid Supabase authentication session
- User must be assigned to a tenant
- User must have delegation permissions

## Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/context` | Get user's delegation context | ✓ |
| GET | `/scopes` | Get manageable scopes (campuses/ministries) | ✓ |
| GET | `/users` | Get users in delegated scope | ✓ |
| GET | `/roles` | Get delegatable roles | ✓ |
| GET | `/stats` | Get delegation statistics | ✓ |
| POST | `/assign-role` | Assign role to user | ✓ |
| POST | `/revoke-role` | Revoke role from user | ✓ |

## Quick Examples

### 1. Check Your Delegation Context
```http
GET /api/rbac/delegation/context
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "abc123",
    "tenant_id": "xyz789",
    "scope": "campus",
    "scope_id": "campus-001",
    "allowed_roles": ["role-1", "role-2"],
    "allowed_bundles": ["bundle-1"]
  }
}
```

### 2. Get Your Scopes
```http
GET /api/rbac/delegation/scopes
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "campus-001",
      "name": "Downtown Campus",
      "type": "campus",
      "user_count": 45,
      "role_count": 8
    }
  ]
}
```

### 3. Get Users You Can Manage
```http
GET /api/rbac/delegation/users
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-123",
      "email": "john@church.org",
      "first_name": "John",
      "last_name": "Doe",
      "delegated_roles": [
        {
          "id": "role-1",
          "name": "Campus Volunteer",
          "scope": "campus"
        }
      ],
      "effective_scope": "campus"
    }
  ]
}
```

### 4. Get Roles You Can Delegate
```http
GET /api/rbac/delegation/roles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "role-1",
      "name": "Campus Volunteer",
      "scope": "campus",
      "is_delegatable": true,
      "description": "Volunteer role for campus activities"
    }
  ]
}
```

### 5. Get Statistics
```http
GET /api/rbac/delegation/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 45,
    "activeUsers": 38,
    "totalRoles": 12,
    "delegatableRoles": 5,
    "scopeCount": 1,
    "recentChanges": 3
  }
}
```

### 6. Assign Role to User
```http
POST /api/rbac/delegation/assign-role
Content-Type: application/json

{
  "user_id": "user-123",
  "role_id": "role-1",
  "scope_id": "campus-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-123",
    "user_id": "user-123",
    "role_id": "role-1",
    "tenant_id": "xyz789",
    "assigned_by": "abc123",
    "assigned_at": "2025-10-14T10:30:00Z",
    "scope_id": "campus-001"
  }
}
```

### 7. Revoke Role from User
```http
POST /api/rbac/delegation/revoke-role
Content-Type: application/json

{
  "user_id": "user-123",
  "role_id": "role-1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "No delegation permissions found"
}
```

or

```json
{
  "success": false,
  "error": "No tenant context available"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "user_id and role_id are required"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Failed to fetch delegation context"
}
```

## Testing with cURL

### Get Context
```bash
curl -X GET https://your-domain.com/api/rbac/delegation/context \
  -H "Cookie: your-session-cookie"
```

### Assign Role
```bash
curl -X POST https://your-domain.com/api/rbac/delegation/assign-role \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "user_id": "user-123",
    "role_id": "role-1"
  }'
```

### Revoke Role
```bash
curl -X POST https://your-domain.com/api/rbac/delegation/revoke-role \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "user_id": "user-123",
    "role_id": "role-1"
  }'
```

## JavaScript/TypeScript Usage

```typescript
// Fetch delegation context
const getContext = async () => {
  const response = await fetch('/api/rbac/delegation/context');
  const result = await response.json();
  return result;
};

// Get users in scope
const getUsers = async () => {
  const response = await fetch('/api/rbac/delegation/users');
  const result = await response.json();
  return result;
};

// Assign role
const assignRole = async (userId: string, roleId: string, scopeId?: string) => {
  const response = await fetch('/api/rbac/delegation/assign-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role_id: roleId, scope_id: scopeId })
  });
  const result = await response.json();
  return result;
};

// Revoke role
const revokeRole = async (userId: string, roleId: string) => {
  const response = await fetch('/api/rbac/delegation/revoke-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role_id: roleId })
  });
  const result = await response.json();
  return result;
};
```

## Common Use Cases

### 1. Campus Leader Managing Volunteers
A campus leader can:
- View all users in their campus
- Assign campus-scoped roles (Volunteer, Leader, etc.)
- Revoke campus-scoped roles
- Cannot assign tenant-wide or system roles

### 2. Ministry Leader Managing Team
A ministry leader can:
- View all users in their ministry
- Assign ministry-scoped roles (Coordinator, Member, etc.)
- Revoke ministry-scoped roles
- Cannot assign campus or tenant-wide roles

### 3. Checking Delegation Rights
Before showing delegation UI:
```typescript
const context = await fetch('/api/rbac/delegation/context').then(r => r.json());

if (!context.success) {
  // User has no delegation rights - hide delegation UI
  return;
}

// Show delegation console
// User can manage: context.data.scope (campus or ministry)
```

## Permissions Required

To use these endpoints, users need:
1. **Delegation Permission Record**: Entry in `delegations` table
2. **Scope Assignment**: Campus or ministry assignment
3. **Allowed Roles**: List of role IDs they can delegate
4. **Active Tenant**: Valid tenant assignment

## Security Notes

- All endpoints verify Supabase authentication
- Tenant context is resolved from authenticated user
- Delegation permissions are validated by service layer
- Scope boundaries are strictly enforced
- Only delegatable roles can be assigned
- Users can only manage users in their scope
