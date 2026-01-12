import { formatDistanceToNow } from 'date-fns';

import type { GridColumnConfig } from '@/components/dynamic/admin/AdminDataGridSection';
import { getTenantTimezone, formatDate as formatDateWithTz, formatRelativeTime } from './datetime-utils';

import { MembersDashboardAdapter } from '@/adapters/membersDashboard.adapter';
import {
  MembersDashboardRepository,
  type DirectoryMember,
} from '@/repositories/membersDashboard.repository';
import { MembersDashboardService } from '@/services/MembersDashboardService';
import { MemberProfileAdapter } from '@/adapters/memberProfile.adapter';
import { MemberProfileRepository } from '@/repositories/memberProfile.repository';
import {
  MemberProfileService,
  type HouseholdRelationshipRow,
  type MemberCarePlanRow,
  type MemberGivingProfileRow,
  type MemberMilestoneRow,
  type MemberRow,
  type MemberTimelineEventRow,
} from '@/services/MemberProfileService';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { MemberCarePlanService } from '@/services/MemberCarePlanService';
import type { MemberDiscipleshipPlanService } from '@/services/MemberDiscipleshipPlanService';
import type { MemberCarePlan } from '@/models/memberCarePlan.model';
import type { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import type { FamilyService } from '@/services/FamilyService';
import type { TenantService } from '@/services/TenantService';
import type { FamilyMember } from '@/models/familyMember.model';
import { tenantUtils } from '@/utils/tenantUtils';
import {
  fetchMembershipFilterOptions,
  fetchMembershipLookupGroups,
  formatLabel,
  type LookupGroups,
  type LookupItem,
} from './admin-community/membershipLookups';

import type {
  ServiceDataSourceHandler,
  ServiceDataSourceRequest,
} from './types';
import { adminCommunityHouseholdsHandlers } from './admin-community-households';
import { adminCommunityCarePlansHandlers } from './admin-community-careplans';
import { adminCommunityDashboardHandlers } from './admin-community-dashboard';
import { adminCommunityDiscipleshipHandlers } from './admin-community-discipleship';
import { adminCommunityPlanningHandlers } from './admin-community-planning';
import { adminCommunityFamiliesHandlers } from './admin-community-families';
import { adminCommunityGoalsHandlers } from './admin-community-goals';
import { adminCommunitySchedulerHandlers } from './admin-community-scheduler';
import { adminCommunityAccountsHandlers } from './admin-community-accounts';

type MemberDirectoryRecord = DirectoryMember & {
  id?: string;
  membership_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MemberManageRecord = {
  id?: string;
  fullName?: string;
  photoUrl?: string | null;
  stageId?: string | null;
  stageKey?: string | null;
  membershipTypeId?: string | null;
  membershipTypeKey?: string | null;
  membershipTypeLabel?: string | null;
  center?: string | null;
  centerId?: string | null;
  centerKey?: string | null;
  tags?: string[];
  contact?: {
    email?: string | null;
    phone?: string | null;
    preferred?: string | null;
  };
  giving?: {
    recurring?: {
      amount?: number | null;
      frequency?: string | null;
      method?: string | null;
    } | null;
    pledge?: number | null;
    primaryFund?: string | null;
    tier?: string | null;
    notes?: string | null;
  };
  serving?: {
    team?: string | null;
    role?: string | null;
    schedule?: string | null;
    coach?: string | null;
    nextServeDate?: string | null;
    leadershipRoles?: string[];
    teamFocus?: string | null;
    reportsTo?: string | null;
    lastHuddle?: string | null;
  };
  discipleship?: {
    nextStep?: string | null;
    mentor?: string | null;
    primaryGroup?: string | null;
    additionalGroups?: string[];
    pathways?: string[];
    attendanceRate?: number | null;
    lastAttendance?: string | null;
    spiritualGifts?: string[];
    ministryInterests?: string[];
    prayerFocus?: string | null;
    prayerRequests?: string[];
  };
  carePlan?: {
    status?: string | null;
    statusKey?: string | null;
    assignedTo?: string | null;
    followUpDate?: string | null;
    team?: string[];
    emergencyContact?: {
      name?: string | null;
      relationship?: string | null;
      phone?: string | null;
      physician?: string | null;
    };
    prayerFocus?: string | null;
    prayerRequests?: string[];
  };
  emergency?: {
    contact?: string | null;
    relationship?: string | null;
    phone?: string | null;
    physician?: string | null;
  } | null;
  profile?: {
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    photoUrl?: string | null;
    envelopeNumber?: string | null;
    membershipType?: string | null;
    membershipTypeId?: string | null;
    membershipTypeKey?: string | null;
    stageId?: string | null;
    stageKey?: string | null;
    centerId?: string | null;
    centerKey?: string | null;
    joinDate?: string | null;
    preferredContact?: string | null;
    careStatus?: string | null;
    carePastor?: string | null;
    followUpDate?: string | null;
    servingTeam?: string | null;
    servingRole?: string | null;
    servingSchedule?: string | null;
    discipleshipNextStep?: string | null;
    notes?: string | null;
    tags?: string[] | null;
    preferredName?: string | null;
    birthdate?: string | null;
    maritalStatus?: string | null;
    anniversary?: string | null;
    occupation?: string | null;
    household?: {
      id?: string | null;
      name?: string | null;
      members?: string[];
      address?: HouseholdAddress | null;
    } | null;
  };
  admin?: {
    dataSteward?: string | null;
    lastReview?: string | null;
  };
  household?: {
    id?: string | null;
    name?: string | null;
    members?: string[];
    address?: HouseholdAddress | null;
  } | null;
  // New family system fields
  family?: {
    id?: string | null;
    name?: string | null;
    members?: string[];
    address_street?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_postal_code?: string | null;
  } | null;
  familyId?: string | null;
  familyRole?: string | null;
  isPrimaryFamily?: boolean;
  // Member address fields (separate from family address)
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostal?: string | null;
  addressCountry?: string | null;
};

type FormMembershipStageKey = 'active' | 'new' | 'care' | 'inactive';

type MembersTableStaticConfig = {
  filters?: unknown;
  actions?: unknown;
  columns?: unknown;
  emptyState?: unknown;
};

type HouseholdAddress = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

interface MemberProfileRecord extends MemberDirectoryRecord {
  fullName?: string;
  photoUrl?: string | null;
  preferredName?: string | null;
  stage?: string | null;
  statusVariant?: string | null;
  center?: string | null;
  membershipType?: string | null;
  joinDate?: string | null;
  envelopeNumber?: string | null;
  tags?: string[];
  membershipLabel?: string | null;
  engagement?: {
    groups?: string[];
    pathways?: string[];
    spiritualGifts?: string[];
    interests?: string[];
    prayerFocus?: string | null;
  };
  demographics?: {
    birthdate?: string | null;
    maritalStatus?: string | null;
    anniversary?: string | null;
    occupation?: string | null;
  };
  emergency?: {
    contact?: string | null;
    relationship?: string | null;
    phone?: string | null;
    physician?: string | null;
  } | null;
  contact?: {
    email?: string | null;
    phone?: string | null;
    preferred?: string | null;
  };
  household?: {
    name?: string | null;
    members?: string[];
    address?: HouseholdAddress | null;
  };
  /** Primary family from the new family system */
  family?: {
    id?: string | null;
    name?: string | null;
    role?: string | null;
    isPrimary?: boolean;
    members?: Array<{
      id: string;
      name: string;
      role: string;
      isPrimary: boolean;
    }>;
    address?: HouseholdAddress | null;
  } | null;
  admin?: {
    steward?: string | null;
    lastReview?: string | null;
  };
  serving?: {
    team?: string | null;
    role?: string | null;
    schedule?: string | null;
    coach?: string | null;
  };
  giving?: {
    ytd: number;
    pledge: number;
    campaign?: string | null;
    recurring?: {
      amount?: number | null;
      frequency?: string | null;
      method?: string | null;
      status?: string | null;
    };
    lastGift?: {
      amount?: number | null;
      date?: string | null;
      fund?: string | null;
      source?: string | null;
    };
  };
  discipleship?: {
    smallGroup?: string | null;
    mentor?: string | null;
    milestones?: string[];
    nextStep?: string | null;
  };
  carePlan?: {
    status?: string | null;
    statusVariant?: string | null;
    assignedTo?: string | null;
    details?: string | null;
    followUpDate?: string | null;
    emergencyContact?: {
      name?: string | null;
      relationship?: string | null;
      phone?: string | null;
      physician?: string | null;
    } | null;
    prayerFocus?: string | null;
    prayerRequests?: string | null;
  };
  timeline?: Array<{
    id: string;
    title: string;
    date: string;
    timeAgo: string;
    description?: string | null;
    category?: string | null;
    stage?: string | null;
    icon?: string | null;
  }>;
}

const MEMBERS_TABLE_HANDLER_ID = 'admin-community.members.list.membersTable';
const MEMBERS_LIST_HERO_HANDLER_ID = 'admin-community.members.list.listHero';
const MEMBERS_LIST_SEGMENTS_HANDLER_ID = 'admin-community.members.list.segmentHealth';
const MEMBERS_PROFILE_HANDLER_ID = 'admin-community.members.profile.memberDirectory';
const MEMBERS_MANAGE_HANDLER_ID = 'admin-community.members.manage.membershipRecords';
const MEMBERS_LOOKUPS_HANDLER_ID = 'admin-community.members.manage.lookups';

function createMembersDashboardService(): MembersDashboardService {
  console.log('[admin-community] Creating MembersDashboardService with ENCRYPTED adapter');

  // Get encryption service from DI container (properly initialized with all dependencies)
  const encryptionService = container.get<EncryptionService>(TYPES.EncryptionService);

  // Use EncryptedMembersDashboardAdapter to decrypt PII after fetching
  const adapter = new MembersDashboardAdapter(encryptionService);
  console.log('[admin-community] EncryptedMembersDashboardAdapter instantiated:', adapter.constructor.name);

  const repository = new MembersDashboardRepository(adapter);
  return new MembersDashboardService(repository);
}

function createMemberProfileService(): MemberProfileService {
  console.log('[admin-community] Creating MemberProfileService with ENCRYPTED adapter');

  // Get encryption service from DI container (properly initialized with all dependencies)
  const encryptionService = container.get<EncryptionService>(TYPES.EncryptionService);

  // Use EncryptedMemberProfileAdapter to decrypt PII after fetching
  const adapter = new MemberProfileAdapter(encryptionService);
  console.log('[admin-community] EncryptedMemberProfileAdapter instantiated:', adapter.constructor.name);

  const repository = new MemberProfileRepository(adapter);
  return new MemberProfileService(repository);
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

function mapMembershipType(code: string | undefined | null): string {
  const normalized = (code ?? '').toLowerCase();
  switch (normalized) {
    case 'new':
    case 'visitor':
    case 'guest':
    case 'prospect':
    case 'inactive':
      return 'Attender';
    case 'care':
    case 'shepherding':
    case 'partner_in_process':
    case 'assimilation':
    case 'engaged':
      return 'Partner in process';
    case 'member':
    case 'covenant':
    case 'covenant_member':
    case 'regular_attender':
    case 'active':
    default:
      return 'Covenant member';
  }
}

function normalizeCode(value: string | undefined | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STAGE_KEY_MAPPINGS: Array<{ target: FormMembershipStageKey; patterns: RegExp[] }> = [
  {
    target: 'inactive',
    patterns: [/inactive/, /withdrawn/, /removed/, /suspend/, /former/, /lapsed/],
  },
  {
    target: 'care',
    patterns: [/care/, /shepherd/, /pastoral/, /follow\s*up/, /support/, /process/, /assimilation/, /engaged/],
  },
  {
    target: 'active',
    patterns: [/active/, /member/, /covenant/, /regular/, /partner/, /connected/, /core/],
  },
  {
    target: 'new',
    patterns: [/new/, /visitor/, /guest/, /prospect/, /attender/, /first/],
  },
];

function mapStageKeyForForm(code: string | undefined | null): FormMembershipStageKey {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return 'new';
  }
  for (const mapping of STAGE_KEY_MAPPINGS) {
    if (mapping.patterns.some((pattern) => pattern.test(normalized))) {
      return mapping.target;
    }
  }
  return 'new';
}

const CENTER_TOKEN_SYNONYMS: Record<string, string[]> = {
  downtown: ['downtown', 'dt', 'central', 'city'],
  northside: ['northside', 'north', 'uptown'],
  southridge: ['southridge', 'south', 'ridge'],
  online: ['online', 'digital', 'broadcast', 'virtual'],
};

function normalizeCenterTokens(value: string | undefined | null): string[] {
  if (!value) {
    return [];
  }
  const normalized = value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/(center|campus|location|site|venue|gathering|service)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return [];
  }
  return normalized.split(' ').filter(Boolean);
}

function mapCenterKeyForForm(
  code: string | undefined | null,
  name: string | undefined | null
): string | null {
  const candidates: Array<string | undefined | null> = [code, name];
  for (const candidate of candidates) {
    const tokens = normalizeCenterTokens(candidate);
    if (!tokens.length) {
      continue;
    }
    for (const [key, synonyms] of Object.entries(CENTER_TOKEN_SYNONYMS)) {
      if (tokens.some((token) => synonyms.includes(token))) {
        return key;
      }
    }
  }
  return null;
}

function cloneMemberRecords(value: unknown): MemberProfileRecord[] {
  if (!isRecord(value)) {
    return [];
  }
  const records = (value as { records?: unknown }).records;
  if (!Array.isArray(records)) {
    return [];
  }
  try {
    return structuredClone(records) as MemberProfileRecord[];
  } catch {
    return [...records] as MemberProfileRecord[];
  }
}

function cloneManageRecords(value: unknown): MemberManageRecord[] {
  if (!isRecord(value)) {
    return [];
  }
  const records = (value as { records?: unknown }).records;
  if (!Array.isArray(records)) {
    return [];
  }
  try {
    return structuredClone(records) as MemberManageRecord[];
  } catch {
    return [...records] as MemberManageRecord[];
  }
}

function cloneLookupGroups(value: unknown): LookupGroups {
  if (!isRecord(value)) {
    return {};
  }
  const groups = (value as { lookups?: unknown }).lookups;
  if (!isRecord(groups)) {
    return {};
  }
  const result: LookupGroups = {};
  for (const [key, raw] of Object.entries(groups)) {
    if (!Array.isArray(raw)) {
      continue;
    }
    const items: LookupItem[] = [];
    for (const entry of raw) {
      if (!isRecord(entry)) {
        continue;
      }
      const idValue = entry.id;
      const labelValue = entry.value;
      const id = typeof idValue === 'number' ? String(idValue) : typeof idValue === 'string' ? idValue.trim() : '';
      const label =
        typeof labelValue === 'number'
          ? String(labelValue)
          : typeof labelValue === 'string'
            ? labelValue.trim()
            : '';
      if (!id || !label) {
        continue;
      }
      items.push({ id, value: label });
    }
    if (items.length) {
      result[key] = items;
    }
  }
  return result;
}

function firstParam(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : null;
  }
  return null;
}

function filterNonEmpty(values: Array<string | null | undefined>): string[] {
  return values
    .map((value) => (value ?? '').trim())
    .filter((value): value is string => Boolean(value));
}

function formatFullName(first?: string | null, last?: string | null): string {
  return filterNonEmpty([first, last]).join(' ');
}

function mapPreferredContactMethod(method: string | undefined | null): string {
  switch ((method ?? '').toLowerCase()) {
    case 'phone':
      return 'Phone';
    case 'text':
      return 'Text';
    case 'mail':
      return 'Mail';
    case 'email':
    default:
      return 'Email';
  }
}

function mapCareStatusVariant(code: string | undefined | null): string {
  const normalized = (code ?? '').toLowerCase();
  switch (normalized) {
    case 'urgent':
    case 'crisis':
    case 'escalated':
      return 'critical';
    case 'monitoring':
    case 'follow_up':
    case 'followup':
      return 'warning';
    case 'active':
    case 'support':
    case 'shepherding':
      return 'info';
    case 'resolved':
    case 'closed':
      return 'success';
    default:
      return 'neutral';
  }
}

function formatHouseholdName(member: MemberRow): string {
  const explicitName = (member.household?.name ?? '').trim();
  if (explicitName) {
    return explicitName;
  }
  const base = filterNonEmpty([member.last_name, member.preferred_name, member.first_name])[0];
  if (!base) {
    return 'Household';
  }
  const cleaned = base.replace(/\s+family$/i, '').trim();
  return `${cleaned || base} Family`;
}

function parseAddress(value: unknown): HouseholdAddress | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const street = (record.street ?? record.line1 ?? record.address1 ?? record.address ?? null) as
      | string
      | null;
    const city = (record.city ?? null) as string | null;
    const state = (record.state ?? record.province ?? record.region ?? null) as string | null;
    const postalCode = (record.postalCode ?? record.postal_code ?? record.zip ?? record.zipCode ?? null) as
      | string
      | null;
    if (street || city || state || postalCode) {
      return {
        street: street ?? null,
        city: city ?? null,
        state: state ?? null,
        postalCode: postalCode ?? null,
      };
    }
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parseAddress(parsed);
      }
    } catch {
      // value is not JSON encoded
    }
    const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const streetLine = lines[0] ?? raw;
    const cityStateLine = lines[1] ?? '';
    let city: string | null = null;
    let state: string | null = null;
    let postalCode: string | null = null;
    if (cityStateLine) {
      const [cityPart, statePostalPart] = cityStateLine.split(',').map((part) => part.trim());
      city = cityPart || null;
      const tokens = (statePostalPart ?? '')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
      if (tokens.length > 0) {
        state = tokens.shift() ?? null;
        postalCode = tokens.length > 0 ? tokens.join(' ') : null;
      }
    }
    return {
      street: streetLine || null,
      city,
      state,
      postalCode,
    };
  }
  return null;
}

