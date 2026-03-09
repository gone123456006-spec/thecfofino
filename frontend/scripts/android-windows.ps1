# Fix JAVA_HOME for Android build on Windows.
# Your JAVA_HOME was set to an invalid path (e.g. ...\jdk-17). It must point to the JDK root (folder that contains bin, lib).

$candidates = @(
    "C:\Program Files\Microsoft\jdk-17.0.12.7-hotspot",
    "C:\Program Files\Microsoft\jdk-17.0.12.7-hotspot\jdk-17",
    "C:\Program Files\Java\jdk-17"
)
# Also try first matching jdk-17* under Microsoft and Java (parent and \jdk-17)
$extra = @(
    (Get-Item "C:\Program Files\Microsoft\jdk-17*" -ErrorAction SilentlyContinue),
    (Get-Item "C:\Program Files\Java\jdk-17*" -ErrorAction SilentlyContinue)
) | Where-Object { $_ } | ForEach-Object { $_.FullName; Join-Path $_.FullName "jdk-17" }
$candidates = ($candidates + $extra) | ForEach-Object { $_.Trim() } | Where-Object { $_ }

$javaHome = $null
foreach ($c in $candidates) {
    if (Test-Path (Join-Path $c "bin\javac.exe")) {
        $javaHome = $c
        break
    }
}

if (-not $javaHome) {
    Write-Host "JAVA_HOME fix: No JDK 17 found in common locations." -ForegroundColor Yellow
    Write-Host "Set JAVA_HOME manually to your JDK root (folder containing bin, lib)." -ForegroundColor Yellow
    Write-Host "Example (PowerShell): `$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.12.7-hotspot'" -ForegroundColor Cyan
    exit 1
}

$env:JAVA_HOME = $javaHome
Write-Host "Using JAVA_HOME=$javaHome" -ForegroundColor Green
Set-Location $PSScriptRoot\..
npx expo run:android
exit $LASTEXITCODE
