# CNTXT Android Build Automation Script
# Supports both fast arm64 (default for local hardware) and universal target architectures
param(
    [ValidateSet("arm64", "universal")]
    [string]$Target = "arm64"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CNTXT Android APK Build Automation    " -ForegroundColor Cyan
Write-Host "  Target: $Target                       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Environment Setup
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = "C:\Users\mbula\AppData\Local\Android\Sdk"
}
if (-not $env:NDK_HOME) {
    $env:NDK_HOME = "C:\Users\mbula\AppData\Local\Android\Sdk\ndk\27.0.12077973"
}
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
}
$env:NODE_OPTIONS = "--max-old-space-size=4096"

Write-Host "ANDROID_HOME : $env:ANDROID_HOME" -ForegroundColor Gray
Write-Host "NDK_HOME     : $env:NDK_HOME" -ForegroundColor Gray
Write-Host "JAVA_HOME    : $env:JAVA_HOME" -ForegroundColor Gray

if (-not (Test-Path $env:ANDROID_HOME)) {
    Write-Error "ANDROID_HOME path does not exist: $env:ANDROID_HOME"
    exit 1
}
if (-not (Test-Path $env:NDK_HOME)) {
    Write-Error "NDK_HOME path does not exist: $env:NDK_HOME"
    exit 1
}

# Configure NDK Clang Linker for Rust Cargo cross-compilation
$llvmBin = "$env:NDK_HOME\toolchains\llvm\prebuilt\windows-x86_64\bin"
$env:CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = "$llvmBin\aarch64-linux-android24-clang.cmd"
$env:CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER = "$llvmBin\armv7a-linux-androideabi24-clang.cmd"
$env:CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER = "$llvmBin\x86_64-linux-android24-clang.cmd"
$env:CARGO_TARGET_I686_LINUX_ANDROID_LINKER = "$llvmBin\i686-linux-android24-clang.cmd"

# 2. Synchronize Android App Icons (CNTXT branding)
Write-Host "`n[1/5] Synchronizing Android app icons..." -ForegroundColor Yellow
$iconSource = "src-tauri\icons\android"
$resDest = "src-tauri\gen\android\app\src\main\res"
if (Test-Path $iconSource) {
    Copy-Item -Path "$iconSource\*" -Destination $resDest -Recurse -Force
    # Ensure adaptive round icon is present in anydpi-v26
    $anydpiDir = "$resDest\mipmap-anydpi-v26"
    if (Test-Path $anydpiDir) {
        $roundXml = "$anydpiDir\ic_launcher_round.xml"
        if (-not (Test-Path $roundXml)) {
            Copy-Item "$anydpiDir\ic_launcher.xml" -Destination $roundXml -Force
        }
    }
}
# Prune conflicting default bugdroid vector drawables
Remove-Item -Path "$resDest\drawable\ic_launcher_background.xml" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$resDest\drawable-v24\ic_launcher_foreground.xml" -Force -ErrorAction SilentlyContinue

# 3. Build Frontend
Write-Host "`n[2/5] Building production frontend bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# 4. Compile Rust cdylib targets
Push-Location "src-tauri"
$targetsToBuild = if ($Target -eq "universal") {
    @("aarch64-linux-android", "armv7-linux-androideabi", "x86_64-linux-android", "i686-linux-android")
} else {
    @("aarch64-linux-android")
}

