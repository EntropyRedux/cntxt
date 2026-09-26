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

// 2b. Clean stale bundle artifacts
const bundleDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle');
if (fs.existsSync(bundleDir)) {
  console.log('🧹 Purging stale installer bundles...');
  fs.rmSync(bundleDir, { recursive: true, force: true });
}

// 3. Build frontend bundle with Vite
console.log('📦 Compiling frontend assets with Vite...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 4. Build Tauri release binary with single-threaded cargo gate (CARGO_BUILD_JOBS=1)
console.log('🦀 Compiling native release executable (CARGO_BUILD_JOBS=1)...');
process.env.CARGO_BUILD_JOBS = '1';
execSync('npx @tauri-apps/cli build', { cwd: rootDir, stdio: 'inherit', env: process.env });

// 5. Copy release binary to dist-portable/CNTXT_${version}_portable.exe
const releaseExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'cntxt.exe');
const portableDir = path.join(rootDir, 'dist-portable');

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;
const versionedPortableExe = path.join(portableDir, `CNTXT_${version}_portable.exe`);

if (!fs.existsSync(portableDir)) {
  fs.mkdirSync(portableDir, { recursive: true });
}

if (fs.existsSync(releaseExe)) {
  fs.copyFileSync(releaseExe, versionedPortableExe);
  const stats = fs.statSync(versionedPortableExe);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Portable build complete!`);
  console.log(`📍 Output: ${versionedPortableExe} (${sizeMB} MB)`);
} else {
  console.error(`❌ Build finished, but ${releaseExe} was not found.`);
  process.exit(1);
}

// 6. Copy versioned installer bundles to dist-installer/
const distInstallerDir = path.join(rootDir, 'dist-installer');
if (!fs.existsSync(distInstallerDir)) {
  fs.mkdirSync(distInstallerDir, { recursive: true });
}

const bundlesToCopy = [
  {
    src: path.join(bundleDir, 'nsis', `CNTXT_${version}_x64-setup.exe`),
    label: 'NSIS installer',
  },
  {
    src: path.join(bundleDir, 'msi', `CNTXT_${version}_x64_en-US.msi`),
    label: 'MSI installer',
  },
];

let copiedCount = 0;
for (const { src, label } of bundlesToCopy) {
  if (fs.existsSync(src)) {
    const dest = path.join(distInstallerDir, path.basename(src));
    fs.copyFileSync(src, dest);
    const sizeMB = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(`📦 ${label} → dist-installer/${path.basename(dest)} (${sizeMB} MB)`);
    copiedCount++;
  } else {
    console.warn(`⚠️  ${label} not found at expected path: ${src}`);
  }
}

if (copiedCount > 0) {
  console.log(`✅ ${copiedCount} installer(s) copied to dist-installer/`);
}
