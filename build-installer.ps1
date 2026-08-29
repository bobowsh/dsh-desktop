# Build the DSH Desktop Windows installer (NSIS setup.exe).
#
# Run this in a NORMAL terminal (PowerShell / CMD / Windows Terminal) - NOT inside
# WorkBuddy. WorkBuddy injects a "safe-delete" shim that intercepts file deletion
# and deadlocks electron-builder while it unpacks Electron / copies files.
#
# Usage (from the project root):
#   powershell -ExecutionPolicy Bypass -File .\build-installer.ps1
# or simply:
#   .\build-installer.ps1

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host '==> [1/4] Building main + preload (electron-vite build)...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }

Write-Host '==> [2/4] Aligning @deepseek-ai/* in web profile to harness version...' -ForegroundColor Cyan
node scripts/sync-harness-pkgs.mjs
if ($LASTEXITCODE -ne 0) { throw 'sync-harness-pkgs failed' }

Write-Host '==> [3/4] Staging user data (~/.dsh web profile + ~/.mnemon)...' -ForegroundColor Cyan
node scripts/bundle-user-data.mjs
if ($LASTEXITCODE -ne 0) { throw 'bundle-user-data failed' }

Write-Host '==> [4/4] Packaging NSIS installer (electron-builder)...' -ForegroundColor Cyan
npx electron-builder --win --x64 --publish never
if ($LASTEXITCODE -ne 0) { throw 'electron-builder failed' }

Write-Host ''
Write-Host 'Done. Installer artifact:' -ForegroundColor Green
$dist = Join-Path $PSScriptRoot 'dist'
Get-ChildItem -Path $dist -Filter '*-setup.exe' | ForEach-Object {
  $mb = [math]::Round($_.Length / 1MB, 1)
  Write-Host ("  " + $_.FullName + "  (" + $mb + " MB)")
}