function ensureUnique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function formatIsoDate(value: string | null | undefined, timezone?: string): string | null {
  if (!value) {
    return null;
  }
  try {
    const date = new Date(value);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    if (timezone) {
      options.timeZone = timezone;
    }
    // Format as YYYY-MM-DD
    const formatted = new Intl.DateTimeFormat('en-CA', options).format(date);
    return formatted;
  } catch {
    return value;
  }
}

function formatMonthDay(value: string | null | undefined, timezone?: string): string {
  if (!value) {
    return '';
  }
  try {
    const date = new Date(value);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    if (timezone) {
      options.timeZone = timezone;
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return '';
  }
}

function formatRelative(value: string | null | undefined, timezone?: string): string {
  if (!value) {
    return '';
  }
  try {
    // For relative time, we can use our datetime-utils helper if timezone is provided
    if (timezone) {
      return formatRelativeTime(new Date(value), timezone);
    }
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
}

function formatYearLabel(value: string | null | undefined, timezone?: string): string | null {
  if (!value) {
    return null;
  }
  try {
    const date = new Date(value);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
    };
    if (timezone) {
      options.timeZone = timezone;
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return null;
  }
}

function mapMilestones(rows: MemberMilestoneRow[]): string[] {
  return rows
    .map((item) => {
      const label = (item.name ?? '').trim();
      if (!label) {
        return null;
      }
      const year = formatYearLabel(item.milestone_date ?? null);
      return year ? `${label} ${year}` : label;
    })
    .filter((value): value is string => Boolean(value));
}

function toMembershipManageRecord(member: MemberRow): MemberManageRecord {
  const stageId = member.membership_stage?.id ?? null;
  const stageCode = member.membership_stage?.code ?? null;
  const stageKey = mapStageKeyForForm(stageCode);
  const membershipTypeId = member.membership_type?.id ?? null;
  const membershipTypeCode = member.membership_type?.code ?? null;
  const membershipTypeLabel = (member.membership_type?.name ?? '').trim() ||
    mapMembershipType(membershipTypeCode ?? stageCode ?? stageKey);
  const centerId = member.membership_center?.id ?? null;
  const centerLabel = member.membership_center?.name ?? null;
  const centerKey = mapCenterKeyForForm(member.membership_center?.code, member.membership_center?.name);
  const fullName = formatFullName(member.first_name ?? null, member.last_name ?? null);
  const preferredName = (member.preferred_name ?? '').trim();
  const recordName = fullName || preferredName || member.email || 'Member';
  const preferredContact = mapPreferredContactMethod(member.preferred_contact_method ?? null);
  const groupTags = Array.isArray(member.small_groups)
    ? member.small_groups
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value))
    : [];
  const memberTags = Array.isArray(member.tags)
    ? member.tags
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value))
    : [];
  const discipleshipGroup = (member.discipleship_group ?? '').trim();
  const primaryGroup = (member.primary_small_group ?? '').trim() || discipleshipGroup || null;
  const additionalGroups = ensureUnique(
    groupTags.filter((group) => !primaryGroup || group.toLowerCase() !== primaryGroup.toLowerCase())
  );
  const pathways = Array.isArray(member.discipleship_pathways)
    ? ensureUnique(
        member.discipleship_pathways
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const spiritualGifts = Array.isArray(member.spiritual_gifts)
    ? ensureUnique(
        member.spiritual_gifts
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const ministryInterests = Array.isArray(member.ministry_interests)
    ? ensureUnique(
        member.ministry_interests
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const prayerRequestsList = Array.isArray(member.prayer_requests)
    ? ensureUnique(
        member.prayer_requests
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const leadershipRoles = Array.isArray(member.leadership_roles)
    ? ensureUnique(
        member.leadership_roles
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const tags = ensureUnique([
    ...memberTags,
    ...groupTags,
    ...(discipleshipGroup ? [discipleshipGroup] : []),
  ]);
  const joinDate = formatIsoDate(member.membership_date ?? null);
  const hasRecurringGiving =
    member.giving_recurring_amount !== null && member.giving_recurring_amount !== undefined
      ? true
      : Boolean(
          (member.giving_recurring_frequency ?? '').trim() ||
            (member.giving_recurring_method ?? '').trim()
        );
  const notes = (member.pastoral_notes ?? '').trim();
  const photoUrl = member.profile_picture_url ?? null;
  const birthDate = formatIsoDate(member.birthday ?? null);
  const anniversary = formatIsoDate(member.anniversary ?? null);
  const nextServeDate = formatIsoDate(member.next_serve_at ?? null);
  const lastHuddle = formatIsoDate(member.last_huddle_at ?? null);
  const lastAttendance = formatIsoDate(member.last_attendance_date ?? null);
  const lastReview = formatIsoDate(member.last_review_at ?? null);
  const householdRecord = member.household ?? null;
  const householdMemberNames = Array.isArray(householdRecord?.member_names)
    ? householdRecord!.member_names!
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value))
    : [];
  const householdMembers = ensureUnique(householdMemberNames);
  const fallbackAddress = parseAddress(member.address ?? null);
  const householdAddress = householdRecord
    ? {
        street: householdRecord.address_street ?? fallbackAddress?.street ?? null,
        city: householdRecord.address_city ?? fallbackAddress?.city ?? null,
        state: householdRecord.address_state ?? fallbackAddress?.state ?? null,
        postalCode: householdRecord.address_postal_code ?? fallbackAddress?.postalCode ?? null,
      }
    : fallbackAddress;
  const householdName = (householdRecord?.name ?? '').trim() || formatHouseholdName(member);
  const envelopeNumber = member.envelope_number ?? null;
  const occupation = (member.occupation ?? '').trim() || null;
  const householdDetails: NonNullable<MemberManageRecord["household"]> = {
    id: member.household_id ?? null,
    name: householdName,
    members: householdMembers,
    address: householdAddress ?? null,
  };

  const emergencyContact = {
    name: member.emergency_contact_name ?? null,
    relationship: member.emergency_contact_relationship ?? null,
    phone: member.emergency_contact_phone ?? null,
    physician: member.physician_name ?? null,
  };

  const hasEmergencyContact =
    (emergencyContact.name ?? '').toString().trim().length > 0 ||
    (emergencyContact.relationship ?? '').toString().trim().length > 0 ||
    (emergencyContact.phone ?? '').toString().trim().length > 0 ||
    (emergencyContact.physician ?? '').toString().trim().length > 0;

  return {
    id: member.id,
    fullName: recordName,
    photoUrl,
    stageId,
    stageKey,
    membershipTypeId,
    membershipTypeKey: membershipTypeCode ?? null,
    membershipTypeLabel,
    center: centerLabel,
    centerId,
    centerKey,
    tags,
    contact: {
      email: member.email ?? null,
      phone: member.contact_number ?? null,
      preferred: preferredContact,
    },
    giving: {
      recurring: hasRecurringGiving
        ? {
            amount: member.giving_recurring_amount ?? null,
            frequency: member.giving_recurring_frequency ?? null,
            method: member.giving_recurring_method ?? null,
          }
        : null,
      pledge: member.giving_pledge_amount ?? null,
      primaryFund: member.giving_primary_fund ?? null,
      tier: member.giving_tier ?? null,
      notes: member.finance_notes ?? null,
    },
    serving: {
      team: member.serving_team ?? null,
      role: member.serving_role ?? null,
      schedule: member.serving_schedule ?? null,
      coach: member.serving_coach ?? null,
      nextServeDate: nextServeDate ?? '',
      leadershipRoles,
      teamFocus: member.team_focus ?? null,
      reportsTo: member.reports_to ?? null,
      lastHuddle: lastHuddle ?? '',
    },
    discipleship: {
      nextStep: member.discipleship_next_step ?? null,
      mentor: member.discipleship_mentor ?? null,
      primaryGroup,
      additionalGroups,
      pathways,
      attendanceRate: member.attendance_rate ?? null,
      lastAttendance: lastAttendance ?? '',
      spiritualGifts,
      ministryInterests,
      prayerFocus: member.prayer_focus ?? null,
      prayerRequests: prayerRequestsList,
    },
    carePlan: {
      emergencyContact,
      prayerFocus: member.prayer_focus ?? null,
      prayerRequests: prayerRequestsList,
    },
    emergency: hasEmergencyContact
      ? {
          contact: emergencyContact.name ?? null,
          relationship: emergencyContact.relationship ?? null,
          phone: emergencyContact.phone ?? null,
          physician: emergencyContact.physician ?? null,
        }
      : null,
    profile: {
      fullName: recordName,
      firstName: member.first_name ?? '',
      lastName: member.last_name ?? '',
      photoUrl,
      envelopeNumber,
      membershipType: membershipTypeLabel,
      membershipTypeId,
      membershipTypeKey: membershipTypeCode ?? null,
      stageId,
      stageKey,
      centerId,
      centerKey: centerKey ?? null,
      joinDate: joinDate ?? '',
      preferredContact,
      servingTeam: member.serving_team ?? '',
      servingRole: member.serving_role ?? '',
      servingSchedule: member.serving_schedule ?? '',
      discipleshipNextStep: member.discipleship_next_step ?? '',
      notes,
      tags,
      preferredName: preferredName || null,
      birthdate: birthDate ?? '',
      maritalStatus: member.marital_status ?? null,
      anniversary: anniversary ?? '',
      occupation,
      household: householdDetails,
    },
    admin: {
      dataSteward: member.data_steward ?? null,
      lastReview: lastReview ?? '',
    },
    household: householdDetails,
    // Member address fields (from split columns)
    addressStreet: member.address_street ?? null,
    addressCity: member.address_city ?? null,
    addressState: member.address_state ?? null,
    addressPostal: member.address_postal_code ?? null,
    addressCountry: member.address_country ?? 'Philippines',
  } satisfies MemberManageRecord;
}

function formatFullDate(value: string | null | undefined, timezone?: string): string | null {
  if (!value) {
    return null;
  }
  try {
    const date = new Date(value);
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    if (timezone) {
      options.timeZone = timezone;
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return null;
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
    firstName: member.first_name ?? '',
    lastName: member.last_name ?? '',
    avatarUrl: member.profile_picture_url ?? null,
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

/**
 * Resolve the list hero section with real metrics from the database
 */
async function resolveMembersListHero(
  _request: ServiceDataSourceRequest
): Promise<{
  eyebrow: string;
  headline: string;
  description: string;
  metrics: Array<{ label: string; value: string; caption: string }>;
}> {
  const service = createMembersDashboardService();
  const metrics = await service.getMetrics();

  // Format numbers with commas
  const formatNumber = (num: number) => num.toLocaleString();

  return {
    eyebrow: 'Membership operations',
    headline: 'A unified directory for discipleship, finances, and care',
    description: 'Filter members by center, stage, and giving rhythm. Launch pastoral follow-ups or finance workflows from one table.',
    metrics: [
      {
        label: 'Total members',
        value: formatNumber(metrics.totalMembers),
        caption: 'Active records in your directory.',
      },
      {
        label: 'New this month',
        value: formatNumber(metrics.newMembers),
        caption: 'Recently added to the community.',
      },
      {
        label: 'Visitors',
        value: formatNumber(metrics.visitorCount),
        caption: 'First-time guests and visitors.',
      },
    ],
  };
}

/**
 * Resolve the segment health cards with real data from the database
 */
async function resolveMembersListSegments(
  _request: ServiceDataSourceRequest
): Promise<{
  items: Array<{
    id: string;
    label: string;
    value: string;
    change?: string;
    changeLabel?: string;
    trend: 'up' | 'down' | 'flat';
    tone: 'positive' | 'neutral' | 'informative' | 'warning';
    description: string;
  }>;
}> {
  const service = createMembersDashboardService();
  const metrics = await service.getMetrics();

  return {
    items: [
      {
        id: 'segment-visitors',
        label: 'Visitors to follow up',
        value: String(metrics.visitorCount),
        trend: 'flat',
        tone: 'informative',
        description: 'First-time guests awaiting welcome outreach.',
      },
      {
        id: 'segment-new',
        label: 'New members this month',
        value: String(metrics.newMembers),
        trend: metrics.newMembers > 0 ? 'up' : 'flat',
        tone: metrics.newMembers > 0 ? 'positive' : 'neutral',
        description: 'Recently joined and in assimilation pipeline.',
      },
      {
        id: 'segment-households',
        label: 'Households',
        value: String(metrics.familyCount),
        trend: 'flat',
        tone: 'neutral',
        description: 'Family units connected to the community.',
      },
    ],
  };
}

async function resolveMembersTable(
  request: ServiceDataSourceRequest
): Promise<MembersTableStaticConfig & { rows: unknown[] }> {
  const base = cloneBaseConfig(request.config.value);
  enhanceMembersTableColumns(base);
  const limit = toNumber(request.config.limit, 100);
  const service = createMembersDashboardService();
  const directory = await service.getDirectory(undefined, limit);
  const rows = directory.map((member) => toMembersTableRow(member as MemberDirectoryRecord));

  // Fetch membership stages and centers from database for dynamic filter options
  // Uses code as the value for client-side filtering (matches row.stageKey and row.centerKey)
  const { stages, centers } = await fetchMembershipFilterOptions(request);

  // Build stage filter options from database
  if (stages.length > 0) {
    const stageOptions = [
      { label: 'All stages', value: 'all' },
      ...stages,
    ];
    updateFilterOptions(base, 'stage', stageOptions);
  }

  // Build center filter options from database
  if (centers.length > 0) {
    const centerOptions = [
      { label: 'All centers', value: 'all' },
      ...centers,
    ];
    updateFilterOptions(base, 'center', centerOptions);
  }

  return {
    ...base,
    rows,
  };
}

/**
 * Update filter options for a specific filter by ID
 */
function updateFilterOptions(
  config: MembersTableStaticConfig,
  filterId: string,
  options: Array<{ label: string; value: string }>
) {
  const filters = config.filters as unknown[];
  if (!Array.isArray(filters)) {
    return;
  }

  for (const filter of filters) {
    if (isRecord(filter) && filter.id === filterId) {
      filter.options = options;
      break;
    }
  }
}

function enhanceMembersTableColumns(config: MembersTableStaticConfig) {
  const columns = extractColumns(config.columns);
  if (!columns) {
    return;
  }
  for (const column of columns) {
    if (column.field === 'name') {
      column.avatarField = 'avatarUrl';
      column.avatarFirstNameField = 'firstName';
      column.avatarLastNameField = 'lastName';
      break;
    }
  }
}

function extractColumns(
  source: unknown
): Array<GridColumnConfig & Record<string, unknown>> | null {
  if (Array.isArray(source)) {
    return source.filter(isGridColumnConfig);
  }
  if (isRecord(source) && Array.isArray(source.items)) {
    return source.items.filter(isGridColumnConfig);
  }
  return null;
}

function isGridColumnConfig(value: unknown): value is GridColumnConfig & Record<string, unknown> {
  return isRecord(value) && typeof value.field === 'string';
}

async function fetchHouseholdMembers(
  service: MemberProfileService,
  member: MemberRow
): Promise<string[]> {
  const relationships: HouseholdRelationshipRow[] = await service.getHouseholdRelationships(member.id);
  const names = new Set<string>();
  const primary =
    formatFullName(member.first_name ?? null, member.last_name ?? null) ||
    (member.preferred_name ?? '').trim();
  if (primary) {
    names.add(primary);
  }

  if (Array.isArray(member.household?.member_names)) {
    for (const entry of member.household.member_names) {
      const trimmed = typeof entry === 'string' ? entry.trim() : '';
      if (trimmed) {
        names.add(trimmed);
      }
    }
  }

  for (const relation of relationships) {
    const counterpart = relation.member_id === member.id ? relation.related_member : relation.member;
    if (counterpart) {
      const counterpartName =
        formatFullName(counterpart.first_name ?? null, counterpart.last_name ?? null) ||
        (counterpart.preferred_name ?? '').trim();
      if (counterpartName) {
        names.add(counterpartName);
      }
    }
  }

  return Array.from(names);
}

async function fetchGivingProfile(
  service: MemberProfileService,
  memberId: string
): Promise<MemberGivingProfileRow | null> {
  return service.getGivingProfile(memberId);
}

async function fetchCarePlan(
  service: MemberProfileService,
  memberId: string
): Promise<MemberCarePlanRow | null> {
  return service.getCarePlan(memberId);
}

async function fetchTimelineEvents(
  service: MemberProfileService,
  memberId: string,
  limit = 10
): Promise<MemberTimelineEventRow[]> {
  return service.getTimelineEvents(memberId, limit);
}

async function fetchMilestones(
  service: MemberProfileService,
  memberId: string
): Promise<MemberMilestoneRow[]> {
  return service.getMilestones(memberId);
}

function buildGiving(profile: MemberGivingProfileRow | null, member: MemberRow) {
  return {
    ytd: profile?.ytd_amount ?? 0,
    pledge: profile?.pledge_amount ?? member.giving_pledge_amount ?? 0,
    campaign: profile?.pledge_campaign ?? member.giving_pledge_campaign ?? null,
    recurring: {
      amount: profile?.recurring_amount ?? member.giving_recurring_amount ?? null,
      frequency: profile?.recurring_frequency ?? member.giving_recurring_frequency ?? null,
      method: profile?.recurring_method ?? member.giving_recurring_method ?? null,
      status: profile?.recurring_status ?? null,
    },
    lastGift: {
      amount: profile?.last_gift_amount ?? member.giving_last_gift_amount ?? null,
      date: formatIsoDate(profile?.last_gift_at ?? member.giving_last_gift_at ?? null),
      fund: profile?.last_gift_fund ?? member.giving_last_gift_fund ?? null,
      source: profile?.last_gift_source ?? null,
    },
  } satisfies MemberProfileRecord['giving'];
}

function buildCarePlan(carePlan: MemberCarePlanRow | null, member: MemberRow, timezone?: string) {
  const statusCode = carePlan?.status_code ?? null;
  const statusLabel = carePlan?.status_label ?? formatLabel(statusCode, 'Healthy');
  const followUp = carePlan?.follow_up_at ?? null;
  const followUpText = formatFullDate(followUp, timezone);
  const details = (carePlan?.details ?? '').trim();
  const appended = followUpText
    ? `${details ? `${details} ` : ''}Next follow-up ${followUpText}`.trim()
    : details;
  const emergencyName = (member.emergency_contact_name ?? '').trim();
  const emergencyRelationship = (member.emergency_contact_relationship ?? '').trim();
  const emergencyPhone = (member.emergency_contact_phone ?? '').trim();
  const emergencyPhysician = (member.physician_name ?? '').trim();
  const emergencyContact =
    emergencyName || emergencyRelationship || emergencyPhone || emergencyPhysician
      ? {
          name: emergencyName || null,
          relationship: emergencyRelationship || null,
          phone: emergencyPhone || null,
          physician: emergencyPhysician || null,
        }
      : null;
  return {
    status: statusLabel,
    statusVariant: mapCareStatusVariant(statusCode),
    assignedTo: carePlan?.assigned_to ?? null,
    details: appended || 'No active care tasks.',
    followUpDate: followUpText,
    emergencyContact,
  } satisfies MemberProfileRecord['carePlan'];
}

/**
 * Build a merged timeline combining timeline events, care plans, and discipleship plans
 * Similar to how the dashboard's resolveDashboardCareTimeline works
 */
function buildMemberTimeline(
  timelineEvents: MemberTimelineEventRow[],
  carePlans: MemberCarePlan[],
  discipleshipPlans: MemberDiscipleshipPlan[],
  limit: number,
  timezone?: string
): Array<{
  id: string;
  title: string;
  date: string;
  timeAgo: string;
  description: string | null;
  category: string | null;
  stage: string | null;
  icon: string | null;
}> {
  // Convert timeline events to unified format with sortDate
  const eventItems = timelineEvents.map((event) => ({
    id: event.id,
    title: event.title,
    date: formatMonthDay(event.occurred_at ?? null, timezone),
    timeAgo: formatRelative(event.occurred_at ?? null, timezone),
    description: event.description ?? null,
    category: event.event_category ?? null,
    stage: event.status ?? null,
    icon: event.icon ?? null,
    sortDate: event.occurred_at ? new Date(event.occurred_at).getTime() : 0,
  }));

  // Convert care plans to timeline items
  const carePlanItems = (carePlans || []).map((plan, index) => {
    const dateField = plan.created_at || plan.follow_up_at;
    const isUrgent = plan.priority === 'urgent';
    const statusLabel = plan.is_active ? 'Active' : 'Completed';

    return {
      id: plan.id || `care-${index}`,
      title: plan.status_label || 'Care plan',
      date: formatMonthDay(dateField ?? null, timezone),
      timeAgo: formatRelative(dateField ?? null, timezone),
      description: plan.details || `Care follow-up ${statusLabel.toLowerCase()}.`,
      category: isUrgent ? 'Urgent Care' : 'Care',
      stage: plan.is_active ? 'attention' : 'completed',
      icon: isUrgent ? '🔴' : '💙',
      sortDate: dateField ? new Date(dateField).getTime() : 0,
    };
  });

  // Convert discipleship plans to timeline items
  const discipleshipItems = (discipleshipPlans || []).map((plan, index) => {
    const dateField = plan.created_at || plan.target_date;
    const pathwayLabel = plan.pathway
      ? plan.pathway.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Discipleship';
    const description = plan.next_step
      ? `Next step: ${plan.next_step}`
      : plan.mentor_name
        ? `Mentor: ${plan.mentor_name}`
        : 'Discipleship journey in progress.';

    return {
      id: plan.id || `discipleship-${index}`,
      title: `${pathwayLabel} plan`,
      date: formatMonthDay(dateField ?? null, timezone),
      timeAgo: formatRelative(dateField ?? null, timezone),
      description,
      category: 'Discipleship',
      stage: plan.status === 'completed' ? 'completed' : plan.status === 'active' ? 'scheduled' : 'new',
      icon: '📖',
      sortDate: dateField ? new Date(dateField).getTime() : 0,
    };
  });

  // Merge all items and sort by date (most recent first)
  const allItems = [...eventItems, ...carePlanItems, ...discipleshipItems]
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, limit)
    .map(({ sortDate: _sortDate, ...item }) => item);

  return allItems;
}

async function buildMemberProfileRecord(
  service: MemberProfileService,
  member: MemberRow,
  options: { timelineLimit: number }
): Promise<MemberProfileRecord> {
  // Fetch care plan and discipleship plan services from DI container
  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
  const discipleshipPlanService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);

  // Fetch family service for new family system
  const familyService = container.get<FamilyService>(TYPES.FamilyService);
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  const tenantId = tenant?.id ?? null;

  // Fetch tenant timezone for date formatting (display only)
  const timezone = await getTenantTimezone();

  const [householdMembers, givingProfile, carePlan, timelineEvents, milestoneRows, memberCarePlans, memberDiscipleshipPlans, primaryFamilyMembership] = await Promise.all([
    fetchHouseholdMembers(service, member),
    fetchGivingProfile(service, member.id),
    fetchCarePlan(service, member.id),
    fetchTimelineEvents(service, member.id, options.timelineLimit),
    fetchMilestones(service, member.id),
    carePlanService.getCarePlansByMember(member.id),
    discipleshipPlanService.getPlansByMember(member.id),
    tenantId ? familyService.getPrimaryFamily(member.id, tenantId) : Promise.resolve(null),
  ]);

  const fullName = formatFullName(member.first_name ?? null, member.last_name ?? null);
  const preferredName = (member.preferred_name ?? '').trim() || null;
  const stageCode = member.membership_stage?.code ?? null;
  const stageLabel = member.membership_stage?.name ?? formatStageLabel(stageCode);
  const membershipTypeCode = member.membership_type?.code ?? null;
  const membershipTypeLabel = (member.membership_type?.name ?? '').trim() ||
    mapMembershipType(membershipTypeCode ?? stageCode ?? null);
  const centerLabel = member.membership_center?.name ?? null;
  const photoUrl = member.profile_picture_url ?? null;
  const birthdate = formatFullDate(member.birthday ?? null, timezone);
  const anniversary = formatFullDate(member.anniversary ?? null, timezone);
  const rawMaritalStatus = (member.marital_status ?? '').trim();
  const maritalStatus = rawMaritalStatus ? formatLabel(rawMaritalStatus, 'Unknown') : null;
  const occupation = (member.occupation ?? '').trim() || null;
  const joinDate = formatFullDate(member.membership_date ?? null, timezone);
  const envelopeNumber = member.envelope_number ?? null;

  const groupTags = Array.isArray(member.small_groups)
    ? member.small_groups
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value))
    : [];
  const memberTags = Array.isArray(member.tags)
    ? member.tags
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value))
    : [];
  const discipleshipGroup = (member.discipleship_group ?? '').trim();
  const primaryGroup = (member.primary_small_group ?? '').trim() || discipleshipGroup || null;
  const pathways = Array.isArray(member.discipleship_pathways)
    ? ensureUnique(
        member.discipleship_pathways
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const spiritualGifts = Array.isArray(member.spiritual_gifts)
    ? ensureUnique(
        member.spiritual_gifts
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const ministryInterests = Array.isArray(member.ministry_interests)
    ? ensureUnique(
        member.ministry_interests
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const prayerRequestsList = Array.isArray(member.prayer_requests)
    ? ensureUnique(
        member.prayer_requests
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value))
      )
    : [];
  const prayerRequestsText = prayerRequestsList.length ? prayerRequestsList.join('\n') : null;
  const prayerFocus = (member.prayer_focus ?? '').trim() || null;
  const activeGroups = ensureUnique(filterNonEmpty([primaryGroup, discipleshipGroup, ...groupTags]));
  const tags = ensureUnique([
    ...memberTags,
    ...groupTags,
    ...(discipleshipGroup ? [discipleshipGroup] : []),
  ]);

  const carePlanDetails = buildCarePlan(carePlan, member, timezone);
  const carePlanRecord = {
    ...carePlanDetails,
    prayerFocus,
    prayerRequests: prayerRequestsText,
  };
  const emergencyDetails = carePlanRecord.emergencyContact
    ? {
        contact: carePlanRecord.emergencyContact.name ?? null,
        relationship: carePlanRecord.emergencyContact.relationship ?? null,
        phone: carePlanRecord.emergencyContact.phone ?? null,
        physician: carePlanRecord.emergencyContact.physician ?? null,
      }
    : null;

  const householdList = ensureUnique(
    householdMembers.length ? householdMembers : filterNonEmpty([fullName, preferredName])
  );
  const fallbackAddress = parseAddress(member.address ?? null);
  // Use member's split address fields if household address is not available
  const memberAddress = {
    street: member.address_street ?? fallbackAddress?.street ?? null,
    city: member.address_city ?? fallbackAddress?.city ?? null,
    state: member.address_state ?? fallbackAddress?.state ?? null,
    postalCode: member.address_postal_code ?? fallbackAddress?.postalCode ?? null,
  };
  const householdAddress = member.household
    ? {
        street: member.household.address_street ?? memberAddress.street ?? null,
        city: member.household.address_city ?? memberAddress.city ?? null,
        state: member.household.address_state ?? memberAddress.state ?? null,
        postalCode: member.household.address_postal_code ?? memberAddress.postalCode ?? null,
      }
    : memberAddress;
  const dataSteward = (member.data_steward ?? '').trim() || null;
  const lastReview = formatFullDate(member.last_review_at ?? null, timezone);

  // Build family data from new family system
  let familyData: MemberProfileRecord['family'] = null;
  if (primaryFamilyMembership && primaryFamilyMembership.family && tenantId) {
    try {
      const familyMembers = await familyService.getFamilyMembers(primaryFamilyMembership.family_id, tenantId);
      const membersList = familyMembers.map((fm: FamilyMember) => ({
        id: fm.member_id,
        name: fm.member
          ? formatFullName(fm.member.first_name ?? null, fm.member.last_name ?? null) || 'Unknown'
          : 'Unknown',
        role: fm.role ?? 'other',
        isPrimary: fm.is_primary ?? false,
      }));

      familyData = {
        id: primaryFamilyMembership.family_id,
        name: primaryFamilyMembership.family.name ?? null,
        role: primaryFamilyMembership.role ?? 'other',
        isPrimary: primaryFamilyMembership.is_primary ?? false,
        members: membersList,
        address: {
          street: primaryFamilyMembership.family.address_street ?? memberAddress.street ?? null,
          city: primaryFamilyMembership.family.address_city ?? memberAddress.city ?? null,
          state: primaryFamilyMembership.family.address_state ?? memberAddress.state ?? null,
          postalCode: primaryFamilyMembership.family.address_postal_code ?? memberAddress.postalCode ?? null,
        },
      };
    } catch (familyError) {
      console.warn('[buildMemberProfileRecord] Failed to fetch family members:', familyError);
    }
  }

  return {
    // DirectoryMember required fields
    first_name: member.first_name ?? '',
    last_name: member.last_name ?? '',
    email: member.email ?? null,
    profile_picture_url: member.profile_picture_url ?? null,
    contact_number: member.contact_number ?? null,
    membership_stage: member.membership_stage ? {
      name: member.membership_stage.name ?? '',
      code: member.membership_stage.code ?? ''
    } : null,
    membership_center: member.membership_center ? {
      name: member.membership_center.name ?? '',
      code: member.membership_center.code ?? ''
    } : null,
    created_at: member.membership_date ?? null, // Use membership_date as created_at fallback
    // MemberProfileRecord fields
    id: member.id,
    fullName: fullName || preferredName || member.email || 'Member',
    photoUrl,
    preferredName,
    stage: stageLabel,
    statusVariant: mapStageVariant(stageCode),
    center: centerLabel,
    membershipType: membershipTypeLabel,
    joinDate,
    envelopeNumber,
    tags,
    membershipLabel: stageLabel,
    demographics: {
      birthdate,
      maritalStatus,
      anniversary,
      occupation,
    },
    admin: {
      steward: dataSteward,
      lastReview,
    },
    serving: {
      team: member.serving_team ?? null,
      role: member.serving_role ?? null,
      schedule: member.serving_schedule ?? null,
      coach: member.serving_coach ?? null,
    },
    household: {
      name: formatHouseholdName(member),
      members: householdList,
      address: householdAddress,
    },
    family: familyData,
    contact: {
      email: member.email ?? null,
      phone: member.contact_number ?? null,
      preferred: mapPreferredContactMethod(member.preferred_contact_method ?? null),
    },
    engagement: {
      groups: activeGroups,
      pathways,
      spiritualGifts,
      interests: ministryInterests,
      prayerFocus,
    },
    giving: buildGiving(givingProfile, member),
    discipleship: {
      smallGroup: member.discipleship_group ?? member.small_groups?.[0] ?? null,
      mentor: member.discipleship_mentor ?? null,
      milestones: mapMilestones(milestoneRows),
      nextStep: member.discipleship_next_step ?? null,
    },
    carePlan: carePlanRecord,
    emergency: emergencyDetails,
    timeline: buildMemberTimeline(timelineEvents, memberCarePlans, memberDiscipleshipPlans, options.timelineLimit, timezone),
  } satisfies MemberProfileRecord;
}

