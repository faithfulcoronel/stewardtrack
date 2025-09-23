import { MembersDashboardAdapter } from '@/adapters/membersDashboard.adapter';
import {
  MembersDashboardRepository,
  type DirectoryMember,
} from '@/repositories/membersDashboard.repository';
import { MembersDashboardService } from '@/services/MembersDashboardService';

import type {
  ServiceDataSourceHandler,
  ServiceDataSourceRequest,
} from './types';

type MemberDirectoryRecord = DirectoryMember & {
  id?: string;
  membership_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MembersTableStaticConfig = {
  filters?: unknown;
  actions?: unknown;
  columns?: unknown;
  emptyState?: unknown;
};

const MEMBERS_TABLE_HANDLER_ID = 'admin-community.members.list.membersTable';

function createMembersDashboardService(): MembersDashboardService {
  const adapter = new MembersDashboardAdapter();
  const repository = new MembersDashboardRepository(adapter);
  return new MembersDashboardService(repository);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function cloneBaseConfig(value: unknown): MembersTableStaticConfig {
  if (!isRecord(value)) {
    return {};
  }
  try {
    return structuredClone(value) as MembersTableStaticConfig;
  } catch {
    return { ...value } as MembersTableStaticConfig;
  }
}

function formatStageLabel(code: string | undefined | null): string {
  if (!code) {
    return 'Member';
  }
  return code
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapStageVariant(code: string | undefined | null): string {
  const normalized = (code ?? '').toLowerCase();
  switch (normalized) {
    case 'active':
    case 'regular_attender':
      return 'success';
    case 'visitor':
      return 'info';
    case 'under_discipline':
      return 'warning';
    case 'withdrawn':
    case 'removed':
      return 'critical';
    default:
      return 'neutral';
  }
}

function toMembersTableRow(member: MemberDirectoryRecord) {
  const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ').trim();
  const stageCode = member.membership_stage?.code ?? null;
  const stageLabel = member.membership_stage?.name ?? formatStageLabel(stageCode);
  const centerCode = member.membership_center?.code ?? null;
  const centerLabel = member.membership_center?.name ?? '—';
  const lastInteraction = member.updated_at ?? member.created_at ?? member.membership_date ?? null;

  return {
    id:
      member.id ??
      (member.email ? `member-${member.email}` : `member-${fullName.replace(/\s+/g, '-').toLowerCase()}`),
    name: fullName || member.email || 'Unknown member',
    membershipLabel: stageLabel,
    stage: stageLabel,
    stageKey: stageCode ?? 'unknown',
    stageVariant: mapStageVariant(stageCode),
    center: centerLabel,
    centerKey: centerCode ?? 'unknown',
    household: '—',
    lastEngagement: lastInteraction,
    givingThisYear: 0,
    tags: [] as string[],
    phone: member.contact_number ?? '',
    email: member.email ?? '',
  };
}

async function resolveMembersTable(
  request: ServiceDataSourceRequest
): Promise<MembersTableStaticConfig & { rows: unknown[] }> {
  const base = cloneBaseConfig(request.config.value);
  const limit = toNumber(request.config.limit, 100);
  const service = createMembersDashboardService();
  const directory = await service.getDirectory(undefined, limit);
  const rows = directory.map((member) => toMembersTableRow(member as MemberDirectoryRecord));
  return {
    ...base,
    rows,
  };
}

export const adminCommunityHandlers: Record<string, ServiceDataSourceHandler> = {
  [MEMBERS_TABLE_HANDLER_ID]: resolveMembersTable,
};
