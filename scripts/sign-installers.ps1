param(
    [string]$Thumbprint = "B667C7DD7FEACBE7D91C24D494965ECAA6B201AF",
    [string]$TimestampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host "[1/4] Locating code signing certificate ($Thumbprint)..." -ForegroundColor Cyan
$cert = Get-Item "Cert:\CurrentUser\My\$Thumbprint" -ErrorAction SilentlyContinue
if (-not $cert) {
    $cert = Get-Item "Cert:\LocalMachine\My\$Thumbprint" -ErrorAction SilentlyContinue
}

if (-not $cert) {
    Write-Error "Code signing certificate with thumbprint $Thumbprint not found in CurrentUser\My or LocalMachine\My."
    exit 1
}

Write-Host "[2/4] Found certificate: $($cert.Subject) (Expires: $($cert.NotAfter))" -ForegroundColor Green

# Locate signtool.exe from Windows Kits
$signtoolPaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe"
)

$signtool = $null
foreach ($pathPattern in $signtoolPaths) {
    $found = Get-ChildItem $pathPattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found -and (Test-Path $found.FullName)) {
        $signtool = $found.FullName
        break
    }
}

if ($signtool) {
    Write-Host "[3/4] Using signtool: $signtool" -ForegroundColor Green
} else {
    Write-Host "[3/4] Using PowerShell Set-AuthenticodeSignature cmdlet" -ForegroundColor Yellow
}

# 1. Read current version from package.json
$packageJson = Get-Content (Join-Path $rootDir "package.json") -Raw | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Packaging CNTXT version $version..." -ForegroundColor Cyan

# Locate targets dynamically
$releaseExe = Join-Path $rootDir "src-tauri\target\release\cntxt.exe"
$portableExe = Join-Path $rootDir "dist-portable\CNTXT-portable.exe"
$versionedPortableExe = Join-Path $rootDir "dist-portable\CNTXT_${version}_portable.exe"
$nsisSource = Join-Path $rootDir "src-tauri\target\release\bundle\nsis\CNTXT_${version}_x64-setup.exe"
$msiSource = Join-Path $rootDir "src-tauri\target\release\bundle\msi\CNTXT_${version}_x64_en-US.msi"

if (-not (Test-Path $nsisSource)) {
    $foundNsis = Get-ChildItem (Join-Path $rootDir "src-tauri\target\release\bundle\nsis\*.exe") -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundNsis) { $nsisSource = $foundNsis.FullName }
}
if (-not (Test-Path $msiSource)) {
    $foundMsi = Get-ChildItem (Join-Path $rootDir "src-tauri\target\release\bundle\msi\*.msi") -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundMsi) { $msiSource = $foundMsi.FullName }
}

$installerDir = Join-Path $rootDir "dist-installer"
if (-not (Test-Path $installerDir)) {
    New-Item -ItemType Directory -Path $installerDir | Out-Null
}

# Copy newly built installers to dist-installer (preserving existing versions)
if (Test-Path $nsisSource) {
    Copy-Item $nsisSource -Destination $installerDir -Force
    Write-Host "Copied NSIS installer ($nsisSource) to dist-installer/" -ForegroundColor Green
}
if (Test-Path $msiSource) {
    Copy-Item $msiSource -Destination $installerDir -Force
    Write-Host "Copied MSI installer ($msiSource) to dist-installer/" -ForegroundColor Green
}

$targets = @(
    $releaseExe,
    $portableExe,
    $versionedPortableExe,
    $nsisSource,
    $msiSource
)

# Add any installer files present in dist-installer
Get-ChildItem $installerDir -File | ForEach-Object {
    if ($targets -notcontains $_.FullName) {
        $targets += $_.FullName
    }
}

foreach ($target in $targets) {
    if ($target -and (Test-Path $target)) {
        Write-Host "Signing $target..." -ForegroundColor Cyan
        try {
            if ($signtool) {
                & $signtool sign /sha1 $Thumbprint /fd SHA256 /d "CNTXT" /tr $TimestampUrl /td SHA256 $target
            } else {
                Set-AuthenticodeSignature -FilePath $target -Certificate $cert -HashAlgorithm SHA256 -TimestampServer $TimestampUrl | Out-Null
            }
            Write-Host "  -> Successfully signed $target" -ForegroundColor Green
        } catch {
            Write-Warning "  -> Could not sign $target (file may be in use): $($_.Exception.Message)"
        }
    }
}

Write-Host "`n[4/4] Signed Installer Packages ready in: $installerDir" -ForegroundColor Cyan
Get-ChildItem $installerDir | Get-AuthenticodeSignature | Format-Table -AutoSize
