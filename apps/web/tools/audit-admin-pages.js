/**
 * Admin Page Security Audit Script
 *
 * Scans all admin pages and checks for ProtectedPage usage
 * Generates a report of unprotected pages that need security updates
 *
 * Usage: node tools/audit-admin-pages.js
 */

const fs = require('fs');
const path = require('path');

const ADMIN_DIR = path.join(__dirname, '..', 'src', 'app', 'admin');
const PROTECTED_COMPONENT = 'ProtectedPage';

// Page categories and their required protection
const PAGE_CATEGORIES = {
  superAdmin: {
    pattern: /(licensing|menu-builder)/,
    protection: 'Gate.superAdminOnly()',
    requireTenant: false,
  },
  members: {
    pattern: /members/,
    protection: "Gate.withPermission(['members:view', 'members:edit'], 'any')",
    requireTenant: true,
  },
  finance: {
    pattern: /(financial|expenses)/,
    protection: "Gate.withPermission('finance:read')",
    requireTenant: true,
  },
  reports: {
    pattern: /reports/,
    protection: "Gate.withPermission('reports:read')",
    requireTenant: true,
  },
  rbac: {
    pattern: /(rbac|security)/,
    protection: "Gate.withPermission(['rbac:assign', 'rbac:roles_edit'], 'any')",
    requireTenant: true,
  },
  settings: {
    pattern: /settings/,
    protection: "CompositeAccessGate([...])",
    requireTenant: true,
  },
  general: {
    pattern: /.*/,
    protection: 'Gate.authenticated()',
    requireTenant: true,
  },
};

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

function fileContainsProtectedComponent(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(PROTECTED_COMPONENT);
}

function findProtectingLayout(filePath) {
  let currentDir = path.dirname(filePath);

  while (currentDir.startsWith(ADMIN_DIR)) {
    const layoutPath = path.join(currentDir, 'layout.tsx');
    if (fs.existsSync(layoutPath) && fileContainsProtectedComponent(layoutPath)) {
      return layoutPath;
    }

    if (currentDir === ADMIN_DIR) {
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

function getProtectionSource(filePath) {
  if (fileContainsProtectedComponent(filePath)) {
    return { type: 'page', sourcePath: filePath };
  }

  const layoutPath = findProtectingLayout(filePath);
  if (layoutPath) {
    return { type: 'layout', sourcePath: layoutPath };
  }

  return null;
}

function categorizePage(filePath) {
  const relativePath = path.relative(ADMIN_DIR, filePath);

  for (const [category, config] of Object.entries(PAGE_CATEGORIES)) {
    if (config.pattern.test(relativePath)) {
      return { category, ...config };
    }
  }

  return { category: 'unknown', protection: 'unknown', requireTenant: true };
}

function generateReport() {
  console.log('dY"? Auditing Admin Pages for Security...\n');

  const pageFiles = findPageFiles(ADMIN_DIR);
  const results = {
    protected: [],
    unprotected: [],
    total: pageFiles.length,
  };

  pageFiles.forEach(filePath => {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    const protection = getProtectionSource(filePath);
    const category = categorizePage(filePath);

    const pageInfo = {
      path: relativePath,
      route: relativePath
        .replace(/src\\app/, '')
        .replace(/\\page\\.tsx$/, '')
        .replace(/\\\\/g, '/')
        .replace(/^/, '/'),
      ...category,
      protectionSource: protection,
    };

    if (protection) {
      results.protected.push(pageInfo);
    } else {
      results.unprotected.push(pageInfo);
    }
  });

  console.log('dY"S Summary:');
  console.log(`   Total pages: ${results.total}`);
  console.log(`   Protected: ${results.protected.length} (${Math.round((results.protected.length / results.total) * 100)}%)`);
  console.log(`   Unprotected: ${results.unprotected.length} (${Math.round((results.unprotected.length / results.total) * 100)}%)\n`);

  if (results.unprotected.length > 0) {
    console.log('�?O UNPROTECTED PAGES (SECURITY RISK):');
    console.log('�"?'.repeat(80));

    const grouped = {};
    results.unprotected.forEach(page => {
      if (!grouped[page.category]) {
        grouped[page.category] = [];
      }
      grouped[page.category].push(page);
    });

    Object.entries(grouped).forEach(([category, pages]) => {
      console.log(`\ndY"' ${category.toUpperCase()}`);
      pages.forEach(page => {
        console.log(`   Route: ${page.route}`);
        console.log(`   File:  ${page.path}`);
        console.log(`   Fix:   Wrap with <ProtectedPage gate={${page.protection}} ...>`);
        console.log();
      });
    });

    console.log('�"?'.repeat(80));
    console.log(`\n�s��,?  ${results.unprotected.length} pages need protection!`);
    console.log('\ndY"- See ADMIN_PAGE_SECURITY_GUIDE.md for protection examples\n');
  } else {
    console.log('�o. All admin pages are protected!\n');
  }

  if (process.argv.includes('--verbose') && results.protected.length > 0) {
    console.log('\n�o. PROTECTED PAGES:');
    console.log('�"?'.repeat(80));
    results.protected.forEach(page => {
      const source = page.protectionSource?.type === 'layout'
        ? `layout (${path.relative(path.join(__dirname, '..'), page.protectionSource.sourcePath)})`
        : 'page';
      console.log(`   ${page.route} [protected via ${source}]`);
    });
    console.log();
  }

  return results.unprotected.length > 0 ? 1 : 0;
}

try {
  const exitCode = generateReport();
  process.exit(exitCode);
} catch (error) {
  console.error('�?O Error running audit:', error.message);
  process.exit(1);
}
