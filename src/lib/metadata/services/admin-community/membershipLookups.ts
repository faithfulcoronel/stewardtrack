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
import { DiscipleshipPathwayAdapter } from '@/adapters/discipleshipPathway.adapter';
import { DiscipleshipPathwayRepository } from '@/repositories/discipleshipPathway.repository';
import { DiscipleshipPathwayService } from '@/services/DiscipleshipPathwayService';
import type { ServiceDataSourceRequest } from '../types';
import type { RequestContext } from '@/lib/server/context';
import type { BaseAdapter } from '@/adapters/base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import type { MembershipStage } from '@/models/membershipStage.model';
import type { MembershipType } from '@/models/membershipType.model';
import type { MembershipCenter } from '@/models/membershipCenter.model';
import type { DiscipleshipPathway } from '@/models/discipleshipPathway.model';
import type { FormFieldOption } from '@/components/dynamic/admin/types';

export type LookupItem = { id: string; value: string };
export type LookupGroups = Record<string, LookupItem[]>;

type LookupRecord = { id?: string | null; name?: string | null; code?: string | null };

type StageRecord = Pick<MembershipStage, 'id' | 'name' | 'code' | 'sort_order'>;
type TypeRecord = Pick<MembershipType, 'id' | 'name' | 'code' | 'sort_order'>;
type CenterRecord = Pick<MembershipCenter, 'id' | 'name' | 'code' | 'sort_order' | 'is_primary'>;
type PathwayRecord = Pick<DiscipleshipPathway, 'id' | 'name' | 'code' | 'display_order' | 'is_active'>;

export interface LookupServiceInstance<TRecord = unknown> {
  getActive: () => Promise<TRecord[]>;
  create: (data: Partial<TRecord>) => Promise<TRecord>;
}

type LookupServiceFactory = (
  context: RequestContext,
  auditService: SupabaseAuditService,
) => LookupServiceInstance;

interface MembershipLookupDefinition {
  id: string;
  fallbackLabel: string;
  createService: LookupServiceFactory;
  sortRecords?: (records: unknown[]) => unknown[];
}

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

function mapLookupRows<T extends LookupRecord>(rows: T[], fallback: string): LookupItem[] {
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

export function createMembershipLookupRequestContext(tenantId: string, role: string | null): RequestContext {
  const context: RequestContext = {
    tenantId,
  };

  if (role) {
    context.roles = [role];
  }

  return context;
}

export function createMembershipStageService(
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupServiceInstance<StageRecord> {
  const adapter = new MembershipStageAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipStageRepository(adapter);
  return new MembershipStageService(repository) as LookupServiceInstance<StageRecord>;
}

export function createMembershipTypeService(
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupServiceInstance<TypeRecord> {
  const adapter = new MembershipTypeAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipTypeRepository(adapter);
  return new MembershipTypeService(repository) as LookupServiceInstance<TypeRecord>;
}

export function createMembershipCenterService(
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupServiceInstance<CenterRecord> {
  const adapter = new MembershipCenterAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipCenterRepository(adapter);
  return new MembershipCenterService(repository) as LookupServiceInstance<CenterRecord>;
}

export function createDiscipleshipPathwayService(
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupServiceInstance<PathwayRecord> {
  const adapter = new DiscipleshipPathwayAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new DiscipleshipPathwayRepository(adapter);
  return new DiscipleshipPathwayService(repository) as LookupServiceInstance<PathwayRecord>;
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

const membershipLookupDefinitions: Record<string, MembershipLookupDefinition> = {
  'membership.stage': {
    id: 'membership.stage',
    fallbackLabel: 'Member stage',
    createService: createMembershipStageService,
  },
  'membership.type': {
    id: 'membership.type',
    fallbackLabel: 'Membership type',
    createService: createMembershipTypeService,
  },
  'membership.center': {
    id: 'membership.center',
    fallbackLabel: 'Center',
    createService: createMembershipCenterService,
    sortRecords: (records) => sortCenters(records as CenterRecord[]),
  },
  'discipleship_pathway': {
    id: 'discipleship_pathway',
    fallbackLabel: 'Discipleship pathway',
    createService: createDiscipleshipPathwayService,
  },
};

export function resolveMembershipLookupDefinition(
  lookupId: string,
): MembershipLookupDefinition | null {
  return membershipLookupDefinitions[lookupId] ?? null;
}

export function mapMembershipLookupOption(
  record: Record<string, unknown>,
  fallback: string,
): FormFieldOption | null {
  const id = typeof record.id === 'string' ? record.id.trim() : null;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const code = typeof record.code === 'string' ? record.code.trim() : '';

  if (!id && !code) {
    return null;
  }

  const value = id ?? code;
  return {
    value,
    label: name || formatLabel(code || value, fallback),
  };
}

export async function fetchMembershipLookupGroups(
  request: ServiceDataSourceRequest
): Promise<LookupGroups> {
  const tenantId = await tenantUtils.getTenantId();
  if (!tenantId) {
    return {};
  }

  const role = (request.role ?? '').trim() || null;
  const context = createMembershipLookupRequestContext(tenantId, role);
  const auditService = new SupabaseAuditService();
  const entries = Object.values(membershipLookupDefinitions);
  const results: LookupGroups = {};

  await Promise.all(
    entries.map(async (definition) => {
      const service = definition.createService(context, auditService);
      const records = (await service.getActive()) as LookupRecord[];
      const sorted = definition.sortRecords ? definition.sortRecords(records) as LookupRecord[] : records;
      results[definition.id] = mapLookupRows(sorted, definition.fallbackLabel);
    }),
  );

  return results;
}
