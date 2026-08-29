; ============================================================================
; DSH Desktop installer NSIS customizations
; ============================================================================
; 1) Assisted-installer directory page: allow installing to a Windows drive
;    root.
; 2) customInstall: seed the bundled harness data, backup/choice logic.
; 3) DSH_HOME user environment variable.
; ============================================================================

!include "LogicLib.nsh"

!define DSH_WM_SETTINGCHANGE 0x001A
!define DSH_HWND_BROADCAST 0xFFFF

!ifndef BUILD_UNINSTALLER
  !ifndef ONE_CLICK
    !include "nsDialogs.nsh"

    Var DshDirectoryPage
    Var DshDirectoryEdit
    Var DshDirectoryNormalizationActive

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

    !define MUI_PAGE_CUSTOMFUNCTION_LEAVE DshEnsureInstDirExists

    Function DshEnsureInstDirExists
      CreateDirectory "$INSTDIR"
    FunctionEnd

    !macro preInit
    !macroend
    Function .onVerifyInstDir
    FunctionEnd
  !endif
!endif

; ============================================================================
; customInstall - DSH direct overwrite install
;
; The bundled harness `data` is shipped via electron-builder `extraFiles`
; (build.extraFiles in package.json), which extracts straight to $INSTDIR\data
; at install time — so there is NO second copy step here and install is fast.
;
; The package's `data` filter only ships settings.yaml / profiles/web/** / bin/**
; (see package.json build.extraFiles). The user's secrets file
; `data/.credentials.yaml` is NEVER in that filter, so the extracted tree never
; contains it and an overwrite install cannot clobber an existing API key —
; NSIS only writes the files present in the package and leaves everything else
; (sessions, .credentials.yaml, cache, …) in place.
; ============================================================================

!macro customInstall
  ; data is already at $INSTDIR\data from extraFiles — nothing to copy.
  ${If} ${FileExists} "$INSTDIR\data\settings.yaml"
    DetailPrint "DSH: overwrite install — kept user data, refreshed bundled files"
  ${Else}
    DetailPrint "DSH: fresh install"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    DetailPrint "Creating dsh CLI shortcut"
    CreateShortcut "$INSTDIR\dsh.lnk" "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd" "" "$INSTDIR\resources\icon.png"
  ${EndIf}
  WriteRegStr HKCU "Environment" "DSH_HOME" "$INSTDIR\data"
  SendMessage ${DSH_HWND_BROADCAST} ${DSH_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
  DetailPrint "DSH_HOME set to $INSTDIR\data"
!macroend

!macro customUnInstall
  Delete "$INSTDIR\dsh.lnk"
  ReadRegStr $0 HKCU "Environment" "DSH_HOME"
  ${If} $0 == "$INSTDIR\data"
    DeleteRegValue HKCU "Environment" "DSH_HOME"
    SendMessage ${DSH_HWND_BROADCAST} ${DSH_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
    DetailPrint "Removed DSH_HOME user environment variable"
  ${EndIf}
!macroend
