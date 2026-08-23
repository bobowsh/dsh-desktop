; ============================================================================
; DSH Desktop installer NSIS customizations
; ============================================================================
; 1) Assisted-installer directory page: allow installing to a Windows drive
;    root ("D:" / "D:\" are normalized to D:\<AppName>).
; 2) customInstall: seed the bundled harness data (resources\data ->
;    $INSTDIR\data) and create the dsh.cmd root shortcut. customUnInstall
;    removes the shortcut but preserves the user's $INSTDIR\data.
; Part 3: record DSH_HOME as a user environment variable so processes spawned
; outside the desktop shell (CLI, editors) resolve the same harness home.
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
;
; Flow:
;   1. If $INSTDIR\data already exists → backup to D:\dsh-backup\<timestamp>
;      (fallback E:\) then ask the user:
;        Yes  → full reinstall  (delete data, re-seed, rewrite DSH_HOME)
;        No   → preserve/merge  (overlay new files, keep existing DSH_HOME)
;   2. If $INSTDIR\data does not exist → fresh install (seed + write DSH_HOME)
; ============================================================================

!macro customInstall
  ; --- $R9 = install mode flag: 0=fresh, 1=full, 2=preserve ----------------
  StrCpy $R9 "0"

  ; --- Step 1: backup existing user data ------------------------------------
  ${If} ${FileExists} "$INSTDIR\data\*.*"
    ; Build timestamp via GetTime plugin (ships with NSIS 3.x)
    GetTime::GetLocal
    Pop $0  ; year
    Pop $1  ; month
    Pop $2  ; day
    Pop $3  ; hour
    Pop $4  ; minute
    Pop $5  ; second
    Pop $6  ; day-of-week
    Pop $7  ; day-of-year
    ; Format: YYYY-MM-DD_HH-MM-SS  (no leading-zero padding needed for dir name)
    StrCpy $8 "$0-$1-$2_$3-$4-$5"

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

    ; --- Step 2: ask user choice (MessageBox — always available) -------------
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "DSH has existing user data in $\r$\n\
       $INSTDIR\data$\r$\n$\r$\n\
       [Yes] Full install — delete user plugins/skills and install from package$\r$\n\
       [No]  Preserve — keep existing plugins/skills, only add new ones" \
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
