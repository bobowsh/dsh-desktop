; ============================================================================
; DSH Desktop installer NSIS customizations
; ============================================================================
; 1) Assisted-installer directory page: allow installing to a Windows drive
;    root ("D:" / "D:\" are normalized to D:\<AppName>).
; 2) customInstall: seed the bundled harness data (resources\data ->
;    $INSTDIR\data) and create the dsh.cmd root shortcut. customUnInstall
;    removes the shortcut but preserves the user's $INSTDIR\data.
; Part 3: record DSH_HOME as a user environment variable so processes spawned
;    outside the desktop shell (CLI, editors) resolve the same harness home.
; Part 4: upgrade flow — backup existing user data, then ask the user whether
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
; customInstall — upgrade-aware data seeding
; ============================================================================

!macro customInstall
  ; --- $R9 = install mode: 0=fresh, 1=full reinstall, 2=preserve/merge ----
  StrCpy $R9 "0"

  ; --- Step 1: backup existing user data ------------------------------------
  ${If} ${FileExists} "$INSTDIR\data\*.*"
    ; Build timestamp using Windows kernel32 (no NSIS plugins needed).
    ; Allocate SYSTEMTIME struct (8 x i2 = 16 bytes) on the NSIS heap.
    System::Call '*(i2,i2,i2,i2,i2,i2,i2,i2)i.r0'
    System::Call 'kernel32::GetLocalTime(p$r0)i'
    ; Read fields from the struct pointer: year(+0),month(+2),day(+4),hour(+8),min(+10),sec(+12)
    System::Call '*$r0(&i2.r1,&i2.r2,&i2.r3,&i2.r4)'
    System::Int64Op $r0 + 8
    Pop $r2
    System::Call '*$r2(&i2.r5,&i2.r6,&i2.r7)'
    System::Free $r0
    ; $1=year $2=month $3=day $4=dayOfWeek $5=hour $6=minute $7=second
    StrCpy $8 "$1-$2-$3_$5-$6-$7"

    ; Pick backup root: prefer D:\, fallback E:\
    StrCpy $D "D:\dsh-backup"
    ${IfNot} ${DirExists} "D:\"
      StrCpy $D "E:\dsh-backup"
    ${EndIf}
    StrCpy $E "$D\$8"
    CreateDirectory "$D"
    CreateDirectory "$E"
    CopyDirectory /r "$INSTDIR\data" "$E"
    DetailPrint "DSH: backed up user data -> $E"

    ; --- Step 2: ask user choice --------------------------------------------
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "DSH has existing user data in$\r$\n\
       $INSTDIR\data$\r$\n$\r$\n\
       [Yes] Full install: delete user plugins/skills, install from package$\r$\n\
       [No]  Preserve: keep existing plugins/skills, only add new ones" \
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
    ; ---- FULL REINSTALL ----
    DetailPrint "DSH: full install — removing existing user data"
    RMDir /r "$INSTDIR\data"
    ; Fall through to seed below

  ${ElseIf} $R9 == "2"
    ; ---- PRESERVE / MERGE ----
    DetailPrint "DSH: preserve mode — merging new files over existing"
    CopyFiles /SILENT "$INSTDIR\resources\data" "$INSTDIR"
    Goto _dsh_skip_seed
  ${EndIf}

  ; --- Seed bundled data (fresh install OR after full-delete) ---------------
  ${IfNot} ${FileExists} "$INSTDIR\data\*.*"
    ${If} ${FileExists} "$INSTDIR\resources\data"
      DetailPrint "Installing bundled harness data -> $INSTDIR\data"
      CopyFiles /SILENT "$INSTDIR\resources\data" "$INSTDIR"
      ${If} ${FileExists} "$INSTDIR\data\settings.yaml"
        RMDir /r "$INSTDIR\resources\data"
      ${EndIf}
    ${EndIf}
  ${Else}
    DetailPrint "Keeping existing $INSTDIR\data"
  ${EndIf}

  _dsh_skip_seed:

  ; --- dsh.cmd CLI shim ----------------------------------------------------
  ${If} ${FileExists} "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    DetailPrint "dsh CLI: $INSTDIR\resources\app\node_modules\node\bin\dsh.cmd"
    CreateShortcut "$INSTDIR\dsh.lnk" "$INSTDIR\resources\app\node_modules\node\bin\dsh.cmd" "" "$INSTDIR\resources\icon.png"
    DetailPrint "Created shortcut: $INSTDIR\dsh.lnk"
  ${EndIf}

  ; --- DSH_HOME user environment variable -----------------------------------
  ; Write only for fresh install or full reinstall; preserve mode keeps the
  ; existing value so the user's manual adjustments are not overwritten.
  ${If} $R9 != "2"
    WriteRegStr HKCU "Environment" "DSH_HOME" "$INSTDIR\data"
    SendMessage ${DSH_HWND_BROADCAST} ${DSH_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
    DetailPrint "DSH_HOME set to $INSTDIR\data (user environment variable)"
  ${Else}
    DetailPrint "DSH: preserving existing DSH_HOME environment variable"
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
