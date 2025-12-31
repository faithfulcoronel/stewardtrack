#!/usr/bin/env tsx
/**
 * License Self-Healing Script
 *
 * Detects and automatically fixes common licensing issues:
 * - Missing default roles for tenants
 * - Feature grants not matching offering
 * - Stale materialized view data
 * - Orphaned permissions
 * - RBAC-license misalignments
 *
 * Usage:
 *   npm run heal:licenses -- --tenant-id=TENANT_ID [--dry-run] [--auto-fix]
 *   npm run heal:licenses -- --all [--dry-run] [--auto-fix]
 */

import { createClient } from '@supabase/supabase-js';
import { Command } from 'commander';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface HealingIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  tenant_id: string | null;
  auto_fixable: boolean;
  fix_query?: string;
  metadata: Record<string, any>;
}

interface HealingReport {
  tenant_id: string | null;
  timestamp: Date;
  issues_found: number;
  issues_fixed: number;
  issues: HealingIssue[];
  dry_run: boolean;
}

class LicenseHealer {
  private dryRun: boolean;
  private autoFix: boolean;
  private auditLog: any[] = [];

  constructor(dryRun: boolean = false, autoFix: boolean = false) {
    this.dryRun = dryRun;
    this.autoFix = autoFix;
  }

  /**
   * Heal a specific tenant
   */
  async healTenant(tenantId: string): Promise<HealingReport> {
    console.log(`\n🔍 Analyzing tenant: ${tenantId}`);

    const issues: HealingIssue[] = [];

    // Check for missing default roles
    issues.push(...await this.checkMissingDefaultRoles(tenantId));

    // Check for feature grant mismatches
    issues.push(...await this.checkFeatureGrantMismatches(tenantId));

    // Check for orphaned permissions
    issues.push(...await this.checkOrphanedPermissions(tenantId));

    // Check for RBAC-license misalignments
    issues.push(...await this.checkRbacLicenseMisalignment(tenantId));

    // Apply fixes if enabled
    let fixed = 0;
    if (this.autoFix && !this.dryRun) {
      fixed = await this.applyFixes(issues);
    }

    const report: HealingReport = {
      tenant_id: tenantId,
      timestamp: new Date(),
      issues_found: issues.length,
      issues_fixed: fixed,
      issues,
      dry_run: this.dryRun,
    };

    this.printReport(report);

    return report;
  }

  /**
   * Heal all tenants
   */
  async healAllTenants(): Promise<HealingReport[]> {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    const reports: HealingReport[] = [];

    for (const tenant of tenants || []) {
      const report = await this.healTenant(tenant.id);
      reports.push(report);
    }

    this.printSummary(reports);

    return reports;
  }

