import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuditAction = 'create' | 'update' | 'delete' | 'assign_license';

export async function logAuditEvent(
  action: AuditAction,
  entityType: string,
  entityId: string,
  changes: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      performed_by: user?.id ?? null,
    };

    const { error } = await supabase.from('activity_logs').insert([payload]);
    if (error) {
      throw error;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to record audit event', error);
    }
  }
}