async function resolveMemberProfile(
  request: ServiceDataSourceRequest
): Promise<{ records: MemberProfileRecord[]; notFound?: boolean }> {
  const fallback = cloneMemberRecords(request.config.value);
  try {
    const memberId = firstParam(request.params.memberId);
    const limit = toNumber(request.config.limit, memberId ? 1 : 5);
    const timelineLimit = toNumber((request.config as { timelineLimit?: unknown }).timelineLimit, 10);
    const service = createMemberProfileService();
    const members = await service.getMembers({ memberId, limit });
    if (!members.length) {
      // If a specific memberId was requested but not found, return notFound flag
      // Only use fallback data when no specific memberId is requested (for preview/dev)
      if (memberId) {
        return { records: [], notFound: true };
      }
      return { records: fallback };
    }

    const records = await Promise.all(
      members.map((member) => buildMemberProfileRecord(service, member, { timelineLimit }))
    );

    return { records };
  } catch (error) {
    console.error('Failed to resolve member profile data source', error);
    // On error with a specific memberId, indicate not found rather than showing fallback
    const memberId = firstParam(request.params.memberId);
    if (memberId) {
      return { records: [], notFound: true };
    }
    if (fallback.length) {
      return { records: fallback };
    }
    return { records: [] };
  }
}