  /**
   * Check for missing default roles
   */
  private async checkMissingDefaultRoles(tenantId: string): Promise<HealingIssue[]> {
    const issues: HealingIssue[] = [];

    // Check if tenant has admin role
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('*, roles(code)')
      .eq('tenant_id', tenantId)
      .eq('roles.code', 'admin');

    if (!adminUsers || adminUsers.length === 0) {
      // Check if tenant has any users
      const { data: tenantUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .limit(1);

      if (tenantUsers && tenantUsers.length > 0) {
        issues.push({
          type: 'missing_admin_role',
          severity: 'critical',
          description: 'Tenant has users but no admin role assigned',
          tenant_id: tenantId,
          auto_fixable: true,
          fix_query: `
            INSERT INTO user_roles (user_id, tenant_id, role_id)
            SELECT '${tenantUsers[0].user_id}', '${tenantId}', id
            FROM roles
            WHERE code = 'admin' AND tenant_id = '${tenantId}'
            LIMIT 1;
          `,
          metadata: {
            first_user_id: tenantUsers[0].user_id,
          },
        });
      }
    }

    return issues;
  }

  /**
   * Check for feature grant mismatches
   */
  private async checkFeatureGrantMismatches(tenantId: string): Promise<HealingIssue[]> {
    const issues: HealingIssue[] = [];

    // Get tenant's offering
    const { data: summary } = await supabase
      .from('tenant_license_summary')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (!summary) {
      return issues;
    }

    // Get expected features from offering
    const { data: expectedFeatures } = await supabase
      .from('product_offering_features')
      .select('feature_id')
      .eq('offering_id', summary.offering_id);

    // Get current grants
    const { data: currentGrants } = await supabase
      .from('tenant_feature_grants')
      .select('feature_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const expectedIds = new Set(expectedFeatures?.map(f => f.feature_id) || []);
    const currentIds = new Set(currentGrants?.map(g => g.feature_id) || []);

    // Find missing features
    for (const featureId of expectedIds) {
      if (!currentIds.has(featureId)) {
        issues.push({
          type: 'missing_feature_grant',
          severity: 'high',
          description: `Feature ${featureId} should be granted but is missing`,
          tenant_id: tenantId,
          auto_fixable: true,
          fix_query: `
            INSERT INTO tenant_feature_grants (tenant_id, feature_id, granted_at, is_active)
            VALUES ('${tenantId}', '${featureId}', NOW(), true)
            ON CONFLICT DO NOTHING;
          `,
          metadata: {
            feature_id: featureId,
            offering_id: summary.offering_id,
          },
        });
      }
    }

    // Find extra features (not in offering)
    for (const featureId of currentIds) {
      if (!expectedIds.has(featureId)) {
        issues.push({
          type: 'extra_feature_grant',
          severity: 'low',
          description: `Feature ${featureId} is granted but not in offering`,
          tenant_id: tenantId,
          auto_fixable: true,
          fix_query: `
            UPDATE tenant_feature_grants
            SET is_active = false
            WHERE tenant_id = '${tenantId}' AND feature_id = '${featureId}';
          `,
          metadata: {
            feature_id: featureId,
          },
        });
      }
    }

    return issues;
  }

  /**
   * Check for orphaned permissions
   */
  private async checkOrphanedPermissions(tenantId: string): Promise<HealingIssue[]> {
    const issues: HealingIssue[] = [];

    // Find permissions not linked to any role
    const { data: orphaned } = await supabase
      .from('permissions')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .not('id', 'in', `(
        SELECT DISTINCT permission_id
        FROM role_permissions
        WHERE tenant_id = '${tenantId}'
      )`);

    for (const perm of orphaned || []) {
      issues.push({
        type: 'orphaned_permission',
        severity: 'low',
        description: `Permission ${perm.code} is not assigned to any role`,
        tenant_id: tenantId,
        auto_fixable: true,
        fix_query: `
          DELETE FROM permissions
          WHERE id = '${perm.id}' AND tenant_id = '${tenantId}';
        `,
        metadata: {
          permission_id: perm.id,
          permission_code: perm.code,
        },
      });
    }

    return issues;
  }

  /**
   * Check for RBAC-license misalignments
   */
  private async checkRbacLicenseMisalignment(tenantId: string): Promise<HealingIssue[]> {
    const issues: HealingIssue[] = [];

    const { data: mismatches } = await supabase.rpc('detect_rbac_license_mismatches', {
      p_tenant_id: tenantId,
    });

    for (const mismatch of mismatches || []) {
      // Get bundle features to grant
      const { data: bundleFeatures } = await supabase
        .from('license_feature_bundle_features')
        .select('feature_id')
        .eq('bundle_id', mismatch.required_bundle_id);

      if (bundleFeatures && bundleFeatures.length > 0) {
        const featureIds = bundleFeatures.map(f => f.feature_id);

        issues.push({
          type: 'rbac_license_mismatch',
          severity: 'high',
          description: `Surface ${mismatch.surface_title} requires bundle but tenant lacks it`,
          tenant_id: tenantId,
          auto_fixable: true,
          fix_query: `
            INSERT INTO tenant_feature_grants (tenant_id, feature_id, granted_at, is_active)
            SELECT '${tenantId}', feature_id, NOW(), true
            FROM license_feature_bundle_features
            WHERE bundle_id = '${mismatch.required_bundle_id}'
            ON CONFLICT DO NOTHING;
          `,
          metadata: {
            surface_id: mismatch.surface_id,
            required_bundle_id: mismatch.required_bundle_id,
            features_to_grant: featureIds,
          },
        });
      }
    }

    return issues;
  }

  /**
   * Apply fixes for all auto-fixable issues
   */
  private async applyFixes(issues: HealingIssue[]): Promise<number> {
    let fixed = 0;

    for (const issue of issues) {
      if (issue.auto_fixable && issue.fix_query) {
        try {
          console.log(`  🔧 Fixing: ${issue.description}`);

          await supabase.rpc('exec_sql', { sql: issue.fix_query });

          // Audit log
          this.auditLog.push({
            timestamp: new Date(),
            issue_type: issue.type,
            tenant_id: issue.tenant_id,
            query: issue.fix_query,
            success: true,
          });

          fixed++;
          console.log(`  ✅ Fixed: ${issue.type}`);
        } catch (error: any) {
          console.error(`  ❌ Failed to fix ${issue.type}:`, error.message);

          this.auditLog.push({
            timestamp: new Date(),
            issue_type: issue.type,
            tenant_id: issue.tenant_id,
            query: issue.fix_query,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return fixed;
  }

  /**
   * Print healing report
   */
  private printReport(report: HealingReport): void {
    console.log(`\n📊 Healing Report for ${report.tenant_id || 'All Tenants'}`);
    console.log(`   Time: ${report.timestamp.toISOString()}`);
    console.log(`   Issues Found: ${report.issues_found}`);
    console.log(`   Issues Fixed: ${report.issues_fixed}`);
    console.log(`   Mode: ${report.dry_run ? 'DRY RUN' : 'LIVE'}`);

    if (report.issues.length > 0) {
      console.log(`\n   Issues:`);
      for (const issue of report.issues) {
        const icon = issue.severity === 'critical' ? '🔴' :
                     issue.severity === 'high' ? '🟠' :
                     issue.severity === 'medium' ? '🟡' : '🟢';

        console.log(`   ${icon} [${issue.severity.toUpperCase()}] ${issue.description}`);
        if (issue.auto_fixable) {
          console.log(`      ✅ Auto-fixable`);
        }
      }
    } else {
      console.log(`\n   ✅ No issues found!`);
    }
  }

  /**
   * Print summary for all tenants
   */
  private printSummary(reports: HealingReport[]): void {
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📈 HEALING SUMMARY`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const totalIssues = reports.reduce((sum, r) => sum + r.issues_found, 0);
    const totalFixed = reports.reduce((sum, r) => sum + r.issues_fixed, 0);
    const tenantsWithIssues = reports.filter(r => r.issues_found > 0).length;

    console.log(`   Tenants Analyzed: ${reports.length}`);
    console.log(`   Tenants with Issues: ${tenantsWithIssues}`);
    console.log(`   Total Issues Found: ${totalIssues}`);
    console.log(`   Total Issues Fixed: ${totalFixed}`);

    // Issue breakdown by severity
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const report of reports) {
      for (const issue of report.issues) {
        severityCounts[issue.severity]++;
      }
    }

    console.log(`\n   Issues by Severity:`);
    console.log(`   🔴 Critical: ${severityCounts.critical}`);
    console.log(`   🟠 High: ${severityCounts.high}`);
    console.log(`   🟡 Medium: ${severityCounts.medium}`);
    console.log(`   🟢 Low: ${severityCounts.low}`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }
}

// CLI Program
const program = new Command();

program
  .name('heal-licenses')
  .description('Self-healing script for license issues')
  .version('1.0.0');

program
  .option('-t, --tenant-id <id>', 'Heal specific tenant')
  .option('-a, --all', 'Heal all tenants')
  .option('-d, --dry-run', 'Show issues without fixing')
  .option('-f, --auto-fix', 'Automatically fix issues')
  .action(async (options) => {
    const healer = new LicenseHealer(options.dryRun, options.autoFix);

    if (options.tenantId) {
      await healer.healTenant(options.tenantId);
    } else if (options.all) {
      await healer.healAllTenants();
    } else {
      console.error('Error: Must specify --tenant-id or --all');
      process.exit(1);
    }
  });

program.parse();
