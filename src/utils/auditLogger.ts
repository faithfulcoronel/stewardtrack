/**
 * Audit Logger Utility
 *
 * Provides convenient audit logging functionality
 * Follows architectural pattern: Utility → Service → Repository → Adapter → Supabase
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IActivityLogRepository } from '@/repositories/activityLog.repository';

export async function logAuditEvent(
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  changes: Record<string, unknown>
): Promise<void> {
  try {
    // Get current user via service layer
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    // Use repository layer for proper architectural pattern
    const activityLogRepository = container.get<IActivityLogRepository>(TYPES.IActivityLogRepository);

    await activityLogRepository.createActivityLog({
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      performed_by: authResult.userId ?? null,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to record audit event', error);
    }
  }
}
