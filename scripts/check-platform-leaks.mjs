import fs from 'fs';
import path from 'path';

const FORBIDDEN_TOKENS = [
  'localStorage',
  'navigator.',
  'window.open',
  'document.',
  'indexedDB',
  'navigator.clipboard',
  '@tauri-apps/api',
  'window.__TAURI_',
  '__TAURI_INTERNALS__',
  'AndroidBridge'
];

const ROOT_SRC = path.resolve('src');
const EXCLUDED_DIR = path.resolve('src/adapters');

let totalViolations = 0;
let filesScanned = 0;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (fullPath === EXCLUDED_DIR) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      filesScanned++;
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const token of FORBIDDEN_TOKENS) {
      if (line.includes(token)) {
        console.error(
          `\x1b[31m[PLATFORM LEAK]\x1b[0m ${path.relative(process.cwd(), filePath)}:${index + 1}`
        );
        console.error(`  Found forbidden token: "\x1b[33m${token}\x1b[0m"`);
        console.error(`  Line: ${line.trim()}`);
        totalViolations++;
      }
    }
  });
}

console.log('🔍 Checking for platform leaks outside src/adapters/ ...');
scanDirectory(ROOT_SRC);

if (totalViolations > 0) {
  console.error(`\n❌ Failed with ${totalViolations} platform leak violation(s) across ${filesScanned} files scanned.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✔ Clean!\x1b[0m Scanned ${filesScanned} files. Zero platform leaks found outside src/adapters/.`);
  process.exit(0);
}
