# NSIS include for DSH Desktop installer.
#
# customInstall — the harness user-data is shipped FLAT inside the installer as
# `resources\data` (settings.yaml, profiles/web, bin/mnemon.exe, …). The desktop
# shell injects DSH_HOME = <program-dir>\data at launch and reads it directly, so
# we only need to place a copy of the bundled data next to the executable. There is
# NO per-user release, NO cliPath rewriting (the shell injects MNEMON_CLI_PATH from
# DSH_HOME instead).
#
# Behaviour:
#   - Fresh install : copy resources\data -> $INSTDIR\data\
#   - Upgrade       : preserve an existing $INSTDIR\data (user sessions / credentials
#                     live there). Only seed when missing.
#   - dsh.cmd shim  : drop a shortcut in the install root (unchanged).

!macro customInstall
  ; --- seed bundled data next to the executable ($INSTDIR\data) ------------
  ${IfNot} ${FileExists} "$INSTDIR\data\*.*"
    ${If} ${FileExists} "$INSTDIR\resources\data"
      DetailPrint "Installing bundled harness data -> $INSTDIR\data"
      CopyFiles /SILENT "$INSTDIR\resources\data" "$INSTDIR"
      ; Reclaim space: the staged copy under resources is now duplicated at
      ; $INSTDIR\data; remove it once we know the seed succeeded.
      ${If} ${FileExists} "$INSTDIR\data\settings.yaml"
        RMDir /r "$INSTDIR\resources\data"
      ${EndIf}
    ${EndIf}
  ${Else}
    DetailPrint "Keeping existing $INSTDIR\data"
  ${EndIf}

  ; --- dsh.cmd CLI shim : root shortcut ------------------------------------
  ${If} ${FileExists} "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    DetailPrint "dsh CLI: $INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    CreateShortcut "$INSTDIR\dsh.lnk" "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd" "" "$INSTDIR\resources\icon.png"
    DetailPrint "Created shortcut: $INSTDIR\dsh.lnk"
  ${EndIf}
!macroend

!macro customUnInstall
  ; Remove the root CLI shortcut only. $INSTDIR\data holds the user's runtime
  ; data (sessions, credentials, …) and must survive uninstall.
  Delete "$INSTDIR\dsh.lnk"
!macroend
