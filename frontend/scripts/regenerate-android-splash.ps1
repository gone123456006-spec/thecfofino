# Regenerate Android splash icon; optional native prebuild.
# Run from frontend/: npm run prebuild:android
$ErrorActionPreference = "Stop"
$frontend = Split-Path -Parent $PSScriptRoot

Write-Host "Preparing transparent splash-icon.png ..."
node (Join-Path $PSScriptRoot "prepare-splash-icon.cjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Push-Location $frontend
try {
    if (-not (Test-Path (Join-Path $frontend "android"))) {
        Write-Host "android/ folder missing, running prebuild ..."
        npx expo prebuild --platform android --no-install
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } else {
        Write-Host "Skipping prebuild to preserve existing Android signing config." -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Done. Build next with:" -ForegroundColor Green
    Write-Host "  npm run build:android:aab" -ForegroundColor Cyan
    Write-Host "  OR: cd android; .\gradlew.bat assembleRelease" -ForegroundColor Cyan
} finally {
    Pop-Location
}
