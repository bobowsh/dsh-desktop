---
type: Module
title: 窗口外壳与平台集成（window-shell）
description: BrowserWindow 安全加固、导航与 cookie 策略、右键菜单、托盘、GPU 崩溃分级降级、窗口恢复、macOS launchd 守护判别与版本信息——主进程中围绕"窗口"这一资源的全部平台相关策略。
resource: src/main/（security*.ts, window-*.ts, gpu-fallback.ts, context-menu*.ts, close-to-tray.ts, launchd-guard.ts, version-info.ts, application-locale.ts, windows-menu-view.ts, main-window-recovery.ts）
tags: [electron, 窗口, 菜单, 安全, gpu, 平台集成, macos, windows]
generated: { by: codewiki/5.2.0, at: 2026-09-01T00:00:00Z }
status: stable
stale_after: 2026-12-01
---

# 窗口外壳与平台集成（window-shell）

本模块聚合主进程中围绕 `BrowserWindow` 的横切策略：安全加固、导航/鉴权、菜单、托盘、GPU 降级自愈、平台差异。它们都是无状态/小状态的纯函数或单一安装函数，由 [[app-bootstrap]] 在创建窗口前后调用。

## 架构概述

```mermaid
flowchart TD
  BOOT["app-bootstrap<br/>createWindow()"] --> SEC["secureWindow()<br/>安全加固"]
  BOOT --> NAV["window-navigation<br/>URL/cookie 策略"]
  BOOT --> MENU["installMenu / installContextMenu<br/>应用菜单 + 右键菜单"]
  BOOT --> GPU["gpu-fallback<br/>启动开关 + 崩溃监听"]
  BOOT --> REC["main-window-recovery<br/>渲染进程丢失重载"]

  SEC --> POLICY{"security-policy"}
  POLICY -->|可信| ALLOW["允许导航/开窗"]
  POLICY -->|外部 http(s)| EXT["shell.openExternal"]
  POLICY -->|其余| DENY["deny / preventDefault"]

  GPU -.崩溃事件.-> PLAN["planGpuFallbackResponse()"]
  PLAN -->|未渲染即崩| RELAUNCH["降级并立即重启"]
  PLAN -->|已渲染| COUNT["累计 failures，记录于磁盘"]
  REC -->|≤3 次且冷却 5s| RELOAD["reload 主窗口"]
```

## 组件约束索引

| Component | Constraints | Risks | Summary |
|-----------|------------|-------|---------|
| `secureWindow` | 4 | 2 | 拦截导航/开窗/webview/权限，仅放行可信 URL |
| `planGpuFallbackResponse` | 3 | 2 | 未渲染即崩→立即降级重启；已渲染→累计 3 次才降级且不重启 |
| `shouldReloadAfterMainWindowRendererLoss` | 2 | 1 | 最多重载 3 次、冷却 5 秒，防止死循环耗尽 GPU |
| `desktopHarnessUrl` | 2 | 2 | token 仅挂首次导航；Win 附加 dsh-desktop-mode 参数 |
| `canGrantWindowPermission` | 3 | 1 | 仅 clipboard/notifications + 主框架 + Harness 源 |
| `clearStaleHarnessAuthCookies` | 1 | 2 | 清理 dsh-auth-* 旧 cookie，避免 HTTP 431 |
| `raiseWindowWithoutStealingFocus` | 2 | 1 | macOS 自动抬窗用 showInactive 不抢焦点 |
| `buildContextMenuTemplate` | 2 | 1 | 环回链接不提供"浏览器打开"，按编辑态/选区裁剪项 |
| `isDaemonLaunch` / `isUserInitiatedInstance` | 2 | 1 | macOS 区分 launchd 守护启动与用户双击 |

## 组件职责

### 安全加固：security.ts + security-policy.ts

`secureWindow(window)` 对每个窗口的 `webContents` 安装四道防线：

1. **`setWindowOpenHandler`**：新窗口请求中，`isTrustedAppUrl` 为真才 `allow`；`http(s)` 外部链接交给 `shell.openExternal`（系统默认浏览器）；其余 `deny`。
2. **`will-navigate`**：导航到非可信 URL 时 `preventDefault()`，外部 http(s) 同样转外部浏览器。
3. **`will-attach-webview`**：无条件 `preventDefault()`——禁止页面内嵌 `<webview>`。
4. **权限处理器**（`setPermissionCheckHandler` / `setPermissionRequestHandler`）：统一走 `canGrantWindowPermission`。

`isTrustedAppUrl` 信任三类来源：`file:`、自定义的 `dsh-recovery:` 协议（故障恢复页）、以及 `isHarnessUrl`——**仅** `http://127.0.0.1` 或 `http://localhost`（任意端口）。`canGrantWindowPermission` 进一步收紧：权限名必须在 `['clipboard-sanitized-write', 'notifications']` 白名单内、必须是主框架、请求 URL 必须是 Harness 源。

