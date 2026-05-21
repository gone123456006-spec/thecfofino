# Removes corrupted Gradle/Kotlin caches under node_modules and android/ (Windows fix).
$ErrorActionPreference = "Continue"
$frontend = Split-Path -Parent $PSScriptRoot

Write-Host "Cleaning Android build artifacts in $frontend ..."

$targets = @(
    Join-Path $frontend "android\build"
    Join-Path $frontend "android\app\build"
    Join-Path $frontend "android\.gradle"
    Join-Path $frontend "node_modules\expo-updates\android\build"
)

Get-ChildItem -Path (Join-Path $frontend "node_modules") -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
        $androidBuild = Join-Path $_.FullName "android\build"
        if (Test-Path $androidBuild) { $targets += $androidBuild }
        $cxx = Join-Path $_.FullName "android\.cxx"
        if (Test-Path $cxx) { $targets += $cxx }
    }

foreach ($path in ($targets | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $path)) { continue }
    Write-Host "  Removing $path"
    cmd /c "rmdir /s /q `"$path`"" 2>$null
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Done. Run: cd android; .\gradlew.bat clean bundleRelease"
