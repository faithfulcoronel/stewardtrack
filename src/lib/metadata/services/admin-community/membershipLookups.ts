import { SupabaseAuditService } from '@/services/AuditService';
import { MembershipStageAdapter } from '@/adapters/membershipStage.adapter';
import { MembershipStageRepository } from '@/repositories/membershipStage.repository';
import { MembershipStageService } from '@/services/MembershipStageService';
import { MembershipTypeAdapter } from '@/adapters/membershipType.adapter';
import { MembershipTypeRepository } from '@/repositories/membershipType.repository';
import { MembershipTypeService } from '@/services/MembershipTypeService';
import { MembershipCenterAdapter } from '@/adapters/membershipCenter.adapter';
import { MembershipCenterRepository } from '@/repositories/membershipCenter.repository';
import { MembershipCenterService } from '@/services/MembershipCenterService';
import type { ServiceDataSourceRequest } from '../types';
import type { RequestContext } from '@/lib/server/context';
import type { BaseAdapter } from '@/adapters/base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import type { MembershipStage } from '@/models/membershipStage.model';
import type { MembershipType } from '@/models/membershipType.model';
import type { MembershipCenter } from '@/models/membershipCenter.model';

export type LookupItem = { id: string; value: string };
export type LookupGroups = Record<string, LookupItem[]>;

type StageRecord = Pick<MembershipStage, 'id' | 'name' | 'code' | 'sort_order'>;
type TypeRecord = Pick<MembershipType, 'id' | 'name' | 'code' | 'sort_order'>;
type CenterRecord = Pick<MembershipCenter, 'id' | 'name' | 'code' | 'sort_order' | 'is_primary'>;

export function formatLabel(value: string | undefined | null, fallback: string): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    return fallback;
  }
  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapLookupRows<T extends { id?: string | null; name?: string | null; code?: string | null }>(
  rows: T[],
  fallback: string
): LookupItem[] {
  const seen = new Set<string>();
  const items: LookupItem[] = [];

  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id.trim() : row.id ? String(row.id) : '';
    if (!id || seen.has(id)) {
      continue;
    }

    const name = (row.name ?? '').trim();
    const code = (row.code ?? '').trim();
    const value = name || formatLabel(code, fallback);

    items.push({ id, value });
    seen.add(id);
  }

  return items;
}

function applyRequestContext(adapter: BaseAdapter<any>, context: RequestContext) {
  (adapter as unknown as { context: RequestContext }).context = context;
}

function createRequestContext(tenantId: string, role: string | null): RequestContext {
  const context: RequestContext = {
    tenantId,
  };

  if (role) {
    context.roles = [role];
  }

  return context;
}

function createMembershipStageService(context: RequestContext, auditService: SupabaseAuditService) {
  const adapter = new MembershipStageAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipStageRepository(adapter);
  return new MembershipStageService(repository);
}

function createMembershipTypeService(context: RequestContext, auditService: SupabaseAuditService) {
  const adapter = new MembershipTypeAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipTypeRepository(adapter);
  return new MembershipTypeService(repository);
}

function createMembershipCenterService(context: RequestContext, auditService: SupabaseAuditService) {
  const adapter = new MembershipCenterAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipCenterRepository(adapter);
  return new MembershipCenterService(repository);
}

function sortCenters(records: CenterRecord[]): CenterRecord[] {
  return records.slice().sort((a, b) => {
    const primaryA = a.is_primary ? 0 : 1;
    const primaryB = b.is_primary ? 0 : 1;
    if (primaryA !== primaryB) {
      return primaryA - primaryB;
    }

    const orderA = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const nameA = (a.name ?? '').toLocaleLowerCase();
    const nameB = (b.name ?? '').toLocaleLowerCase();
    return nameA.localeCompare(nameB);
  });
}

export async function fetchMembershipLookupGroups(
  request: ServiceDataSourceRequest
): Promise<LookupGroups> {
  const tenantId = await tenantUtils.getTenantId();
  if (!tenantId) {
    return {};
  }

  const role = (request.role ?? '').trim() || null;
  const context = createRequestContext(tenantId, role);
  const auditService = new SupabaseAuditService();

  const stageService = createMembershipStageService(context, auditService);
  const typeService = createMembershipTypeService(context, auditService);
  const centerService = createMembershipCenterService(context, auditService);

  const [stageRecords, typeRecords, centerRecords] = await Promise.all([
    stageService.getActive() as Promise<StageRecord[]>,
    typeService.getActive() as Promise<TypeRecord[]>,
    centerService.getActive() as Promise<CenterRecord[]>,
  ]);

  const centers = sortCenters(centerRecords);

  return {
    'membership.stage': mapLookupRows(stageRecords, 'Member stage'),
    'membership.type': mapLookupRows(typeRecords, 'Membership type'),
    'membership.center': mapLookupRows(centers, 'Center'),
  };
}
