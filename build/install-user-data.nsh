# NSIS include for DSH Desktop installer.
#
# customInstall — release the bundled harness user-data (~/.dsh) and memory
# system (~/.mnemon) into the current user's home directory, entirely in NSIS
# (no PowerShell child process).
#
# Behaviour on reinstall / upgrade: electron-builder's assisted installer
# already SILENTLY UNINSTALLS the old program files before installing the new
# ones (installSection.nsh -> uninstallOldVersion). That uninstall does NOT
# touch ~/.dsh or ~/.mnemon. We then release the bundled data:
#   - profiles\web  : ALWAYS replaced (old plugins removed, bundled installed)
#   - settings.yaml : PRESERVED if present (user's model/provider setup); only
#                     seeded from the bundle on a fresh install. Its mnemon
#                     cliPath line is rewritten to this machine's real path.
#   - everything else under ~/.dsh (sessions, memory, ...) : PRESERVED
#   - ~/.mnemon     : copied only when missing (just the mnemon.exe CLI)
#
# cliPath rewrite: the bundle ships settings.yaml with the cliPath value set to
# the placeholder `@@MNEMON_CLI@@` (see scripts/bundle-user-data.mjs). At
# install time we rewrite the whole `cliPath:` line to "$PROFILE\.mnemon\bin\mnemon.exe".

!include TextFunc.nsh   ; for ${ConfigWrite}

!macro customInstall
  StrCpy $0 "$PROFILE\.dsh"
  StrCpy $1 "$INSTDIR\resources\bundled-user-data\.dsh"

  ; --- profiles\web : uninstall old + install bundled (always) --------------
  ${If} ${FileExists} "$1\profiles\web\*.*"
    ${If} ${FileExists} "$0\profiles\web\*.*"
      DetailPrint "Removing existing $0\profiles\web"
      RMDir /r "$0\profiles\web"
    ${EndIf}
    CreateDirectory "$0\profiles"
    DetailPrint "Installing bundled profile: $0\profiles\web"
    CopyFiles /SILENT "$1\profiles\web" "$0\profiles"
  ${EndIf}

  ; --- settings.yaml : seed only when missing -------------------------------
  ${IfNot} ${FileExists} "$0\settings.yaml"
    ${If} ${FileExists} "$1\settings.yaml"
      CreateDirectory "$0"
      CopyFiles /SILENT "$1\settings.yaml" "$0"
      DetailPrint "Seeded $0\settings.yaml"
    ${EndIf}
  ${Else}
    DetailPrint "Keeping existing settings.yaml"
  ${EndIf}

  ; --- rewrite mnemon cliPath to this machine's real path -------------------
  ${If} ${FileExists} "$0\settings.yaml"
    ; ConfigWrite deletes lines starting with the entry and appends "entry value".
    ${ConfigWrite} "$0\settings.yaml" "  cliPath: " "$PROFILE\.mnemon\bin\mnemon.exe" $R0
  ${EndIf}

  ; --- ~/.mnemon : copy only when missing ------------------------------------
  ${IfNot} ${FileExists} "$PROFILE\.mnemon\bin\mnemon.exe"
    ${If} ${FileExists} "$INSTDIR\resources\bundled-user-data\.mnemon\bin\mnemon.exe"
      CreateDirectory "$PROFILE\.mnemon"
      DetailPrint "Installing bundled memory CLI: $PROFILE\.mnemon"
      CopyFiles /SILENT "$INSTDIR\resources\bundled-user-data\.mnemon\bin" "$PROFILE\.mnemon"
    ${EndIf}
  ${Else}
    DetailPrint "Keeping existing .mnemon"
  ${EndIf}

  ; --- dsh.cmd CLI shim : root shortcut -------------------------------------
  ; dsh.cmd is shipped via extraResources to
  ;   resources\app\node_modules\node\bin\dsh.cmd
  ; where node.exe lives and its relative path "..\@deepseek-ai\dsh\lib\bin.js"
  ; resolves to the real installed bin.js — so NO rewrite is needed here, we
  ; only drop a shortcut in the install root.
  ${If} ${FileExists} "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    DetailPrint "dsh CLI: $INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    CreateShortcut "$INSTDIR\dsh.lnk" "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd" "" "$INSTDIR\resources\icon.png"
    DetailPrint "Created shortcut: $INSTDIR\dsh.lnk"
  ${EndIf}
!macroend

!macro customUnInstall
  ; Remove the root CLI shortcut. resources\node\dsh.cmd is removed with the
  ; program files by electron-builder's built-in uninstall.
  Delete "$INSTDIR\dsh.lnk"
!macroend
