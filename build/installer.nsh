; ============================================================================
; DSH Desktop installer NSIS customizations
; ============================================================================
; 1) Assisted-installer directory page: allow installing to a Windows drive
;    root ("D:" / "D:\" are normalized to D:<AppName>).
; 2) customInstall: seed the bundled harness data (resources<data ->
;    $INSTDIR\data) and create the dsh.cmd root shortcut. customUnInstall
;    removes the shortcut but preserves the user's $INSTDIR\data.
; Part 3: record DSH_HOME as a user environment variable so processes spawned
;    outside the desktop shell (CLI, editors) resolve the same harness home.
; Part 4: upgrade flow - backup existing user data, then ask the user whether
;    to do a full reinstall (delete + re-seed) or a preserve/merge install.
; ============================================================================

!include "LogicLib.nsh"

; --- DSH_HOME user environment variable (install + uninstall) ---------------
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
; customInstall - upgrade-aware data seeding
; ============================================================================

!macro customInstall
  ; $R9 = install mode: 0=fresh, 1=full reinstall, 2=preserve/merge
  StrCpy $R9 "0"

  ; --- Step 1: backup existing user data ------------------------------------
  ${If} ${FileExists} "$INSTDIR\data\*.*"

    ; Pick backup root (D or E) and find next available counter directory
    StrCpy $D "D:\dsh-backup"
    ${IfNot} ${DirExists} "D:\\"
      StrCpy $D "E:\dsh-backup"
    ${EndIf}
    CreateDirectory "$D"

    StrCpy $C "0"
    _dsh_find_backup:
      StrCpy $E "$D\$C"
      ${IfNot} ${DirExists} "$E"
        Goto _dsh_backup_found
      ${EndIf}
      IntOp $C $C + 1
      ${If} $C > 999
        DetailPrint "DSH: too many backups, reusing backup 999"
        StrCpy $E "$D\999"
        Goto _dsh_backup_found
      ${EndIf}
      Goto _dsh_find_backup

    _dsh_backup_found:
    CreateDirectory "$E"
    CopyDirectory /r "$INSTDIR\data" "$E"
    DetailPrint "DSH: backed up user data to $E"

    ; --- Step 2: ask user choice --------------------------------------------
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "DSH has existing user data.$\r$\n\
       Backup saved to $E$\r$\n$\r$\n\
       [Yes] Full install - delete and reinstall from package$\r$\n\
       [No]  Preserve - keep existing, only add new" \
      IDYES _dsh_full IDNO _dsh_preserve

    _dsh_preserve:
      StrCpy $R9 "2"
      Goto _dsh_choice_done

    _dsh_full:
      StrCpy $R9 "1"
      Goto _dsh_choice_done

    _dsh_choice_done:
  ${EndIf}

  ; --- Step 3: act on the chosen mode ---------------------------------------
  ${If} $R9 == "1"
    DetailPrint "DSH: full install - removing existing user data"
    RMDir /r "$INSTDIR\data"

  ${ElseIf} $R9 == "2"
    DetailPrint "DSH: preserve mode - merging new files"
    CopyFiles /SILENT "$INSTDIR\resources\data" "$INSTDIR"
    Goto _dsh_skip_seed
  ${EndIf}

  ; --- Seed bundled data (fresh install OR after full-delete) ---------------
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

  _dsh_skip_seed:

  ; --- dsh.cmd CLI shim ----------------------------------------------------
  ${If} ${FileExists} "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    DetailPrint "Creating dsh CLI shortcut"
    CreateShortcut "$INSTDIR\dsh.lnk" "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd" "" "$INSTDIR\resources\icon.png"
  ${EndIf}

  ; --- DSH_HOME user environment variable -----------------------------------
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
