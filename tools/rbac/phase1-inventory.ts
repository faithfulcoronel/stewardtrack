import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PAGE_SIZE = 1000;

const ENV_FILE_CANDIDATES = [
  path.resolve('.env.local'),
  path.resolve('.env'),
  path.resolve(path.join('supabase', '.env.local')),
  path.resolve(path.join('supabase', '.env')),
];

type TableExportConfig = {
  table: string;
  orderBy?: string;
};

type RecordWithTenant = { tenant_id?: string | null } & Record<string, unknown>;

type MetadataRBACOccurrence = {
  token: string;
  attribute: string;
  line: number;
};

type MetadataRBACFileReport = {
  file: string;
  occurrences: MetadataRBACOccurrence[];
  uniqueTokens: string[];
};

type MetadataRBACSummary = {
  files: MetadataRBACFileReport[];
  tokenCounts: Record<string, number>;
  unknownTokens: string[];
};

type SupabaseEnvironment = { supabaseUrl: string; serviceRoleKey: string };

type EnvDictionary = Record<string, string>;

function stripEnvValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(contents: string): EnvDictionary {
  const env: EnvDictionary = {};
  const lines = contents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key) {
      continue;
    }

    const value = stripEnvValue(line.slice(equalsIndex + 1));
    env[key] = value;
  }

  return env;
}

async function loadEnvFromFile(filePath: string): Promise<EnvDictionary | null> {
  try {
    const contents = await fs.readFile(filePath, 'utf-8');
    return parseEnvFile(contents);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function hydrateEnvironment(): Promise<void> {
  for (const candidate of ENV_FILE_CANDIDATES) {
    const parsed = await loadEnvFromFile(candidate);
    if (!parsed) {
      continue;
    }

    const assignedKeys: string[] = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
        assignedKeys.push(key);
      }
    }

    if (assignedKeys.length > 0) {
      const relativePath = path.relative(process.cwd(), candidate);
      console.log(`Loaded ${assignedKeys.length} environment variable(s) from ${relativePath}`);
    }
  }
}

async function ensureEnvironment(): Promise<SupabaseEnvironment> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  return { supabaseUrl, serviceRoleKey };
}

function createSupabaseClient(env: SupabaseEnvironment): SupabaseClient {
  const { supabaseUrl, serviceRoleKey } = env;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'rbac-phase1-inventory-script',
      },
    },
  });
}

async function fetchAllRecords(client: SupabaseClient, config: TableExportConfig): Promise<Record<string, unknown>[]> {
  const { table, orderBy } = config;
  const records: Record<string, unknown>[] = [];
  let start = 0;

  while (true) {
    let query = client.from(table).select('*', { count: 'exact' }).range(start, start + PAGE_SIZE - 1);

    if (orderBy) {
      query = query.order(orderBy, { ascending: true, nullsFirst: true });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch data from ${table}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    records.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    start += PAGE_SIZE;
  }

  return records;
}

async function exportDatasets(client: SupabaseClient): Promise<Record<string, Record<string, unknown>[]>> {
  const tables: TableExportConfig[] = [
    { table: 'roles', orderBy: 'id' },
    { table: 'permissions', orderBy: 'id' },
    { table: 'user_roles', orderBy: 'id' },
    { table: 'role_permissions', orderBy: 'id' },
    { table: 'role_menu_items', orderBy: 'id' },
    { table: 'menu_items', orderBy: 'id' },
    { table: 'menu_permissions', orderBy: 'id' },
    { table: 'licenses', orderBy: 'id' },
    { table: 'license_features', orderBy: 'id' },
  ];

  const dataset: Record<string, Record<string, unknown>[]> = {};

  for (const config of tables) {
    dataset[config.table] = await fetchAllRecords(client, config);
  }

  return dataset;
}

function buildIdSet(records: Record<string, unknown>[], key: string): Set<string> {
  const ids = new Set<string>();
  for (const record of records) {
    const value = record[key];
    if (typeof value === 'string') {
      ids.add(value);
    }
  }
  return ids;
}

function collectOrphanedReferences(dataset: Record<string, Record<string, unknown>[]>): Record<string, unknown> {
  const roleIds = buildIdSet(dataset.roles ?? [], 'id');
  const permissionIds = buildIdSet(dataset.permissions ?? [], 'id');
  const menuItemIds = buildIdSet(dataset.menu_items ?? [], 'id');

  const orphanedRolePermissions: Record<string, unknown>[] = [];
  for (const entry of dataset.role_permissions ?? []) {
    const roleId = entry.role_id as string | undefined;
    const permissionId = entry.permission_id as string | undefined;
    const tenantId = (entry as RecordWithTenant).tenant_id ?? null;

    const issues: string[] = [];
    if (roleId && !roleIds.has(roleId)) {
      issues.push('missing_role');
    }
    if (permissionId && !permissionIds.has(permissionId)) {
      issues.push('missing_permission');
    }

    if (issues.length > 0) {
      orphanedRolePermissions.push({ role_id: roleId, permission_id: permissionId, tenant_id: tenantId, issues });
    }
  }

  const orphanedRoleMenuItems: Record<string, unknown>[] = [];
  for (const entry of dataset.role_menu_items ?? []) {
    const roleId = entry.role_id as string | undefined;
    const menuItemId = entry.menu_item_id as string | undefined;
    const tenantId = (entry as RecordWithTenant).tenant_id ?? null;

    const issues: string[] = [];
    if (roleId && !roleIds.has(roleId)) {
      issues.push('missing_role');
    }
    if (menuItemId && !menuItemIds.has(menuItemId)) {
      issues.push('missing_menu_item');
    }

    if (issues.length > 0) {
      orphanedRoleMenuItems.push({ role_id: roleId, menu_item_id: menuItemId, tenant_id: tenantId, issues });
    }
  }

  const orphanedMenuPermissions: Record<string, unknown>[] = [];
  for (const entry of dataset.menu_permissions ?? []) {
    const menuItemId = entry.menu_item_id as string | undefined;
    const permissionId = entry.permission_id as string | undefined;
    const tenantId = (entry as RecordWithTenant).tenant_id ?? null;

    const issues: string[] = [];
    if (menuItemId && !menuItemIds.has(menuItemId)) {
      issues.push('missing_menu_item');
    }
    if (permissionId && !permissionIds.has(permissionId)) {
      issues.push('missing_permission');
    }

    if (issues.length > 0) {
      orphanedMenuPermissions.push({ menu_item_id: menuItemId, permission_id: permissionId, tenant_id: tenantId, issues });
    }
  }

  return {
    role_permissions: orphanedRolePermissions,
    role_menu_items: orphanedRoleMenuItems,
    menu_permissions: orphanedMenuPermissions,
  };
}

async function walkDirectory(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await walkDirectory(resolved)));
      } else if (entry.isFile() && entry.name.endsWith('.xml')) {
        files.push(resolved);
      }
    })
  );

  return files;
}