> 设计要点：Harness 前端是加载自本地随机端口的 web 应用，桌面外壳把它当作"半可信本地内容"——允许它在自己的 origin 内运行，但禁止它导航出去、嵌入 webview、或申请敏感权限。

### 导航与鉴权：window-navigation.ts

- `desktopHarnessUrl(url, platform, authToken?)`：构造窗口首次加载的 URL。0.1.2-alpha.1 起 Host 在派发前对整个 API 鉴权，**只有 `GET /?token=...`** 能用每进程启动令牌换取签名会话 cookie；因此首次导航必须带上 `?token=`，之后 Chromium 自动带 cookie。Windows 还附加 `dsh-desktop-mode=advanced` 与 `dsh-desktop-platform` 参数。
- `shouldLoadHarnessUrl(current, target)`：origin 变化才允许加载（`about:blank`/空 URL 放行），避免同源内重复导航打断会话。
- `clearStaleHarnessAuthCookies(cookies, rendererUrl, authToken?)`：Harness 的会话 cookie 名含随机端口（`dsh-auth-` 前缀），而 cookie 本身不按端口隔离——每次重启都在 127.0.0.1 留下一个 30 天 cookie，累积到请求头过大时 Node 会返回 **HTTP 431**。此函数在启动时清掉旧 `dsh-auth-*` cookie。
- `isAbortedNavigationError`：识别 `ERR_ABORTED (-3)`（导航被 `will-navigate` 拦截时的预期错误），避免误报为崩溃。

### GPU 降级自愈：gpu-fallback.ts

部分 Windows 机器（虚拟显示器驱动 Todesk/GameViewer 叠加 AMD 核显）无法在 sandbox 内启动 Chromium GPU 进程，报 `0x80000003`，渲染进程随之退出，页面 `ERR_FAILED`。GPU 开关必须在 Chromium 启动前就位，因此把"上次成功的降级级别"持久化到磁盘、下次启动应用。

三级降级阶梯（`gpuFallbackSwitches`，每级保留上级开关）：

```mermaid
stateDiagram-v2
  [*] --> default
  default --> sandbox_disabled: 未渲染即崩 / 累计3次丢失
  sandbox_disabled --> gpu_disabled: 再次触发阈值
  sandbox_disabled --> default: 连续20次稳定启动(探针)
  gpu_disabled --> sandbox_disabled: 连续20次稳定启动(探针)
  gpu_disabled --> gpu_disabled: 已是最后一级，不再重启(防无限重启)
  note right of default: 无开关
  note right of sandbox_disabled: --disable-gpu-sandbox
  note right of gpu_disabled: --disable-gpu-sandbox<br/>--disable-gpu<br/>--disable-gpu-compositing
```

判定规则（`planGpuFallbackResponse`）：
- **harness 从未渲染成功** → 单次 GPU 丢失即降级并 `relaunch: true`（用户什么都没看到，重启无损失）。
- **已渲染后丢失** → GPU 进程会被 Chromium 自动重启，窗口可自愈；累计 `failures` 到阈值 `GPU_FALLBACK_FAILURE_THRESHOLD = 3` 才降一级，但**只记录到磁盘、本次不重启**（不打断用户正在做的事）。
- `clean-exit` / `killed`（退出时 Chromium 拆 GPU 进程）不算致命（`isGpuLossFatal`），否则每个退出应用的用户都会被降级。
- 回升路径 `planStableLaunch`：在降级级别连续 `GPU_FALLBACK_PROBE_LAUNCHES = 20` 次稳定启动后，下次尝试回升一级——给更换硬件/更新驱动/卸载虚拟显示器的机器恢复硬件加速的机会。
- 状态经 `serializeGpuFallbackState`/`parseGpuFallbackState` 以 JSON 持久化，解析失败回退 `defaultGpuFallbackState`。

### 渲染进程丢失恢复：main-window-recovery.ts

Windows 上 GPU 进程死亡后 Electron 默认留下一个"画好了但空白"的窗口，reload 通常即可恢复。`shouldReloadAfterMainWindowRendererLoss` 给重加载加双闸门：**最多 `MAIN_WINDOW_RECOVERY_MAX_RELOADS = 3` 次**、两次间隔至少 `MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS = 5000` ms——防止同一根因反复触发导致紧循环 reload 耗尽 GPU。

### 菜单

- **右键菜单**（`context-menu.ts` + `context-menu-template.ts`）：`buildContextMenuTemplate(state, locale, actions)` 按页面状态拼装——链接区（`isExternalWebUrl` 为真才给"在浏览器中打开"，环回链接只给复制地址）、图片区（复制图片）、编辑区（可编辑元素给 undo/redo/cut/copy/paste/selectAll，按 `editFlags` 置灰；非编辑区仅有选区时给复制/全选）。文案内建 en/zh 双语（`labels`）。
- **应用菜单与托盘**：由 [[app-bootstrap]] 的 `installMenu`/`ensureTray`/`executeDesktopMenuCommand` 处理，命令联合类型见 [[shared-contracts]]。
- **Windows 自定义菜单**：`windows-menu-view.ts` 的 `windowsMenuViewBounds` 计算菜单子窗口/按钮在标题栏的矩形位置（标题栏高 36、caption 按钮区 140、菜单面板宽 304、最大高 760；全屏时不预留 caption 区）。实际菜单 DOM 由 [[preload-ui]] 的 `windows-menu` 挂载。

