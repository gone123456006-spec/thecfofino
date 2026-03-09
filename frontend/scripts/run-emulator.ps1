# Run Android emulator when 'emulator' is not in PATH.
# Usage:
#   .\scripts\run-emulator.ps1              # list AVDs
#   .\scripts\run-emulator.ps1 -Avd "Pixel_7"

param(
    [switch] $ListAvds,
    [string] $Avd
)

$candidates = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    (Join-Path $env:LOCALAPPDATA "Android\Sdk"),
    "C:\Android\Sdk"
)
$sdkPaths = $candidates | Where-Object { $_ -and (Test-Path $_) }

$emulatorExe = $null
foreach ($root in $sdkPaths) {
    $exe = Join-Path $root "emulator\emulator.exe"
    if (Test-Path -LiteralPath $exe) {
        $emulatorExe = (Get-Item -LiteralPath $exe).FullName
        break
    }
}

if (-not $emulatorExe) {
    Write-Host "Android SDK emulator not found. Tried:" -ForegroundColor Red
    foreach ($c in $candidates) {
        if ($c) { Write-Host "  $c" -ForegroundColor Gray }
    }
    Write-Host "Set ANDROID_HOME to your SDK root (folder containing 'emulator'), then run again:" -ForegroundColor Yellow
    Write-Host "  `$env:ANDROID_HOME = `"C:\Users\USER\AppData\Local\Android\Sdk`"  # or your actual path" -ForegroundColor Cyan
    exit 1
}

Write-Host "Using: $emulatorExe" -ForegroundColor DarkGray

if ($ListAvds -or (-not $Avd)) {
    & "$emulatorExe" -list-avds
    exit $LASTEXITCODE
}

& "$emulatorExe" -avd $Avd
exit $LASTEXITCODE
