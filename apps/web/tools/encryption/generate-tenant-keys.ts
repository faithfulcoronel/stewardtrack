/**
 * Generate Encryption Keys for Existing Tenants
 *
 * This script generates encryption keys for tenants that were created before
 * the encryption feature was implemented. It safely skips tenants that already
 * have encryption keys.
 *
 * Usage:
 *   pnpm --filter @stewardtrack/web generate-tenant-keys
 *
 * Requirements:
 *   - ENCRYPTION_MASTER_KEY must be set in .env
 *   - NEXT_PUBLIC_SUPABASE_URL must be set in .env
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

interface EncryptionKey {
  id: string;
  tenant_id: string;
  is_active: boolean;
}

interface GenerationResult {
  total: number;
  generated: number;
  skipped: number;
  errors: number;
  details: Array<{
    tenantId: string;
    tenantName: string;
    status: 'generated' | 'skipped' | 'error';
    message?: string;
  }>;
}

// Load environment variables from .env
async function loadEnvVariables(): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  } catch (_error) {
    console.error('❌ Could not read .env file');
    console.error('   Make sure .env exists in the apps/web directory');
    process.exit(1);
  }
}

// Validate environment
function validateEnvironment(): { supabaseUrl: string; supabaseKey: string; masterKey: Buffer } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionMasterKey = process.env.ENCRYPTION_MASTER_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!encryptionMasterKey) missing.push('ENCRYPTION_MASTER_KEY');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n💡 Make sure .env contains these variables.');
    if (missing.includes('ENCRYPTION_MASTER_KEY')) {
      console.error('\n📝 Generate ENCRYPTION_MASTER_KEY with:');
      console.error('   node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))"');
    }
    process.exit(1);
  }

  // Validate master key format
  let masterKey: Buffer;
  try {
    masterKey = Buffer.from(encryptionMasterKey!, 'base64');
    if (masterKey.length !== 32) {
      throw new Error(`Expected 32 bytes, got ${masterKey.length}`);
    }
  } catch (error) {
    console.error('❌ Invalid ENCRYPTION_MASTER_KEY format');
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    console.error('\n📝 Generate a valid key with:');
    console.error('   node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))"');
    process.exit(1);
  }

  return { supabaseUrl: supabaseUrl!, supabaseKey: supabaseKey!, masterKey };
}

// Encrypt master key with system key using AES-256-GCM
function encryptMasterKey(masterKey: Buffer, systemKey: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', systemKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(masterKey),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Format: iv (12) + authTag (16) + ciphertext (32) = 60 bytes
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

// Fetch all tenants
async function fetchTenants(supabase: SupabaseClient): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tenants: ${error.message}`);
  }

  return data || [];
}

// Fetch existing encryption keys
async function fetchExistingKeys(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('encryption_keys')
    .select('tenant_id')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to fetch encryption keys: ${error.message}`);
  }

  return new Set((data || []).map((k: EncryptionKey) => k.tenant_id));
}

// Generate encryption key for a tenant
async function generateKeyForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  systemMasterKey: Buffer
): Promise<void> {
  // Generate random 256-bit master key
  const masterKey = crypto.randomBytes(32);
  const salt = crypto.randomBytes(32);

  // Encrypt master key with system key
  const encryptedKey = encryptMasterKey(masterKey, systemMasterKey);

  // Insert into database
  const { error } = await supabase
    .from('encryption_keys')
    .insert({
      tenant_id: tenantId,
      key_version: 1,
      encrypted_master_key: encryptedKey,
      key_derivation_salt: salt,
      algorithm: 'AES-256-GCM',
      is_active: true,
      created_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(error.message);
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('🔐 Encryption Key Generation for Existing Tenants\n');
  console.log('━'.repeat(55));

  // Load environment variables
  await loadEnvVariables();

  // Validate environment
  const { supabaseUrl, supabaseKey, masterKey } = validateEnvironment();

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Fetch tenants and existing keys
  console.log('\n📋 Fetching tenants...');
  const tenants = await fetchTenants(supabase);
  console.log(`   Found ${tenants.length} tenant(s)`);

  console.log('\n🔑 Checking existing encryption keys...');
  const existingKeys = await fetchExistingKeys(supabase);
  console.log(`   Found ${existingKeys.size} tenant(s) with existing keys`);

  // Identify tenants needing keys
  const tenantsNeedingKeys = tenants.filter(t => !existingKeys.has(t.id));
  console.log(`\n📊 Analysis:`);
  console.log(`   ✅ Already have keys: ${existingKeys.size}`);
  console.log(`   ⏳ Need keys generated: ${tenantsNeedingKeys.length}`);

  if (tenantsNeedingKeys.length === 0) {
    console.log('\n✅ All tenants already have encryption keys!');
    console.log('━'.repeat(55));
    return;
  }

  // Generate keys
  console.log('\n🔐 Generating encryption keys...\n');

  const result: GenerationResult = {
    total: tenantsNeedingKeys.length,
    generated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };

  for (const tenant of tenantsNeedingKeys) {
    try {
      await generateKeyForTenant(supabase, tenant.id, masterKey);
      console.log(`   ✅ ${tenant.name} (${tenant.id.substring(0, 8)}...)`);
      result.generated++;
      result.details.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        status: 'generated'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ ${tenant.name}: ${message}`);
      result.errors++;
      result.details.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        status: 'error',
        message
      });
    }
  }

  // Summary
  console.log('\n' + '━'.repeat(55));
  console.log('📊 Summary:');
  console.log(`   ✅ Keys generated: ${result.generated}`);
  console.log(`   ⏭️  Skipped (already had key): ${existingKeys.size}`);
  if (result.errors > 0) {
    console.log(`   ❌ Errors: ${result.errors}`);
  }
  console.log('━'.repeat(55));

  // Verification query
  if (result.generated > 0) {
    console.log('\n📝 Verify with SQL:');
    console.log(`   SELECT t.id, t.name, ek.is_active`);
    console.log(`   FROM tenants t`);
    console.log(`   LEFT JOIN encryption_keys ek ON t.id = ek.tenant_id AND ek.is_active = true`);
    console.log(`   ORDER BY t.created_at;`);
  }

  if (result.errors > 0) {
    console.log('\n⚠️  Some keys failed to generate. Review errors above.');
    process.exit(1);
  }

  console.log('\n✅ Encryption key generation complete!');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
