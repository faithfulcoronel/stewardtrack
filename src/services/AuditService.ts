import { injectable } from 'inversify';
import { logAuditEvent } from '../utils/auditLogger';

export interface AuditService {
  logAuditEvent(
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    changes: Record<string, any>
  ): Promise<void>;
}

@injectable()
export class SupabaseAuditService implements AuditService {
  async logAuditEvent(
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    changes: Record<string, any>
  ): Promise<void> {
    await logAuditEvent(action as any, entityType as any, entityId, changes);
  }
}
