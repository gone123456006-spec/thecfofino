# Fix NDK build: remove ANDROID_NDK_HOME that points to wrong path (e.g. D:\dating\ndk)
# Run this in PowerShell before building, or add to your profile to unset permanently.

$env:ANDROID_NDK_HOME = $null
$env:NDK_HOME = $null
Write-Host "Cleared ANDROID_NDK_HOME and NDK_HOME. Build will use NDK from Android SDK." -ForegroundColor Green
Write-Host "Now run: npx expo run:android" -ForegroundColor Cyan
