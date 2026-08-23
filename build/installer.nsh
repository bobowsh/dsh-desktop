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
; DshUpgradeLogic - called from customInstall macro
;
; $R9 output: 0=fresh, 1=full reinstall, 2=preserve/merge
; ============================================================================

!ifndef BUILD_UNINSTALLER
Function DshUpgradeLogic
  StrCpy $R9 "0"

  ${IfNot} ${FileExists} "$INSTDIR\data\*.*"
    Return
  ${EndIf}

  ; --- Backup existing data to D:\dsh-backup or E:\dsh-backup ----------
  ; $0 = backup root, $1 = backup dir, $2 = counter
  StrCpy $0 "D:\dsh-backup"
  IfFileExists "D:\" 0 _dsh_use_e
    Goto _dsh_have_drive
  _dsh_use_e:
    StrCpy $0 "E:\dsh-backup"
  _dsh_have_drive:
  CreateDirectory "$0"

  ; Find next available counter directory
  StrCpy $2 "0"
  _dsh_find_loop:
    StrCpy $1 "$0\$2"
    IfFileExists "$1\*.*" 0 _dsh_found
    IntOp $2 $2 + 1
    StrCmp $2 "999" 0 _dsh_find_loop
    StrCpy $1 "$0\999"
  _dsh_found:
  CreateDirectory "$1"
  CopyFiles /SILENT "$INSTDIR\data\*.*" "$1"
  DetailPrint "DSH: backed up user data to $1"

  ; --- Ask user choice ---
  MessageBox MB_YESNO|MB_ICONQUESTION "DSH has existing user data.$\r$\nBackup saved to $1$\r$\n$\r$\n[Yes] Full install - delete and reinstall from package$\r$\n[No]  Preserve - keep existing, only add new" IDYES _dsh_yes IDNO _dsh_no

  _dsh_no:
    StrCpy $R9 "2"
    Return
  _dsh_yes:
    StrCpy $R9 "1"
    Return
FunctionEnd
!endif

; ============================================================================
; customInstall macro - minimal, delegates to function
; ============================================================================

!macro customInstall
  Call DshUpgradeLogic
  ${If} $R9 == "1"
    DetailPrint "DSH: full install - removing existing user data"
    RMDir /r "$INSTDIR\data"
  ${ElseIf} $R9 == "2"
    DetailPrint "DSH: preserve mode - merging new files"
    CopyFiles /SILENT "$INSTDIR\resources\data" "$INSTDIR"
    Goto _dsh_done
  ${EndIf}
  ${IfNot} ${FileExists} "$INSTDIR\data\*.*"
    ${If} ${FileExists} "$INSTDIR\resources\data"
      DetailPrint "Installing bundled harness data"
      CopyFiles /SILENT "$INSTDIR\resources\data" "$INSTDIR"
      ${If} ${FileExists} "$INSTDIR\data\settings.yaml"
        RMDir /r "$INSTDIR\resources\data"
      ${EndIf}
    ${EndIf}
  ${Else}
    DetailPrint "Keeping existing user data"
  ${EndIf}
  _dsh_done:
  ${If} ${FileExists} "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    DetailPrint "Creating dsh CLI shortcut"
    CreateShortcut "$INSTDIR\dsh.lnk" "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd" "" "$INSTDIR\resources\icon.png"
  ${EndIf}
  ${If} $R9 != "2"
    WriteRegStr HKCU "Environment" "DSH_HOME" "$INSTDIR\data"
    SendMessage ${DSH_HWND_BROADCAST} ${DSH_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
    DetailPrint "DSH_HOME set to $INSTDIR\data"
  ${Else}
    DetailPrint "DSH: keeping existing DSH_HOME"
  ${EndIf}
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
