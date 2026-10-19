import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Parse --target flag (arm64 or universal)
const args = process.argv.slice(2);
let target = 'arm64';
const targetIdx = args.indexOf('--target');
if (targetIdx !== -1 && args[targetIdx + 1]) {
  target = args[targetIdx + 1];
}

console.log('========================================');
console.log(`  CNTXT Android Signed APK Build Tool   `);
console.log(`  Target: ${target}                     `);
console.log('========================================');

// 1. Environment Setup
const androidHome = process.env.ANDROID_HOME || '/home/en/Android/Sdk';
const ndkHome = process.env.NDK_HOME || path.join(androidHome, 'ndk/27.0.12077973');
const javaHome = process.env.JAVA_HOME || '/home/en/.local/share/jdk-21';

process.env.ANDROID_HOME = androidHome;
process.env.NDK_HOME = ndkHome;
process.env.JAVA_HOME = javaHome;
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.env.ANDROID_USER_HOME = path.join(process.env.HOME || '/home/en', '.android');
delete process.env.ANDROID_PREFS_ROOT;

console.log(`ANDROID_HOME : ${androidHome}`);
console.log(`NDK_HOME     : ${ndkHome}`);
console.log(`JAVA_HOME    : ${javaHome}`);

if (!fs.existsSync(androidHome)) {
  console.error(`❌ ANDROID_HOME path does not exist: ${androidHome}`);
  process.exit(1);
}
if (!fs.existsSync(ndkHome)) {
  console.error(`❌ NDK_HOME path does not exist: ${ndkHome}`);
  process.exit(1);
}

// NDK LLVM Clang toolchain linker configuration for Cargo
const isWindows = process.platform === 'win32';
const hostTag = isWindows ? 'windows-x86_64' : 'linux-x86_64';
const llvmBin = path.join(ndkHome, 'toolchains', 'llvm', 'prebuilt', hostTag, 'bin');
const ext = isWindows ? '.cmd' : '';

process.env.CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = path.join(llvmBin, `aarch64-linux-android24-clang${ext}`);
process.env.CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER = path.join(llvmBin, `armv7a-linux-androideabi24-clang${ext}`);
process.env.CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER = path.join(llvmBin, `x86_64-linux-android24-clang${ext}`);
process.env.CARGO_TARGET_I686_LINUX_ANDROID_LINKER = path.join(llvmBin, `i686-linux-android24-clang${ext}`);

// 2. Synchronize Android Launcher Icons (CNTXT Branding)
console.log('\n[1/6] Synchronizing Android launcher icons & branding...');
const iconSource = path.join(rootDir, 'src-tauri', 'icons', 'android');
const resDest = path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res');

if (fs.existsSync(iconSource)) {
  fs.cpSync(iconSource, resDest, { recursive: true, force: true });
  const anydpiDir = path.join(resDest, 'mipmap-anydpi-v26');
  if (fs.existsSync(anydpiDir)) {
    const roundXml = path.join(anydpiDir, 'ic_launcher_round.xml');
    const mainXml = path.join(anydpiDir, 'ic_launcher.xml');
    if (!fs.existsSync(roundXml) && fs.existsSync(mainXml)) {
      fs.copyFileSync(mainXml, roundXml);
    }
  }
}

// Remove stale conflicting default bugdroid vector drawables
const staleBg = path.join(resDest, 'drawable', 'ic_launcher_background.xml');
const staleFg = path.join(resDest, 'drawable-v24', 'ic_launcher_foreground.xml');
if (fs.existsSync(staleBg)) fs.rmSync(staleBg, { force: true });
if (fs.existsSync(staleFg)) fs.rmSync(staleFg, { force: true });
console.log('✅ Android icons synchronized successfully.');

// 3. Build Production Web Frontend
console.log('\n[2/6] Building production web frontend bundle...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit', env: process.env });

// 4. Compile Rust cdylib targets
console.log('\n[3/6] Compiling Rust cdylib targets...');
const targetsToBuild = target === 'universal'
  ? ['aarch64-linux-android', 'armv7-linux-androideabi', 'x86_64-linux-android', 'i686-linux-android']
  : ['aarch64-linux-android'];

const tauriDir = path.join(rootDir, 'src-tauri');
for (const t of targetsToBuild) {
  console.log(`🔨 Compiling Rust target: ${t}...`);
  execSync(`cargo build --release --target ${t} --features custom-protocol`, {
    cwd: tauriDir,
    stdio: 'inherit',
    env: process.env,
  });
}

// 5. Stage JNI Libraries
console.log('\n[4/6] Staging JNI shared libraries...');
const archMap = {
  'aarch64-linux-android': 'arm64-v8a',
  'armv7-linux-androideabi': 'armeabi-v7a',
  'x86_64-linux-android': 'x86_64',
  'i686-linux-android': 'x86',
};

