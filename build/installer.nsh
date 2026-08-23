; ============================================================================
; DSH Desktop installer NSIS customizations
; ============================================================================
; 1) Assisted-installer directory page: allow installing to a Windows drive
;    root ("D:" / "D:\" are normalized to D:\<AppName>).
; 2) customInstall: seed the bundled harness data (resources\data ->
;    $INSTDIR\data) and create the dsh.cmd root shortcut. customUnInstall
;    removes the shortcut but preserves the user's $INSTDIR\data.
; ;
; Part 1 originated upstream (fix: allow Windows drive-root installation),
; part 2 was merged from build/install-user-data.nsh (portable data layout).
; Part 3: record DSH_HOME as a user environment variable so processes spawned
; outside the desktop shell (CLI, editors) resolve the same harness home.
; ============================================================================

!include "LogicLib.nsh"

; --- DSH_HOME user environment variable (install + uninstall) ---------------
; WM_SETTINGCHANGE broadcast makes Explorer / newly spawned processes pick up
; the change immediately without a reboot.
!define DSH_WM_SETTINGCHANGE 0x001A
!define DSH_HWND_BROADCAST 0xFFFF

!ifndef BUILD_UNINSTALLER
  !ifndef ONE_CLICK
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

    ; Auto-create the installation directory tree before install begins.
    ; This allows users to type any path (e.g. D:\dsh-desktop) directly
    ; without needing to pre-create parent folders first.
    !define MUI_PAGE_CUSTOMFUNCTION_LEAVE DshEnsureInstDirExists

    Function DshEnsureInstDirExists
      CreateDirectory "$INSTDIR"
    FunctionEnd

    ; Accept any directory path the user types, even if it does not exist yet.
    ; Without this override NSIS rejects non-existent paths before the user
    ; can click Next.
    !macro preInit
    !macroend
    Function .onVerifyInstDir
      ; Always pass — we create the directory in DshEnsureInstDirExists.
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
  ; --- 第一步：安装前备份用户数据目录，带时间戳 ---------------------------
  ${If} ${FileExists} "$INSTDIR\data\*.*"
    ; 生成时间戳，格式：YYYY-MM-DD_HH-MM-SS（例如 2024-01-15_14-30-45）
    StrTime $0 "%Y-%m-%d_%H-%M-%S"
    ; 确定备份根目录：优先 D盘，回落 E盘
    StrCpy $1 "D:\dsh-backup"
    StrCpy $2 "E:\dsh-backup"
    ${If} ${DirExists} "$1"
      ; 构建备份路径：D:\dsh-backup\YYYY-MM-DD_HH-MM-SS
      StrCpy $3 "$1\$0"
      ; 确保目录存在（CopyDirectory 可能需要）
      ${If} ${DirExists} "$3"
        ; 目录已存在
      ${Else}
        ${MKDir} "$3"
      ${EndIf}
      CopyDirectory /r "$INSTDIR\data" "$3"
      DetailPrint "DSH: 已备份用户数据到 $3 (时间戳 $(^$0))"
    ${ElseIf} ${DirExists} "$2"
      ; 构建备份路径：E:\dsh-backup\YYYY-MM-DD_HH-MM-SS
      StrCpy $3 "$2\$0"
      ${If} ${DirExists} "$3"
        ; 目录已存在
      ${Else}
        ${MKDir} "$3"
      ${EndIf}
      CopyDirectory /r "$INSTDIR\data" "$3"
      DetailPrint "DSH: 已备份用户数据到 $3 (时间戳 $(^$0))"
    ${Else}
      ; 两个盘都不存在，记录警告但继续
      DetailPrint "DSH: 备份目录不可达，跳过备份（建议确保 D: 或 E: 盘有写入权限，或手动备份）"
    ${EndIf}
  ${Else}
    ; $INSTDIR\data 不存在，无需备份（首次安装）
  ${EndIf}
  
  ; --- 第二步：若有现有数据，弹出选择对话框 -------------------------------
  ${If} ${FileExists} "$INSTDIR\data\*.*"
    ; --- 创建选择对话框 ---------------------------------------------------
    ${NSD_Create} "DSHPluginChoice"
    ${NSD_SetText} $DSHPluginChoice "DSH 安装向导"
    ${NSD_SetText} $DSHPluginChoice "检测到已安装的插件和技能。请选择操作方式："
    ${NSD_AddCheckbox} $DSHPluginChoice "1. 全新安装（删除用户插件/技能，安装安装包里的）"
    ${NSD_AddCheckbox} $DSHPluginChoice "2. 保留用户插件/技能（保留原有插件/技能，仅安装新的）"
    ${NSD_AddSeparator} $DSHPluginChoice
    ${NSD_AddButton} $DSHPluginChoice "确定" 1
    ${NSD_AddButton} $DSHPluginChoice "取消" 2
    ${If} ${NSD_GetCheckbox} $DSHPluginChoice 1 == "1"
      ${NSD_Destroy} $DSHPluginChoice
      ${If} ${FileExists} "$INSTDIR\data\settings.yaml"
        RMDir /r "$INSTDIR\data"
        ; 删除后回退到下面的“未安装”分支，执行全新拷贝
      ${EndIf}
    ${ElseIf} ${NSD_GetCheckbox} $DSHPluginChoice 2 == "1"
      ${NSD_Destroy} $DSHPluginChoice
      DetailPrint "DSH: 保留用户数据模式 — 保留原有插件/技能，仅安装新的"
      ; 仅更新模式：不删除 $INSTDIR\data，而是执行文件级覆盖
      CopyFiles /SILENT "$INSTDIR\resources\data" "$INSTDIR"
      ${If} ${FileExists} "$INSTDIR\data\settings.yaml"
        ; 已有数据保持不变，不再额外操作
      ${EndIf}
    ${Else}
      ${NSD_Destroy} $DSHPluginChoice
      DetailPrint "DSH: 用户取消安装，保持现状"
    ${EndIf}
    ; ----------------------------------------------------------------
    ${If} ${NSD_GetCheckbox} $DSHPluginChoice 1 == "1"
      ; 已在上面 RMDir 并回退到“未安装”逻辑，下面的写注册表等会正常执行
    ${ElseIf} ${NSD_GetCheckbox} $DSHPluginChoice 2 == "1"
      ; 仅更新模式已执行 CopyFiles，此处不再重复写 DSH_HOME，
      ; 保持现有的环境变量不变，避免覆盖用户可能手动调整过的设置。
    ${EndIf}
  ${EndIf}

  ; --- 第三步：常规安装流程继续 (dsh.cmd shim, DSH_HOME 等) ---------------
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

  ; --- DSH_HOME user environment variable -----------------------------------
  ; Point DSH_HOME at the harness data dir shipped next to the executable so
  ; external processes (shell, CLI shims, editor integrations) resolve the
  ; same harness home as the desktop shell.
  ; 仅在“全新安装”模式下写入，保留用户可能手动调整的设置
  ${If} ${NSD_GetCheckbox} $DSHPluginChoice 1 == "1"
    WriteRegStr HKCU "Environment" "DSH_HOME" "$INSTDIR\data"
    SendMessage ${DSH_HWND_BROADCAST} ${DSH_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
    DetailPrint "DSH_HOME set to $INSTDIR\data (user environment variable)"
  ${ElseIf} ${NSD_GetCheckbox} $DSHPluginChoice 2 == "1"
    ; 保留用户模式：不重写 DSH_HOME，保持现有设置不变
    DetailPrint "DSH: 保留用户 DSH_HOME 环境变量（保持现状）"
  ${EndIf}
!macroend

!macro customUnInstall
  ; Remove the root CLI shortcut only. $INSTDIR\data holds the user's runtime
  ; data (sessions, credentials, ...) and must survive uninstall.
  Delete "$INSTDIR\dsh.lnk"

  ; Remove DSH_HOME only when it still points at this installation's data dir
  ; (never clobber a value the user has re-pointed elsewhere).
  ReadRegStr $0 HKCU "Environment" "DSH_HOME"
  ${If} $0 == "$INSTDIR\data"
    DeleteRegValue HKCU "Environment" "DSH_HOME"
    SendMessage ${DSH_HWND_BROADCAST} ${DSH_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
    DetailPrint "Removed DSH_HOME user environment variable"
  ${EndIf}
!macroend