function parseMetadataRBACOccurrences(filePath: string, contents: string): MetadataRBACFileReport | null {
  const tagRegex = /<RBAC\b[^>]*>/gi;
  const attributeRegex = /(allow|deny|require)=["']([^"']+)["']/gi;
  const occurrences: MetadataRBACOccurrence[] = [];
  const uniqueTokens = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(contents)) !== null) {
    const tagText = match[0];
    const prefix = contents.slice(0, match.index ?? 0);
    const line = prefix.split(/\r?\n/).length;

    let attrMatch: RegExpExecArray | null;
    attributeRegex.lastIndex = 0;
    while ((attrMatch = attributeRegex.exec(tagText)) !== null) {
      const attribute = attrMatch[1];
      const tokens = attrMatch[2]
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);

      for (const token of tokens) {
        uniqueTokens.add(token);
        occurrences.push({ token, attribute, line });
      }
    }
  }

  if (occurrences.length === 0) {
    return null;
  }

  return {
    file: filePath,
    occurrences,
    uniqueTokens: Array.from(uniqueTokens).sort(),
  };
}

async function catalogueMetadataRBAC(rootDir: string, dataset: Record<string, Record<string, unknown>[]>): Promise<MetadataRBACSummary> {
  const files = await walkDirectory(rootDir);
  const reports: MetadataRBACFileReport[] = [];
  const tokenCounts: Record<string, number> = {};
  const allTokens = new Set<string>();

  for (const file of files) {
    const contents = await fs.readFile(file, 'utf-8');
    const report = parseMetadataRBACOccurrences(path.relative(process.cwd(), file), contents);
    if (report) {
      reports.push(report);
      for (const occurrence of report.occurrences) {
        allTokens.add(occurrence.token);
        tokenCounts[occurrence.token] = (tokenCounts[occurrence.token] ?? 0) + 1;
      }
    }
  }

  const roles = dataset.roles ?? [];
  const roleNames = new Set<string>();
  const roleCodes = new Set<string>();

  for (const role of roles) {
    const name = role.name;
    if (typeof name === 'string') {
      roleNames.add(name);
    }
    const code = role.code;
    if (typeof code === 'string') {
      roleCodes.add(code);
    }
  }

  const unknownTokens: string[] = [];
  for (const token of Array.from(allTokens).sort()) {
    if (!roleNames.has(token) && !roleCodes.has(token)) {
      unknownTokens.push(token);
    }
  }

  return {
    files: reports.sort((a, b) => a.file.localeCompare(b.file)),
    tokenCounts,
    unknownTokens,
  };
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

async function main(): Promise<void> {
  await hydrateEnvironment();
  const env = await ensureEnvironment();
  const client = createSupabaseClient(env);

  console.log('Exporting RBAC, menu, and license datasets...');
  const dataset = await exportDatasets(client);

  console.log('Analyzing for orphaned references...');
  const orphanedReferences = collectOrphanedReferences(dataset);

  console.log('Cataloguing metadata RBAC usage...');
  const metadataSummary = await catalogueMetadataRBAC(path.resolve('metadata'), dataset);

  const outputRoot = path.resolve('reports', 'rbac', 'phase1');
  await writeJsonFile(path.join(outputRoot, 'dataset.json'), dataset);
  await writeJsonFile(path.join(outputRoot, 'orphaned-references.json'), orphanedReferences);
  await writeJsonFile(path.join(outputRoot, 'metadata-rbac-usage.json'), metadataSummary);

  console.log('Discovery datasets written to', outputRoot);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
