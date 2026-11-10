import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN_PATTERNS = [
  { regex: /\bml-[\w\d\[\]\.\-]+/, name: 'ml-* (use ms-* instead)' },
  { regex: /\bmr-[\w\d\[\]\.\-]+/, name: 'mr-* (use me-* instead)' },
  { regex: /\bpl-[\w\d\[\]\.\-]+/, name: 'pl-* (use ps-* instead)' },
  { regex: /\bpr-[\w\d\[\]\.\-]+/, name: 'pr-* (use pe-* instead)' },
  { regex: /\bleft-[\w\d\[\]\.\-]+/, name: 'left-* (use start-* instead)' },
  { regex: /\bright-[\w\d\[\]\.\-]+/, name: 'right-* (use end-* instead)' },
  { regex: /\btext-left\b/, name: 'text-left (use text-start instead)' },
  { regex: /\btext-right\b/, name: 'text-right (use text-end instead)' },
  { regex: /\bborder-l\b/, name: 'border-l (use border-s instead)' },
  { regex: /\bborder-r\b/, name: 'border-r (use border-e instead)' },
  { regex: /\brounded-l-[\w\d\[\]\.\-]+/, name: 'rounded-l-* (use rounded-s-* instead)' },
  { regex: /\brounded-r-[\w\d\[\]\.\-]+/, name: 'rounded-r-* (use rounded-e-* instead)' }
];

const SCAN_DIRS = ['src', 'styles'];
let violationCount = 0;

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath);
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name) && !/\.test\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip comment lines (tests have no markup and are skipped as whole files above).
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        // A trailing `// note` is prose, not markup ("right-to-left" must not count as `right-*`).
        const code = line.replace(/\s\/\/.*$/, '');

        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.regex.test(code)) {
            console.error(`\x1b[31m[DIRECTION VIOLATION]\x1b[0m ${fullPath}:${index + 1}`);
            console.error(`   Found: ${pattern.name}`);
            console.error(`   Line: "${line.trim()}"\n`);
            violationCount++;
          }
        }
      });
    }
  }
}

console.log('🔍 Checking for physical CSS direction classes...');
SCAN_DIRS.forEach(scanDirectory);

if (violationCount > 0) {
  console.error(`\x1b[31m❌ FAILED: Found ${violationCount} physical direction violations. Arabic RTL requires CSS logical properties.\x1b[0m`);
  process.exit(1);
} else {
  console.log('\x1b[32m✅ PASSED: Zero physical CSS direction classes found. RTL compliance verified.\x1b[0m');
  process.exit(0);
}