async function resolveMembershipLookups(
  request: ServiceDataSourceRequest
): Promise<{ lookups: LookupGroups }> {
  const fallback = cloneLookupGroups(request.config.value);
  try {
    const lookups = await fetchMembershipLookupGroups(request);
    if (Object.keys(lookups).length > 0) {
      return { lookups };
    }
    if (Object.keys(fallback).length > 0) {
      return { lookups: fallback };
    }
    return { lookups: {} };
  } catch (error) {
    console.error('Failed to resolve membership lookup data source', error);
    if (Object.keys(fallback).length) {
      return { lookups: fallback };
    }
    return { lookups: {} };
  }
}

interface FamilyOptionRecord {
  id: string;
  name: string;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  member_count?: number;
}

interface FamilyMembershipRecord {
  familyId: string;
  familyName: string;
  role: 'head' | 'spouse' | 'child' | 'dependent' | 'other';
  isPrimary: boolean;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
}

async function resolveMembershipManage(
  request: ServiceDataSourceRequest
): Promise<{
  records: MemberManageRecord[];
  familyOptions: FamilyOptionRecord[];
  familyMemberships: FamilyMembershipRecord[];
}> {
  const fallback = cloneManageRecords(request.config.value);
  const emptyResult = { records: [], familyOptions: [], familyMemberships: [] };

  try {
    const memberId = firstParam(request.params.memberId);
    const limit = toNumber(request.config.limit, memberId ? 1 : 5);
    const service = createMemberProfileService();
    const members = await service.getMembers({ memberId, limit });

    // Fetch tenant ID and family service
    const tenantId = await tenantUtils.getTenantId();
    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    // Fetch all families for the tenant (for the family picker)
    let familyOptions: FamilyOptionRecord[] = [];
    if (tenantId) {
      try {
        const allFamilies = await familyService.getFamiliesByTenant(tenantId);
        familyOptions = allFamilies.map((family) => ({
          id: family.id!,
          name: family.name || 'Unnamed Family',
          address_street: family.address_street ?? null,
          address_city: family.address_city ?? null,
          address_state: family.address_state ?? null,
          address_postal_code: family.address_postal_code ?? null,
          member_count: family.member_count ?? 0,
        }));
      } catch (familyError) {
        console.warn('[resolveMembershipManage] Failed to fetch family options:', familyError);
      }
    }

    if (!members.length) {
      return { records: fallback, familyOptions, familyMemberships: [] };
    }

    // Fetch family memberships for the first member (primary record)
    let familyMemberships: FamilyMembershipRecord[] = [];
    const primaryMember = members[0];

    if (tenantId && primaryMember?.id) {
      try {
        const memberFamilies = await familyService.getMemberFamilies(primaryMember.id, tenantId);
        familyMemberships = memberFamilies.map((fm: FamilyMember) => ({
          familyId: fm.family_id,
          familyName: fm.family?.name || 'Unknown Family',
          role: fm.role as FamilyMembershipRecord['role'],
          isPrimary: fm.is_primary ?? false,
          address_street: fm.family?.address_street ?? null,
          address_city: fm.family?.address_city ?? null,
          address_state: fm.family?.address_state ?? null,
          address_postal_code: fm.family?.address_postal_code ?? null,
        }));
      } catch (familyError) {
        console.warn('[resolveMembershipManage] Failed to fetch family memberships:', familyError);
      }
    }

    const records = await Promise.all(
      members.map(async (member) => {
        const baseRecord = toMembershipManageRecord(member);

        // Fetch family membership for this member
        if (tenantId && member.id) {
          try {
            const primaryFamily = await familyService.getPrimaryFamily(member.id, tenantId);
            if (primaryFamily && primaryFamily.family) {
              const family = primaryFamily.family;
              baseRecord.family = {
                id: family.id ?? null,
                name: family.name ?? null,
                members: [], // Member names are fetched separately if needed
                address_street: family.address_street ?? null,
                address_city: family.address_city ?? null,
                address_state: family.address_state ?? null,
                address_postal_code: family.address_postal_code ?? null,
              };
              baseRecord.familyId = family.id ?? null;
              baseRecord.familyRole = primaryFamily.role ?? 'other';
              baseRecord.isPrimaryFamily = primaryFamily.is_primary ?? true;
            }
          } catch (familyError) {
            console.warn('[resolveMembershipManage] Failed to fetch family data:', familyError);
          }
        }

        return baseRecord;
      })
    );

    return { records, familyOptions, familyMemberships };
  } catch (error) {
    console.error('Failed to resolve membership manage data source', error);
    if (fallback.length) {
      return { records: fallback, familyOptions: [], familyMemberships: [] };
    }
    return emptyResult;
  }
}

export const adminCommunityHandlers: Record<string, ServiceDataSourceHandler> = {
  [MEMBERS_TABLE_HANDLER_ID]: resolveMembersTable,
  [MEMBERS_LIST_HERO_HANDLER_ID]: resolveMembersListHero,
  [MEMBERS_LIST_SEGMENTS_HANDLER_ID]: resolveMembersListSegments,
  [MEMBERS_PROFILE_HANDLER_ID]: resolveMemberProfile,
  [MEMBERS_LOOKUPS_HANDLER_ID]: resolveMembershipLookups,
  [MEMBERS_MANAGE_HANDLER_ID]: resolveMembershipManage,
  ...adminCommunityHouseholdsHandlers,
  ...adminCommunityCarePlansHandlers,
  ...adminCommunityDashboardHandlers,
  ...adminCommunityDiscipleshipHandlers,
  ...adminCommunityPlanningHandlers,
  ...adminCommunityFamiliesHandlers,
  ...adminCommunityGoalsHandlers,
  ...adminCommunitySchedulerHandlers,
  ...adminCommunityAccountsHandlers,
};
