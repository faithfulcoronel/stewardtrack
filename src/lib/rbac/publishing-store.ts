export type PublishingJobType = 'metadata_compilation' | 'permission_sync' | 'surface_binding_update' | 'license_validation';
export type PublishingJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PublishingJobSnapshot {
  id: string;
  type: PublishingJobType;
  status: PublishingJobStatus;
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata: {
    entity_count: number;
    processed_count: number;
    tenant_id?: string;
    scope?: string;
  };
}

export interface MetadataCompilationSummary {
  surfaces: number;
  bindings: number;
  roles: number;
  bundles: number;
  features: number;
  errors: string[];
  warnings: string[];
}

export interface PublishingStatsSnapshot {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageCompletionTime: number;
  lastPublishedAt?: string;
  nextScheduledAt?: string;
}

export interface TenantPublishingStatusSnapshot {
  tenant_id: string;
  tenant_name: string;
  last_published_at?: string;
  status: 'current' | 'stale' | 'error';
  pending_changes: number;
  metadata_version: string;
}

export interface QueuePublishingJobOptions {
  tenantId: string;
  type: PublishingJobType;
  metadata?: Partial<PublishingJobSnapshot['metadata']>;
  expectedDurationMs?: number;
}

export interface QueuePublishingJobResult {
  job: PublishingJobSnapshot;
  summary?: MetadataCompilationSummary;
}

type InternalJob = {
  id: string;
  tenantId: string;
  type: PublishingJobType;
  status: PublishingJobStatus;
  progress: number;
  metadata: PublishingJobSnapshot['metadata'];
  expectedDurationMs: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  errorMessage?: string;
  updatedAt: string;
  completionLogged?: boolean;
};

type TenantPublishingStatusRecord = {
  tenantId: string;
  tenantName: string;
  lastPublishedAt?: string;
  status: TenantPublishingStatusSnapshot['status'];
  pendingChanges: number;
  metadataVersion: string;
};

type PublishingStore = {
  jobs: InternalJob[];
  tenants: TenantPublishingStatusRecord[];
  nextJobSequence: number;
  nextMetadataVersion: number;
};

const STORE_KEY = Symbol.for('stewardtrack.rbac.publishingStore');

const DEFAULT_EXPECTED_DURATION: Record<PublishingJobType, number> = {
  metadata_compilation: 3 * 60 * 1000,
  permission_sync: 4 * 60 * 1000,
  surface_binding_update: 5 * 60 * 1000,
  license_validation: 2 * 60 * 1000,
};

const COMPLETED_JOB_TYPES_WITH_VERSION: PublishingJobType[] = ['metadata_compilation', 'surface_binding_update'];

