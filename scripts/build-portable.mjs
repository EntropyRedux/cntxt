import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting clean portable release build...');

// 1. Clean dist/
const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  console.log('🧹 Purging dist/ directory...');
  fs.rmSync(distDir, { recursive: true, force: true });
}

// 2. Clean stale Tauri codegen assets cache to guarantee fresh embedded frontend
const targetReleaseBuildDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'build');
if (fs.existsSync(targetReleaseBuildDir)) {
  console.log('🧹 Purging stale Tauri codegen assets cache...');
  const entries = fs.readdirSync(targetReleaseBuildDir);
  for (const entry of entries) {
    if (entry.startsWith('cntxt-')) {
      const fullPath = path.join(targetReleaseBuildDir, entry);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } catch (err) {
        console.warn(`Could not remove ${entry}: ${err.message}`);
      }
    }
  }
}

// 3. Build frontend bundle with Vite
console.log('📦 Compiling frontend assets with Vite...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 4. Build Tauri release binary with single-threaded cargo gate (CARGO_BUILD_JOBS=1)
console.log('🦀 Compiling native release executable (CARGO_BUILD_JOBS=1)...');
process.env.CARGO_BUILD_JOBS = '1';
execSync('npx @tauri-apps/cli build', { cwd: rootDir, stdio: 'inherit', env: process.env });

// 5. Copy release binary to dist-portable/CNTXT-portable.exe
const releaseExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'cntxt.exe');
const portableDir = path.join(rootDir, 'dist-portable');
const portableExe = path.join(portableDir, 'CNTXT-portable.exe');

if (!fs.existsSync(portableDir)) {
  fs.mkdirSync(portableDir, { recursive: true });
}

if (fs.existsSync(releaseExe)) {
  // If an old test instance is currently running, gracefully stop it to release the file lock
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM CNTXT-portable.exe /T 2>nul || exit 0', { stdio: 'ignore' });
    }
  } catch {
    // Ignore if not running
  }

  fs.copyFileSync(releaseExe, portableExe);
  const stats = fs.statSync(portableExe);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Portable build complete!`);
  console.log(`📍 Output: ${portableExe} (${sizeMB} MB)`);
} else {
  console.error(`❌ Build finished, but ${releaseExe} was not found.`);
  process.exit(1);
}

