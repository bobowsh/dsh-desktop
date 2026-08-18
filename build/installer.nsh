; ============================================================================
; DSH Desktop installer NSIS customizations
; ============================================================================
; 1) Assisted-installer directory page: allow installing to a Windows drive
;    root ("D:" / "D:\" are normalized to D:\<AppName>).
; 2) customInstall: seed the bundled harness data (resources\data ->
;    $INSTDIR\data) and create the dsh.cmd root shortcut. customUnInstall
;    removes the shortcut but preserves the user's $INSTDIR\data.
;
; Part 1 originated upstream (fix: allow Windows drive-root installation),
; part 2 was merged from build/install-user-data.nsh (portable data layout).
; ============================================================================

!ifndef BUILD_UNINSTALLER
  !ifndef ONE_CLICK
    !include "LogicLib.nsh"
    !include "nsDialogs.nsh"

    Var DshDirectoryPage
    Var DshDirectoryEdit
    Var DshDirectoryNormalizationActive

    ; MUI invokes this after the assisted installer's directory page is ready.
    ; Normalize a selected drive root immediately so the page does not reject it
    ; before electron-builder's later install-time sanitization can run.
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW DshDirectoryPageShow

    Function DshDirectoryPageShow
      FindWindow $DshDirectoryPage "#32770" "" $HWNDPARENT
      GetDlgItem $DshDirectoryEdit $DshDirectoryPage 1019
      ${NSD_OnChange} $DshDirectoryEdit DshDirectoryChanged
      Call DshNormalizeDriveRoot
    FunctionEnd

    Function DshDirectoryChanged
      Pop $0
      Call DshNormalizeDriveRoot
    FunctionEnd

    Function DshNormalizeDriveRoot
      ${If} $DshDirectoryNormalizationActive == "1"
        Return
      ${EndIf}

      ${NSD_GetText} $DshDirectoryEdit $0
      StrLen $1 $0

      ; Accept both forms produced by typing or the Windows folder picker:
      ; "D:" and "D:\". Any non-root directory is left untouched.
      ${If} $1 == 2
        StrCpy $2 $0 1 1
        ${If} $2 != ":"
          Return
        ${EndIf}
        StrCpy $3 "$0\${APP_FILENAME}"
      ${ElseIf} $1 == 3
        StrCpy $2 $0 1 1
        ${If} $2 != ":"
          Return
        ${EndIf}
        StrCpy $2 $0 1 2
        ${If} $2 != "\"
          Return
        ${EndIf}
        StrCpy $3 "$0${APP_FILENAME}"
      ${Else}
        Return
      ${EndIf}

      StrCpy $DshDirectoryNormalizationActive "1"
      StrCpy $INSTDIR $3
      ${NSD_SetText} $DshDirectoryEdit $3
      StrCpy $DshDirectoryNormalizationActive "0"
    FunctionEnd
  !endif
!endif

; ============================================================================
; customInstall / customUnInstall (merged from install-user-data.nsh)
;
; The harness user-data is shipped FLAT inside the installer as
; `resources\data` (settings.yaml, profiles/web, bin/mnemon.exe, ...). The
; desktop shell injects DSH_HOME = <program-dir>\data at launch and reads it
; directly, so we only need to place a copy of the bundled data next to the
; executable. There is NO per-user release, NO cliPath rewriting.
;
; Behaviour:
;   - Fresh install : copy resources\data -> $INSTDIR\data\
;   - Upgrade       : preserve an existing $INSTDIR\data (user sessions /
;                     credentials live there). Only seed when missing.
;   - dsh.cmd shim  : drop a shortcut in the install root.
; ============================================================================

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
  ; data (sessions, credentials, ...) and must survive uninstall.
  Delete "$INSTDIR\dsh.lnk"
!macroend