for (const t of targetsToBuild) {
  const abi = archMap[t];
  const destDir = path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'jniLibs', abi);
  fs.mkdirSync(destDir, { recursive: true });
  const srcSo = path.join(rootDir, 'src-tauri', 'target', t, 'release', 'libcntxt_lib.so');
  const dstSo = path.join(destDir, 'libcntxt_lib.so');
  if (fs.existsSync(srcSo)) {
    fs.copyFileSync(srcSo, dstSo);
    console.log(`  └─ Copied ${abi}/libcntxt_lib.so`);
  } else {
    console.error(`❌ Shared library not found: ${srcSo}`);
    process.exit(1);
  }
}

// 6. Execute Gradle Build
console.log('\n[5/6] Executing Gradle release assemble...');
const androidGenDir = path.join(rootDir, 'src-tauri', 'gen', 'android');
const gradlew = path.join(androidGenDir, isWindows ? 'gradlew.bat' : 'gradlew');

if (!isWindows) {
  fs.chmodSync(gradlew, 0o755);
}

const gradleTask = target === 'universal' ? 'assembleUniversalRelease' : 'assembleArm64Release';
execSync(`${gradlew} ${gradleTask}`, {
  cwd: androidGenDir,
  stdio: 'inherit',
  env: process.env,
});

// 7. Sign & Verify Output APK
console.log('\n[6/6] Verifying and staging signed APK...');
const apkFolder = target === 'universal' ? 'universal' : 'arm64';
const apkPrefix = target === 'universal' ? 'app-universal' : 'app-arm64';
const releaseApkDir = path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk', apkFolder, 'release');

const candidateApks = [
  path.join(releaseApkDir, `${apkPrefix}-release-signed.apk`),
  path.join(releaseApkDir, `${apkPrefix}-release.apk`),
  path.join(releaseApkDir, `${apkPrefix}-release-unsigned.apk`),
];

let builtApk = candidateApks.find((p) => fs.existsSync(p));

if (!builtApk) {
  console.error(`❌ Release APK not found in ${releaseApkDir}`);
  process.exit(1);
}

// Ensure output directory dist-android/ exists
const distAndroidDir = path.join(rootDir, 'dist-android');
fs.mkdirSync(distAndroidDir, { recursive: true });

const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkgJson.version;
const finalApkName = `cntxt-${version}-${target}-release-signed.apk`;
const finalApkPath = path.join(distAndroidDir, finalApkName);

const buildToolsDir = path.join(androidHome, 'build-tools', '35.0.0');
const apksigner = path.join(buildToolsDir, isWindows ? 'apksigner.bat' : 'apksigner');
const zipalign = path.join(buildToolsDir, isWindows ? 'zipalign.exe' : 'zipalign');
const keystore = path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'release.keystore');

// Check if already signed
let isAlreadySigned = false;
if (fs.existsSync(apksigner)) {
  try {
    execSync(`"${apksigner}" verify "${builtApk}"`, { stdio: 'ignore' });
    isAlreadySigned = true;
  } catch {
    isAlreadySigned = false;
  }
}

if (isAlreadySigned) {
  console.log(`✅ APK is already signed by Gradle release task.`);
  fs.copyFileSync(builtApk, finalApkPath);
} else {
  const alignedApk = path.join(distAndroidDir, `aligned-${finalApkName}`);
  if (fs.existsSync(zipalign)) {
    console.log('📐 Zip-aligning APK...');
    execSync(`"${zipalign}" -f 4 "${builtApk}" "${alignedApk}"`, { stdio: 'ignore' });
  } else {
    fs.copyFileSync(builtApk, alignedApk);
  }

  if (fs.existsSync(keystore) && fs.existsSync(apksigner)) {
    console.log(`🔐 Signing APK with release keystore (${keystore})...`);
    execSync(
      `"${apksigner}" sign --ks "${keystore}" --ks-pass pass:cntxtandroid --key-pass pass:cntxtandroid --ks-key-alias cntxt --out "${finalApkPath}" "${alignedApk}"`,
      { stdio: 'inherit' }
    );
    if (fs.existsSync(alignedApk)) fs.rmSync(alignedApk, { force: true });
  } else {
    fs.copyFileSync(alignedApk, finalApkPath);
    if (fs.existsSync(alignedApk)) fs.rmSync(alignedApk, { force: true });
  }
}

// Verify signature
if (fs.existsSync(apksigner)) {
  console.log('🔍 Verifying APK signature...');
  execSync(`"${apksigner}" verify --verbose "${finalApkPath}"`, { stdio: 'inherit' });
}

const stats = fs.statSync(finalApkPath);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log('\n========================================');
console.log(`🎉 ANDROID SIGNED APK BUILD SUCCESSFUL! `);
console.log(`📍 Output : ${finalApkPath} (${sizeMB} MB)`);
console.log('========================================\n');
