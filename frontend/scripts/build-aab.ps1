# Local Play Store AAB build (Windows). Run from frontend/: npm run build:android:aab
$ErrorActionPreference = "Stop"
$frontend = Split-Path -Parent $PSScriptRoot

Write-Host "=== Finovert AAB build ===" -ForegroundColor Cyan
Write-Host "Stop Expo/Metro (npx expo start) in other terminals before continuing." -ForegroundColor Yellow

& "$PSScriptRoot\clean-android-build.ps1"

$android = Join-Path $frontend "android"
Push-Location $android
try {
    Write-Host "Stopping Gradle daemons..."
    .\gradlew.bat --stop 2>$null | Out-Null
    Start-Sleep -Seconds 2

    $env:NODE_ENV = "production"
    $env:EXPO_USE_LOCAL_API = "0"
    $env:EXPO_PUBLIC_API_URL = "https://thecfofino-3.onrender.com/api"
    Write-Host "API baked into AAB: $env:EXPO_PUBLIC_API_URL" -ForegroundColor Green
    Write-Host "Building release AAB (15-25 min first time)..."
    .\gradlew.bat bundleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $aab = Join-Path $android "app\build\outputs\bundle\release\app-release.aab"
    if (Test-Path $aab) {
        Write-Host ""
        Write-Host "SUCCESS. Upload this file to Google Play Console:" -ForegroundColor Green
        Write-Host $aab
    } else {
        Write-Host "Build finished but AAB not found at expected path." -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