export function getPublishingJobsSnapshot(tenantId?: string): PublishingJobSnapshot[] {
  const store = refreshStore();
  const relevant = store.jobs
    .filter((job) => !tenantId || job.tenantId === tenantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return relevant.map(mapJobToSnapshot);
}

export function getPublishingStatsSnapshot(tenantId?: string): PublishingStatsSnapshot {
  const store = refreshStore();
  const relevant = store.jobs.filter((job) => !tenantId || job.tenantId === tenantId);

  const totalJobs = relevant.length;
  const runningJobs = relevant.filter((job) => job.status === 'running' || job.status === 'pending').length;
  const completedJobs = relevant.filter((job) => job.status === 'completed').length;
  const failedJobs = relevant.filter((job) => job.status === 'failed').length;

  const completedDurations = relevant
    .filter((job) => job.status === 'completed' && job.startedAt && job.completedAt)
    .map((job) => new Date(job.completedAt!).getTime() - new Date(job.startedAt!).getTime());

  const averageCompletionTime = completedDurations.length > 0
    ? Math.round(
        completedDurations.reduce((sum, duration) => sum + duration, 0) /
        completedDurations.length /
        60000
      )
    : 0;

  const lastPublishedJob = relevant
    .filter((job) => job.type === 'metadata_compilation' && job.status === 'completed' && job.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .at(0);

  const runningJobEta = relevant
    .filter((job) => (job.status === 'running' || job.status === 'pending') && job.startedAt)
    .map((job) => new Date(job.startedAt!).getTime() + job.expectedDurationMs)
    .sort((a, b) => a - b)
    .at(0);

  return {
    totalJobs,
    runningJobs,
    completedJobs,
    failedJobs,
    averageCompletionTime,
    lastPublishedAt: lastPublishedJob?.completedAt,
    nextScheduledAt: runningJobEta ? new Date(runningJobEta).toISOString() : undefined,
  };
}

export function getTenantPublishingStatusesSnapshot(tenantId?: string): TenantPublishingStatusSnapshot[] {
  const store = refreshStore();
  const relevant = tenantId
    ? store.tenants.filter((tenant) => tenant.tenantId === tenantId)
    : store.tenants;

  return relevant
    .map(mapTenantToSnapshot)
    .sort((a, b) => a.tenant_name.localeCompare(b.tenant_name));
}

export function queuePublishingJob(options: QueuePublishingJobOptions): QueuePublishingJobResult {
  const store = refreshStore();
  const tenant = ensureTenant(store, options.tenantId);
  const createdAt = new Date().toISOString();

  const id = `job-${String(store.nextJobSequence).padStart(4, '0')}`;
  store.nextJobSequence += 1;

  const entityCount = options.metadata?.entity_count ?? generateEntityCount(options.type);

  const job: InternalJob = {
    id,
    tenantId: options.tenantId,
    type: options.type,
    status: 'pending',
    progress: 0,
    metadata: {
      entity_count: entityCount,
      processed_count: 0,
      tenant_id: options.metadata?.tenant_id ?? options.tenantId,
      scope: options.metadata?.scope,
    },
    expectedDurationMs: options.expectedDurationMs ?? DEFAULT_EXPECTED_DURATION[options.type],
    createdAt,
    startedAt: createdAt,
    updatedAt: createdAt,
  };

  store.jobs.unshift(job);
  tenant.pendingChanges += 1;
  tenant.status = 'stale';

  const refreshed = refreshStore();

  const persistedJob = refreshed.jobs.find((existing) => existing.id === job.id)!;
  const snapshot = mapJobToSnapshot(persistedJob);

  let summary: MetadataCompilationSummary | undefined;
  if (options.type === 'metadata_compilation') {
    summary = buildCompilationSummary(snapshot);
  }

  return { job: snapshot, summary };
}

export function cancelPublishingJob(jobId: string): PublishingJobSnapshot | null {
  const store = refreshStore();
  const job = store.jobs.find((record) => record.id === jobId);
  if (!job) {
    return null;
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return mapJobToSnapshot(job);
  }

  const now = new Date().toISOString();
  job.status = 'cancelled';
  job.cancelledAt = now;
  job.updatedAt = now;
  job.progress = Math.min(job.progress, 99);
  job.metadata.processed_count = Math.min(job.metadata.processed_count, job.metadata.entity_count);
  job.completionLogged = true;

  const tenant = ensureTenant(store, job.tenantId);
  tenant.pendingChanges = Math.max(0, tenant.pendingChanges - 1);

  refreshStore();

  return mapJobToSnapshot(job);
}

function refreshStore(now = Date.now()): PublishingStore {
  const store = ensureStore();

  store.jobs.forEach((job) => advanceJob(job, now));

  store.jobs = store.jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  store.jobs.forEach((job) => {
    if (job.status === 'completed' && job.completedAt && job.completionLogged !== true) {
      applyCompletionEffects(store, job);
      job.completionLogged = true;
    }
  });

  store.tenants.forEach((tenant) => updateTenantStatus(store, tenant, now));

  return store;
}

function ensureStore(): PublishingStore {
  const globalRef = globalThis as typeof globalThis & { [STORE_KEY]?: PublishingStore };
  if (!globalRef[STORE_KEY]) {
    globalRef[STORE_KEY] = createInitialStore();
  }
  return globalRef[STORE_KEY]!;
}

function createInitialStore(): PublishingStore {
  const now = Date.now();
  const tenantId = 'mock-tenant';
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const initialJobs: InternalJob[] = [
    {
      id: 'job-0001',
      tenantId,
      type: 'metadata_compilation',
      status: 'completed',
      progress: 100,
      metadata: {
        entity_count: 1480,
        processed_count: 1480,
        tenant_id: tenantId,
      },
      expectedDurationMs: DEFAULT_EXPECTED_DURATION.metadata_compilation,
      createdAt: iso(-6 * 60 * 60 * 1000),
      startedAt: iso(-6 * 60 * 60 * 1000),
      completedAt: iso(-6 * 60 * 60 * 1000 + DEFAULT_EXPECTED_DURATION.metadata_compilation),
      updatedAt: iso(-6 * 60 * 60 * 1000 + DEFAULT_EXPECTED_DURATION.metadata_compilation),
      completionLogged: true,
    },
    {
      id: 'job-0002',
      tenantId,
      type: 'permission_sync',
      status: 'failed',
      progress: 65,
      metadata: {
        entity_count: 860,
        processed_count: 560,
        tenant_id: tenantId,
      },
      expectedDurationMs: DEFAULT_EXPECTED_DURATION.permission_sync,
      createdAt: iso(-3 * 60 * 60 * 1000),
      startedAt: iso(-3 * 60 * 60 * 1000),
      completedAt: iso(-3 * 60 * 60 * 1000 + DEFAULT_EXPECTED_DURATION.permission_sync),
      updatedAt: iso(-3 * 60 * 60 * 1000 + DEFAULT_EXPECTED_DURATION.permission_sync),
      errorMessage: 'Sync aborted due to stale bundle index',
      completionLogged: true,
    },
    {
      id: 'job-0003',
      tenantId,
      type: 'surface_binding_update',
      status: 'running',
      progress: 35,
      metadata: {
        entity_count: 420,
        processed_count: 140,
        tenant_id: tenantId,
      },
      expectedDurationMs: DEFAULT_EXPECTED_DURATION.surface_binding_update,
      createdAt: iso(-35 * 60 * 1000),
      startedAt: iso(-35 * 60 * 1000),
      updatedAt: iso(-5 * 60 * 1000),
    },
  ];

  const tenants: TenantPublishingStatusRecord[] = [
    {
      tenantId,
      tenantName: 'Mock Tenant',
      lastPublishedAt: initialJobs[0].completedAt,
      status: 'stale',
      pendingChanges: 1,
      metadataVersion: '2025.09.26-01',
    },
    {
      tenantId: 'global-campus',
      tenantName: 'Global Campus Sandbox',
      lastPublishedAt: iso(-12 * 60 * 60 * 1000),
      status: 'current',
      pendingChanges: 0,
      metadataVersion: '2025.09.25-08',
    },
  ];

  return {
    jobs: initialJobs,
    tenants,
    nextJobSequence: 4,
    nextMetadataVersion: 2,
  };
}

function advanceJob(job: InternalJob, nowMs: number): void {
  if (job.status === 'pending') {
    job.status = 'running';
  }

  if (job.status !== 'running' || !job.startedAt) {
    return;
  }

  const startedMs = new Date(job.startedAt).getTime();
  const elapsed = Math.max(0, nowMs - startedMs);
  const expected = Math.max(job.expectedDurationMs, 30 * 1000);
  const progress = Math.min(100, Math.round((elapsed / expected) * 100));

  job.progress = progress;
  job.metadata.processed_count = Math.min(
    job.metadata.entity_count,
    Math.max(job.metadata.processed_count, Math.round((job.metadata.entity_count * progress) / 100))
  );
  job.updatedAt = new Date(nowMs).toISOString();

  if (progress >= 100 && !job.completedAt) {
    job.status = 'completed';
    job.completedAt = new Date(nowMs).toISOString();
    job.progress = 100;
    job.metadata.processed_count = job.metadata.entity_count;
  }
}

function applyCompletionEffects(store: PublishingStore, job: InternalJob): void {
  const tenant = ensureTenant(store, job.tenantId);

  if (job.completedAt && COMPLETED_JOB_TYPES_WITH_VERSION.includes(job.type)) {
    tenant.lastPublishedAt = job.completedAt;
    tenant.metadataVersion = generateMetadataVersion(store);
  }
}

function updateTenantStatus(store: PublishingStore, tenant: TenantPublishingStatusRecord, nowMs: number): void {
  const tenantJobs = store.jobs.filter((job) => job.tenantId === tenant.tenantId);

  const pendingJobs = tenantJobs.filter((job) => job.status === 'running' || job.status === 'pending');
  tenant.pendingChanges = pendingJobs.length;

  const hasRecentFailure = tenantJobs.some(
    (job) => job.status === 'failed' && nowMs - new Date(job.updatedAt).getTime() < 24 * 60 * 60 * 1000
  );

  if (hasRecentFailure) {
    tenant.status = 'error';
    return;
  }

  if (tenant.pendingChanges > 0) {
    tenant.status = 'stale';
    return;
  }

  if (!tenant.lastPublishedAt) {
    tenant.status = 'error';
    return;
  }

  const age = nowMs - new Date(tenant.lastPublishedAt).getTime();
  tenant.status = age > 3 * 24 * 60 * 60 * 1000 ? 'stale' : 'current';
}

function generateMetadataVersion(store: PublishingStore): string {
  const now = new Date();
  const prefix = `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, '0')}.${String(now.getUTCDate()).padStart(2, '0')}`;
  const suffix = String(store.nextMetadataVersion).padStart(2, '0');
  store.nextMetadataVersion += 1;
  return `${prefix}-${suffix}`;
}

function ensureTenant(store: PublishingStore, tenantId: string): TenantPublishingStatusRecord {
  let tenant = store.tenants.find((record) => record.tenantId === tenantId);
  if (!tenant) {
    tenant = {
      tenantId,
      tenantName: displayNameForTenant(tenantId),
      pendingChanges: 0,
      status: 'error',
      metadataVersion: 'unpublished',
    };
    store.tenants.push(tenant);
  }
  return tenant;
}

function mapJobToSnapshot(job: InternalJob): PublishingJobSnapshot {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: Math.min(100, Math.max(0, Math.round(job.progress))),
    started_at: job.startedAt,
    completed_at: job.completedAt,
    error_message: job.errorMessage,
    metadata: {
      entity_count: job.metadata.entity_count,
      processed_count: job.metadata.processed_count,
      tenant_id: job.metadata.tenant_id,
      scope: job.metadata.scope,
    },
  };
}

function mapTenantToSnapshot(tenant: TenantPublishingStatusRecord): TenantPublishingStatusSnapshot {
  return {
    tenant_id: tenant.tenantId,
    tenant_name: tenant.tenantName,
    last_published_at: tenant.lastPublishedAt,
    status: tenant.status,
    pending_changes: tenant.pendingChanges,
    metadata_version: tenant.metadataVersion,
  };
}

function displayNameForTenant(tenantId: string): string {
  return tenantId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Tenant';
}

function generateEntityCount(type: PublishingJobType): number {
  switch (type) {
    case 'metadata_compilation':
      return randomBetween(1200, 1850);
    case 'permission_sync':
      return randomBetween(700, 1100);
    case 'surface_binding_update':
      return randomBetween(350, 640);
    case 'license_validation':
      return randomBetween(400, 720);
    default:
      return 500;
  }
}

function buildCompilationSummary(job: PublishingJobSnapshot): MetadataCompilationSummary {
  const entityCount = job.metadata.entity_count || 0;

  const surfaces = Math.max(1, Math.round(entityCount / 240));
  const bindings = Math.max(4, Math.round(entityCount / 18));
  const roles = Math.max(12, Math.round(entityCount / 40));
  const bundles = Math.max(6, Math.round(entityCount / 90));
  const features = Math.max(5, Math.round(entityCount / 120));

  const warnings = entityCount % 2 === 0 ? [] : ['Deprecated binding reference detected'];

  return {
    surfaces,
    bindings,
    roles,
    bundles,
    features,
    errors: [],
    warnings,
  };
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
