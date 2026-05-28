# Regenerate Android native splash (white bg + transparent logo). Run from frontend/.
$ErrorActionPreference = "Stop"
$frontend = Split-Path -Parent $PSScriptRoot

Write-Host "Preparing transparent splash-icon.png ..."
node (Join-Path $PSScriptRoot "prepare-splash-icon.cjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Push-Location $frontend
try {
    Write-Host "Running expo prebuild --platform android ..."
    npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ""
    Write-Host "Done. Rebuild and reinstall the APK on your phone:" -ForegroundColor Green
    Write-Host "  npm run build:android:aab" -ForegroundColor Cyan
    Write-Host "  OR: cd android; .\gradlew.bat assembleRelease" -ForegroundColor Cyan
} finally {
    Pop-Location
}
