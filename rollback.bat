@echo off
rem ============================================================================
rem  DSH profile web dependency fix - rollback (Windows)
rem  Restores the two stale copies from .dsh-dep-fix-snapshot. Idempotent.
rem ============================================================================
setlocal EnableDelayedExpansion
set "PROFILE=E:\work\dsh-desktop-me\data\profiles\web"
set "NM=%PROFILE%\node_modules\@deepseek-ai"
set "SNAP=E:\work\dsh-desktop-me\.dsh-dep-fix-snapshot"
set "SLLM=%NM%\dsh-llm"
set "SSET=%NM%\dsh-settings"

if not exist "%SNAP%" (
  echo [ABORT] no snapshot at %SNAP%; nothing to roll back.
  exit /b 2
)

if exist "%SNAP%\dsh-llm" (
  if not exist "%SLLM%" mkdir "%SLLM%" >nul 2>&1
  xcopy /E /I /Q "%SNAP%\dsh-llm" "%SLLM%" >nul
  echo [RESTORE] dsh-llm restored.
) else (
  echo [INFO] snapshot has no dsh-llm; ensure removed...
  if exist "%SLLM%" rmdir /S /Q "%SLLM%"
)

if exist "%SNAP%\dsh-settings" (
  if not exist "%SSET%" mkdir "%SSET%" >nul 2>&1
  xcopy /E /I /Q "%SNAP%\dsh-settings" "%SSET%" >nul
  echo [RESTORE] dsh-settings restored.
) else (
  echo [INFO] snapshot has no dsh-settings; ensure removed...
  if exist "%SSET%" rmdir /S /Q "%SSET%"
)

echo [DONE] rollback complete, stale copies restored.
exit /b 0
