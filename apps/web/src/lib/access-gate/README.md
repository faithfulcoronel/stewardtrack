# Access Gate System

A comprehensive, pattern-based access control system for StewardTrack that provides simple, one-line protection for pages, features, and sections.

## Quick Examples

### Protect a Page (Server Component)

```typescript
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

const gate = Gate.forSurface('admin-panel');

<ProtectedPage gate={gate} userId={userId}>
  <AdminContent />
</ProtectedPage>
```

### Protect an API Route

```typescript
import { Gate } from '@/lib/access-gate';
import { gateProtected } from '@/lib/access-gate/middleware';

export const DELETE = gateProtected(
  Gate.withPermission('members.delete'),
  getUserIdFromRequest
)(async (request) => {
  // Protected logic
});
```

### Protect a UI Section (Client Component)

```typescript
import { ProtectedSection } from '@/components/access-gate';

<ProtectedSection userId={userId} permissions="members.edit">
  <EditButton />
</ProtectedSection>
```

### Protect Server Actions

```typescript
import { Gate } from '@/lib/access-gate';
import { checkGate } from '@/lib/access-gate/middleware';

await checkGate(Gate.withPermission('users.delete'), userId);
```

## Features

- ✅ **Simple API**: One-line protection
- ✅ **Multiple Strategies**: Surface, Permission, License, Role, Custom
- ✅ **Composable**: Combine gates with AND/OR logic
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Server & Client**: Works in both contexts
- ✅ **Integrated**: Uses existing RBAC + Licensing

## Design Patterns

- **Strategy Pattern**: Different access check strategies
- **Chain of Responsibility**: Combining multiple checks
- **Factory Pattern**: Simple gate creation
- **Decorator Pattern**: Adding additional checks

## Documentation

See [ACCESS_GATE_GUIDE.md](../../../ACCESS_GATE_GUIDE.md) for complete documentation and examples.
