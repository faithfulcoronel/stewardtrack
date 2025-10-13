/**
 * Admin Page Security Audit Script
 *
 * Scans all admin pages and checks for ProtectedAdminPage usage
 * Generates a report of unprotected pages that need security updates
 *
 * Usage: node tools/audit-admin-pages.js
 */

const fs = require('fs');
const path = require('path');

const ADMIN_DIR = path.join(__dirname, '..', 'src', 'app', 'admin');
const PROTECTED_COMPONENT = 'ProtectedAdminPage';

// Page categories and their required protection
const PAGE_CATEGORIES = {
  superAdmin: {
    pattern: /(licensing|menu-builder)/,
    protection: 'superAdminOnly',
    requireTenant: false,
  },
  members: {
    pattern: /members/,
    protection: 'permission="members:read"',
    requireTenant: true,
  },
  finance: {
    pattern: /(financial|expenses)/,
    protection: 'permission="finance:read"',
    requireTenant: true,
  },
  reports: {
    pattern: /reports/,
    protection: 'permission="reports:read"',
    requireTenant: true,
  },
  rbac: {
    pattern: /(rbac|security)/,
    protection: 'permission="rbac:manage"',
    requireTenant: true,
  },
  settings: {
    pattern: /settings/,
    protection: 'role="tenant_admin"',
    requireTenant: true,
  },
  general: {
    pattern: /.*/,
    protection: 'authenticated only',
    requireTenant: true,
  },
};

// Find all page.tsx files recursively
function findPageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findPageFiles(filePath, fileList);
    } else if (file === 'page.tsx') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Check if a file uses ProtectedAdminPage
function isPageProtected(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(PROTECTED_COMPONENT);
}

// Determine category for a page
function categorize Page(filePath) {
  const relativePath = path.relative(ADMIN_DIR, filePath);

  for (const [category, config] of Object.entries(PAGE_CATEGORIES)) {
    if (config.pattern.test(relativePath)) {
      return { category, ...config };
    }
  }

  return { category: 'unknown', protection: 'unknown', requireTenant: true };
}

// Generate report
function generateReport() {
  console.log('🔍 Auditing Admin Pages for Security...\n');

  const pageFiles = findPageFiles(ADMIN_DIR);
  const results = {
    protected: [],
    unprotected: [],
    total: pageFiles.length,
  };

  pageFiles.forEach(filePath => {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    const isProtected = isPageProtected(filePath);
    const category = categorizePage(filePath);

    const pageInfo = {
      path: relativePath,
      route: relativePath
        .replace(/src\/app/, '')
        .replace(/\/page\.tsx$/, '')
        .replace(/\\/g, '/')
        .replace(/^/, '/'),
      ...category,
    };

    if (isProtected) {
      results.protected.push(pageInfo);
    } else {
      results.unprotected.push(pageInfo);
    }
  });

  // Print summary
  console.log('📊 Summary:');
  console.log(`   Total pages: ${results.total}`);
  console.log(`   Protected: ${results.protected.length} (${Math.round(results.protected.length / results.total * 100)}%)`);
  console.log(`   Unprotected: ${results.unprotected.length} (${Math.round(results.unprotected.length / results.total * 100)}%)\n`);

  // Print unprotected pages
  if (results.unprotected.length > 0) {
    console.log('❌ UNPROTECTED PAGES (SECURITY RISK):');
    console.log('━'.repeat(80));

    // Group by category
    const grouped = {};
    results.unprotected.forEach(page => {
      if (!grouped[page.category]) {
        grouped[page.category] = [];
      }
      grouped[page.category].push(page);
    });

    Object.entries(grouped).forEach(([category, pages]) => {
      console.log(`\n🔴 ${category.toUpperCase()}`);
      pages.forEach(page => {
        console.log(`   Route: ${page.route}`);
        console.log(`   File:  ${page.path}`);
        console.log(`   Fix:   <ProtectedAdminPage ${page.protection}>`);
        console.log();
      });
    });

    console.log('━'.repeat(80));
    console.log(`\n⚠️  ${results.unprotected.length} pages need protection!`);
    console.log('\n📖 See ADMIN_PAGE_SECURITY_GUIDE.md for protection examples\n');
  } else {
    console.log('✅ All admin pages are protected!\n');
  }

  // Print protected pages (optional, for verification)
  if (process.argv.includes('--verbose') && results.protected.length > 0) {
    console.log('\n✅ PROTECTED PAGES:');
    console.log('━'.repeat(80));
    results.protected.forEach(page => {
      console.log(`   ${page.route}`);
    });
    console.log();
  }

  // Return exit code based on results
  return results.unprotected.length > 0 ? 1 : 0;
}

// Run audit
try {
  const exitCode = generateReport();
  process.exit(exitCode);
} catch (error) {
  console.error('❌ Error running audit:', error.message);
  process.exit(1);
}