### 平台差异小工具

- `close-to-tray.ts`：`shouldKeepRunningInBackground` —— 仅 Windows 且非显式退出时关窗驻留托盘。
- `window-raise.ts`：`raiseWindowWithoutStealingFocus` —— macOS 上自动触发的抬窗（如配对请求）在 app 非前台时用 `showInactive()`，不抢用户当前应用焦点；用户主动操作与非 macOS 走正常 restore/show/focus。
- `launchd-guard.ts`（macOS）：`isDaemonLaunch` 通过 `XPC_SERVICE_NAME` 判断进程是否由 launchd 守护启动（GUI 启动名以 `application.` 开头）；`isUserInitiatedInstance` 判别 second-instance 事件是否真为用户双击（helper binary、`.js/.mjs/.cjs` 脚本参数视为合成启动，不因此弹窗口）。
- `application-locale.ts`：`resolveHarnessLocale(preference, systemLanguages)` —— 用户显式 `zh`/`en` 优先，否则按系统语言首项是否以 `zh` 开头决定。
- `version-info.ts`：`bundledHarnessVersion` 先读已安装的 `node_modules/@deepseek-ai/dsh/package.json` 版本，回退到 app `package.json` 依赖声明；`aboutDetail` 生成中英双语"关于"文本。

## 关键业务约束

- **只信任环回 HTTP 与 file:/dsh-recovery: 协议**（confidence: 0.95）
  > Evidence: `security-policy.ts:4-20` `isHarnessUrl` 限定 `http:` + `127.0.0.1/localhost`；`isTrustedAppUrl` 另放行 `file:`/`dsh-recovery:`。—— 任何外网/局域网地址都不可在应用窗口内导航。

- **权限白名单 + 主框架 + Harness 源三重条件**（confidence: 0.95）
  > Evidence: `security-policy.ts:23-35` `ALLOWED_PERMISSIONS = ['clipboard-sanitized-write','notifications']` 且要求 `isMainFrame` 与 `isHarnessUrl(requestingUrl)`。

- **GPU 降级"难进入、非永久"**（confidence: 0.9）
  > Evidence: `gpu-fallback.ts:41,52` 阈值 3 次/20 次探针；`planGpuFallbackResponse` 已渲染场景不重启；末级不再 relaunch。—— 注释明确 "deliberately hard to enter and never permanent"。

- **重载自愈必须有次数与冷却上限**（confidence: 0.9）
  > Evidence: `main-window-recovery.ts:1-2,22-24` `MAX_RELOADS=3`、`COOLDOWN=5000`。

- **启动令牌只用于首次根路径导航**（confidence: 0.9）
  > Evidence: `window-navigation.ts:16-27` 注释与 `desktopHarnessUrl` 仅在 `authToken !== undefined` 时挂 `?token=`；API 路径拒绝令牌。

- [candidate] Windows 关窗默认驻留托盘、macOS 关窗退到 Dock（confidence: 0.5）
  > Evidence: `close-to-tray.ts:6` 仅 `platform === 'win32'` 返回 true；macOS 行为由 app-bootstrap 的窗口关闭处理约定，需结合 index.ts 确认。

## 数据流与状态

本模块多数函数无状态；唯一持久化状态是 **GPU 降级状态**（JSON 文件，路径由 [[app-bootstrap]] 的 `gpuFallbackStatePath` 决定）：启动时 `readGpuFallbackState` → `gpuFallbackSwitches(level)` 注入 Chromium 命令行 → 运行中监听 GPU/渲染进程丢失 → `planGpuFallbackResponse` 决定是否降级/重启 → `writeGpuFallbackState` 落盘；稳定启动累计经 `planStableLaunch` 回升。

## 与其他模块的关系

- [[app-bootstrap]]：调用本模块全部安装函数（secureWindow、菜单、GPU watch、托盘），持有窗口实例与 GPU 状态文件。
- [[shared-contracts]]：消费 `WINDOWS_TITLEBAR_HEIGHT` 与菜单命令类型。
- [[preload-ui]]：Windows 菜单/标题栏的 renderer 侧实现。
- [[harness-runtime]]：GPU/渲染进程丢失与 Harness 子进程故障的区分在 app-bootstrap 汇聚。

## 跨模块引用

- Harness 子进程启动与就绪探测见 [[harness-runtime]]。
- 故障页/安全模式页使用 `dsh-recovery:` 协议，见 [[recovery-views]]。
