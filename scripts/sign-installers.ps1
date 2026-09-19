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

$targets = @(
    (Join-Path $rootDir "src-tauri\target\release\cntxt.exe"),
    (Join-Path $rootDir "src-tauri\target\release\bundle\nsis\CNTXT_0.3.0_x64-setup.exe"),
    (Join-Path $rootDir "src-tauri\target\release\bundle\msi\CNTXT_0.3.0_x64_en-US.msi"),
    (Join-Path $rootDir "dist-portable\CNTXT-portable.exe")
)

$installerDir = Join-Path $rootDir "dist-installer"
if (-not (Test-Path $installerDir)) {
    New-Item -ItemType Directory -Path $installerDir | Out-Null
}

foreach ($target in $targets) {
    if (Test-Path $target) {
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

# Copy signed installers to dist-installer
$nsisSource = Join-Path $rootDir "src-tauri\target\release\bundle\nsis\CNTXT_0.3.0_x64-setup.exe"
$msiSource = Join-Path $rootDir "src-tauri\target\release\bundle\msi\CNTXT_0.3.0_x64_en-US.msi"

if (Test-Path $nsisSource) {
    Copy-Item $nsisSource -Destination $installerDir -Force
    Write-Host "Copied signed NSIS installer to dist-installer/" -ForegroundColor Green
}
if (Test-Path $msiSource) {
    Copy-Item $msiSource -Destination $installerDir -Force
    Write-Host "Copied signed MSI installer to dist-installer/" -ForegroundColor Green
}

Write-Host "`n[4/4] Signed Installer Packages ready in: $installerDir" -ForegroundColor Cyan
Get-ChildItem $installerDir | Get-AuthenticodeSignature | Format-Table -AutoSize
