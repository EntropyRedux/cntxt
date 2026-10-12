import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

console.log(`🚀 Starting clean portable release build (${process.platform})...`);

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

// 2c. Clean stale Cargo fingerprints to guarantee 100% fresh compilation of cntxt binary
const targetFingerprintDir = path.join(rootDir, 'src-tauri', 'target', 'release', '.fingerprint');
if (fs.existsSync(targetFingerprintDir)) {
  console.log('🧹 Purging stale cntxt Cargo fingerprints...');
  const entries = fs.readdirSync(targetFingerprintDir);
  for (const entry of entries) {
    if (entry.startsWith('cntxt-')) {
      const fullPath = path.join(targetFingerprintDir, entry);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } catch (err) {
        console.warn(`Could not remove fingerprint ${entry}: ${err.message}`);
      }
    }
  }
}


// 3. Build Tauri release binary with single-threaded cargo gate (CARGO_BUILD_JOBS=1)
// Note: Tauri CLI automatically executes beforeBuildCommand ("npm run build") to compile frontend assets
console.log('🦀 Compiling native release executable and bundles (CARGO_BUILD_JOBS=1)...');
process.env.CARGO_BUILD_JOBS = '1';
execSync('npx @tauri-apps/cli build', { cwd: rootDir, stdio: 'inherit', env: process.env });

// 5. Copy release binary to dist-portable/
const binaryFilename = isWindows ? 'cntxt.exe' : 'cntxt';
const releaseBinary = path.join(rootDir, 'src-tauri', 'target', 'release', binaryFilename);
const portableDir = path.join(rootDir, 'dist-portable');

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

if (!fs.existsSync(portableDir)) {
  fs.mkdirSync(portableDir, { recursive: true });
}

if (fs.existsSync(releaseBinary)) {
  try {
    if (isWindows) {
      execSync('taskkill /F /IM CNTXT-portable.exe /T 2>nul || exit 0', { stdio: 'ignore' });
      execSync(`taskkill /F /IM CNTXT_${version}_portable.exe /T 2>nul || exit 0`, { stdio: 'ignore' });
    } else if (isLinux) {
      execSync('pkill -f "cntxt" 2>/dev/null || true', { stdio: 'ignore' });
    }
  } catch {
    // Ignore if not running
  }

  const targetName = isWindows ? `CNTXT_${version}_portable.exe` : 'cntxt-portable';
  const targetPath = path.join(portableDir, targetName);

  let copied = false;
  try {
    fs.copyFileSync(releaseBinary, targetPath);
    copied = true;
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`⚠️ Warning: ${targetName} is currently running and locked by the OS.`);
      console.warn(`   Close the running instance to update: ${targetPath}`);
    } else {
      throw err;
    }
  }

  if (isWindows) {
    const unversionedPath = path.join(portableDir, 'CNTXT-portable.exe');
    try {
      fs.copyFileSync(releaseBinary, unversionedPath);
    } catch (e) {
      console.warn(`Could not update CNTXT-portable.exe: ${e.message}`);
    }
  }
  if (!isWindows && copied) {
    fs.chmodSync(targetPath, 0o755);
  }

  if (fs.existsSync(targetPath)) {
    const stats = fs.statSync(targetPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Portable build complete!`);
    console.log(`📍 Output: ${targetPath} (${sizeMB} MB)`);
  }
} else {
  console.error(`⏸ Build finished, but ${releaseBinary} was not found.`);
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
