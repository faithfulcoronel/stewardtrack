/**
 * Metadata-Driven Feature Seeding Script
 *
 * This script reads the compiled metadata manifest and automatically
 * seeds the feature_catalog table with features based on featureCode
 * attributes in metadata XML files.
 *
 * Usage:
 *   npm run metadata:seed-features
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env
async function loadEnvVariables() {
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
    console.error('   Make sure .env exists in the project root');
    process.exit(1);
  }
}

// Types
interface ManifestEntry {
  featureCode?: string | null;
  kind: 'blueprint' | 'overlay';
  layer: {
    module: string;
    route: string;
  };
}

interface ManifestFile {
  generatedAt: string;
  entries: Record<string, ManifestEntry>;
}

interface FeatureInfo {
  code: string;
  module: string;
  routes: string[];
  blueprintCount: number;
}

// Feature code to category mapping
const FEATURE_CATEGORIES: Record<string, string> = {
  'core-foundation': 'core',
  'member-management': 'members',
  'financial-management': 'finance',
  'rbac-security': 'rbac',
  'communication-tools': 'communication',
  'advanced-reporting': 'reports',
  'multi-campus': 'delegation',
};

// Feature code to description mapping
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'core-foundation': 'Essential platform features required for all deployments',
  'member-management': 'Complete member lifecycle management and family relationships',
  'financial-management': 'Comprehensive church financial tracking and reporting',
  'rbac-security': 'Advanced role-based access control and permission management',
  'communication-tools': 'Messaging, announcements, and member communication features',
  'advanced-reporting': 'Enhanced analytics and custom report generation',
  'multi-campus': 'Features for managing multiple campuses and delegated access',
};

async function readManifest(): Promise<ManifestFile> {
  const manifestPath = path.join(process.cwd(), 'metadata', 'registry', 'manifest.json');

  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content) as ManifestFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error('❌ Manifest file not found. Did you run `npm run metadata:compile`?');
      console.error(`   Expected at: ${manifestPath}`);
    } else {
      console.error('❌ Failed to read manifest:', error);
    }
    process.exit(1);
  }
}

function extractFeatures(manifest: ManifestFile): Map<string, FeatureInfo> {
  const features = new Map<string, FeatureInfo>();

  for (const [_key, entry] of Object.entries(manifest.entries)) {
    // Only process blueprints with feature codes
    if (entry.kind !== 'blueprint' || !entry.featureCode) {
      continue;
    }

    const featureCode = entry.featureCode;

    if (!features.has(featureCode)) {
      features.set(featureCode, {
        code: featureCode,
        module: entry.layer.module,
        routes: [],
        blueprintCount: 0,
      });
    }

    const feature = features.get(featureCode)!;
    feature.routes.push(entry.layer.route);
    feature.blueprintCount++;
  }

  return features;
}

function generateFeatureName(code: string): string {
  return code
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function seedFeatures(features: Map<string, FeatureInfo>, supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📦 Seeding features to database...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const [code, info] of features) {
    const name = generateFeatureName(code);
    const category = FEATURE_CATEGORIES[code] || 'general';
    const description = FEATURE_DESCRIPTIONS[code] ||
      `Metadata-driven feature for ${info.module} module (${info.blueprintCount} pages)`;

    try {
      const { error } = await supabase
        .from('feature_catalog')
        .upsert({
          code,
          name,
          category,
          description,
          phase: 'ga',
          is_active: true,
          is_delegatable: code === 'multi-campus',
        }, {
          onConflict: 'code',
        });

      if (error) {
        console.error(`   ❌ ${code}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ ${code} (${info.blueprintCount} pages)`);
        successCount++;
      }
    } catch (error) {
      console.error(`   ❌ ${code}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully seeded: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount}`);
  }

  return { successCount, errorCount };
}

async function mapFeaturesToBundles(supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('\n🔗 Mapping features to license bundles...\n');

  // Define bundle-to-feature mappings
  const bundleMappings: Record<string, string[]> = {
    'core-foundation': ['core-foundation'],
    'member-management': ['member-management'],
    'financial-management': ['financial-management'],
    'rbac-security': ['rbac-security'],
    'communication-tools': ['communication-tools'],
    'advanced-reporting': ['advanced-reporting'],
    'multi-campus': ['multi-campus'],
  };

  let mappingCount = 0;

  for (const [bundleCode, featureCodes] of Object.entries(bundleMappings)) {
    for (const featureCode of featureCodes) {
      // Use raw SQL for complex join
      const { error } = await supabase.rpc('map_feature_to_bundle', {
        p_bundle_code: bundleCode,
        p_feature_code: featureCode,
      });

      if (error) {
        // If RPC doesn't exist, try direct insert
        const { data: bundle } = await supabase
          .from('license_feature_bundles')
          .select('id')
          .eq('code', bundleCode)
          .single();

        const { data: feature } = await supabase
          .from('feature_catalog')
          .select('id')
          .eq('code', featureCode)
          .single();

        if (bundle && feature) {
          const { error: insertError } = await supabase
            .from('license_feature_bundle_items')
            .upsert({
              bundle_id: bundle.id,
              feature_id: feature.id,
              is_required: true,
              display_order: mappingCount + 1,
            }, {
              onConflict: 'bundle_id,feature_id',
            });

          if (!insertError) {
            console.log(`   ✅ ${bundleCode} → ${featureCode}`);
            mappingCount++;
          } else {
            console.error(`   ❌ ${bundleCode} → ${featureCode}: ${insertError.message}`);
          }
        }
      } else {
        console.log(`   ✅ ${bundleCode} → ${featureCode}`);
        mappingCount++;
      }
    }
  }

  console.log(`\n📊 Mapped ${mappingCount} feature-bundle relationships`);
}

async function main() {
  console.log('🚀 Metadata-Driven Feature Seeding\n');
  console.log('━'.repeat(50));

  // Load environment variables
  await loadEnvVariables();

  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n💡 Make sure .env contains these variables.');
    process.exit(1);
  }

  // Step 1: Read manifest
  console.log('\n📖 Reading metadata manifest...');
  const manifest = await readManifest();
  console.log(`   ✅ Found ${Object.keys(manifest.entries).length} manifest entries`);
  console.log(`   📅 Generated: ${manifest.generatedAt}`);

  // Step 2: Extract features
  console.log('\n🔍 Extracting feature codes from metadata...');
  const features = extractFeatures(manifest);
  console.log(`   ✅ Found ${features.size} unique features:\n`);

  for (const [code, info] of features) {
    console.log(`      • ${code} (${info.blueprintCount} pages in ${info.module})`);
  }

  if (features.size === 0) {
    console.log('\n⚠️  No features found in metadata.');
    console.log('   Make sure metadata XML files have featureCode attributes.');
    process.exit(0);
  }

  // Step 3: Seed features
  const { errorCount } = await seedFeatures(features, supabaseUrl, supabaseKey);

  if (errorCount > 0) {
    console.log('\n⚠️  Some features failed to seed. Check errors above.');
    process.exit(1);
  }

  // Step 4: Map to bundles
  await mapFeaturesToBundles(supabaseUrl, supabaseKey);

  console.log('\n✅ Feature seeding complete!');
  console.log('━'.repeat(50));
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
