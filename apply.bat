@echo off
rem ============================================================================
rem  DSH profile web dependency fix - apply (Windows)
rem  Removes two stale @deepseek-ai/dsh-llm / dsh-settings @0.0.1-rc.1 copies
rem  under the web profile so module resolution falls through to the host root
rem  @0.1.2-alpha.1. Idempotent: aborts if the snapshot already exists.
rem ============================================================================
setlocal EnableDelayedExpansion
set "PROFILE=E:\work\dsh-desktop-me\data\profiles\web"
set "NM=%PROFILE%\node_modules\@deepseek-ai"
set "SNAP=E:\work\dsh-desktop-me\.dsh-dep-fix-snapshot"
set "SLLM=%NM%\dsh-llm"
set "SSET=%NM%\dsh-settings"

echo [INFO] target profile : %PROFILE%
echo [INFO] snapshot dir   : %SNAP%

if exist "%SNAP%" (
  echo [ABORT] snapshot already exists at %SNAP%
  echo          apply has run before. Run rollback.bat first, or remove the snapshot to re-run.
  exit /b 2
)

mkdir "%SNAP%" >nul 2>&1

set "did="
if exist "%SLLM%" (
  echo [SNAP] backing up dsh-llm (0.0.1-rc.1) ...
  xcopy /E /I /Q "%SLLM%" "%SNAP%\dsh-llm" >nul
  set "did=1"
) else (
  echo [INFO] dsh-llm already absent, skip snapshot
)

if exist "%SSET%" (
  echo [SNAP] backing up dsh-settings (0.0.1-rc.1) ...
  xcopy /E /I /Q "%SSET%" "%SNAP%\dsh-settings" >nul
  set "did=1"
) else (
  echo [INFO] dsh-settings already absent, skip snapshot
)

if not defined did (
  echo.> "%SNAP%\.empty"
  echo [DONE] nothing to fix; created empty snapshot marker, rollback is a no-op.
  exit /b 0
)

echo [REMOVE] deleting stale dsh-llm @0.0.1-rc.1 ...
rmdir /S /Q "%SLLM%"
echo [REMOVE] deleting stale dsh-settings @0.0.1-rc.1 ...
rmdir /S /Q "%SSET%"

where node >nul 2>&1
if %errorlevel%==0 (
  echo [VERIFY] dsh-llm resolved from @changfenhuang/dsh-genui：
  node -e "try{console.log(require.resolve('@deepseek-ai/dsh-llm',{paths:['E:/work/dsh-desktop-me/data/profiles/web/node_modules/@changfenhuang/dsh-genui']}))}catch(e){console.log('resolve failed: '+e.message)}"
) else (
  echo [SKIP] node not on PATH in this shell; verify after harness restart.
)

echo [DONE] apply complete. Resolution now uses host root @0.1.2-alpha.1.
echo         To undo, run rollback.bat.
exit /b 0