foreach ($t in $targetsToBuild) {
    Write-Host "`n[3/5] Compiling Rust cdylib ($t with custom-protocol)..." -ForegroundColor Yellow
    cargo build --release --target $t --features custom-protocol
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Error "Cargo build failed for $t with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}
Pop-Location

# 5. Stage JNI Libraries & Frontend Assets
Write-Host "`n[4/5] Staging JNI libraries and frontend web assets..." -ForegroundColor Yellow
$archMap = @{
    "aarch64-linux-android" = "arm64-v8a"
    "armv7-linux-androideabi" = "armeabi-v7a"
    "x86_64-linux-android" = "x86_64"
    "i686-linux-android" = "x86"
}

foreach ($t in $targetsToBuild) {
    $abi = $archMap[$t]
    $destDir = "src-tauri\gen\android\app\src\main\jniLibs\$abi"
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    $srcSo = "src-tauri\target\$t\release\libcntxt_lib.so"
    Copy-Item $srcSo -Destination "$destDir\libcntxt_lib.so" -Force
}

# Stage production frontend bundle into Android assets directory
$androidAssetsDir = "src-tauri\gen\android\app\src\main\assets"
if (-not (Test-Path $androidAssetsDir)) {
    New-Item -ItemType Directory -Path $androidAssetsDir -Force | Out-Null
}
Copy-Item -Path "dist\*" -Destination $androidAssetsDir -Recurse -Force
Write-Host "Frontend bundle staged to $androidAssetsDir (index.html, assets/)" -ForegroundColor Green

# 6. Gradle Assemble APK
Write-Host "`n[5/5] Assembling Android Release APK via Gradle ($Target)..." -ForegroundColor Yellow
Push-Location "src-tauri\gen\android"
if ($Target -eq "universal") {
    .\gradlew.bat :app:assembleUniversalRelease -x rustBuildUniversalRelease
} else {
    .\gradlew.bat :app:assembleArm64Release -x rustBuildArm64Release
}
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) {
    Write-Error "Gradle build failed with exit code $gradleExit"
    exit $gradleExit
}

# 7. Sign APK (if debug keystore exists)
$apkFolder = if ($Target -eq "universal") { "universal" } else { "arm64" }
$apkPrefix = if ($Target -eq "universal") { "app-universal" } else { "app-arm64" }
$apkUnsigned = "src-tauri\gen\android\app\build\outputs\apk\$apkFolder\release\$apkPrefix-release-unsigned.apk"
$apkSigned = "src-tauri\gen\android\app\build\outputs\apk\$apkFolder\release\$apkPrefix-release-signed.apk"
$debugKeystore = "$env:USERPROFILE\.android\debug.keystore"
$apksigner = "C:\Users\mbula\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"

if ((Test-Path $apkUnsigned) -and (Test-Path $debugKeystore) -and (Test-Path $apksigner)) {
    Write-Host "`nSigning APK with debug keystore..." -ForegroundColor Yellow
    & $apksigner sign --ks $debugKeystore --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --out $apkSigned $apkUnsigned
    if ($LASTEXITCODE -eq 0) {
        Write-Host "APK signed successfully: $apkSigned" -ForegroundColor Green
    }
}

# 8. Verify Output Artifacts & Distribute
$targetApk = if (Test-Path $apkSigned) { $apkSigned } else { $apkUnsigned }
if (Test-Path $targetApk) {
    $fileItem = Get-Item $targetApk
    $sizeMb = [math]::Round($fileItem.Length / 1MB, 2)
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  Android APK Build SUCCESSFUL!         " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Output: $targetApk" -ForegroundColor Green
    Write-Host "Size  : $sizeMb MB ($($fileItem.Length) bytes)" -ForegroundColor Green

    # Copy to dist-android/
    $distAndroidDir = "dist-android"
    if (-not (Test-Path $distAndroidDir)) {
        New-Item -ItemType Directory -Path $distAndroidDir | Out-Null
    }
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $version = $packageJson.version
    $distApk = "$distAndroidDir\CNTXT-v$version-$Target.apk"
    Copy-Item $targetApk -Destination $distApk -Force
    Write-Host "Artifact ready: $distApk" -ForegroundColor Green

    # Clean older version APKs in dist-android
    Get-ChildItem $distAndroidDir -Filter "*.apk" | Where-Object { $_.Name -notmatch "CNTXT-v$version" } | Remove-Item -Force -ErrorAction SilentlyContinue
} else {
    Write-Warning "APK not found at expected path: $apkUnsigned"
}

# 9. Optional Sideloading to Connected ADB Device
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
if ((Test-Path $adb) -and (Test-Path $apkSigned)) {
    $devices = & $adb devices | Select-String -Pattern "\bdevice\b"
    if ($devices) {
        Write-Host "`nConnected Android hardware detected. Sideloading fresh signed APK..." -ForegroundColor Yellow
        & $adb install -r $apkSigned
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Fresh APK successfully installed on connected device!" -ForegroundColor Green
        }
    }
}
