---
okf_version: "0.2"
aliases:
- 项目文档索引
- 文档索引
- 知识笔记索引
---

<!-- 自动生成于 2026-08-30T23:16:05+08:00 | Health Score: 90/100 | 本文件由系统自动维护 -->

# 项目文档索引

## 入门指引

* [阅读指南](reading-guide.md) - > 基于 PageRank 依赖分析自动生成。排名越靠前的组件被越多模块依赖，建议优先阅读。

## 模块文档

* [Wiki Overview](modules/wiki_overview.md) - DSH Desktop 是一个基于 DeepSeek Harness 的跨平台桌面应用。它作为 Electron host，整合了 Harness 的 Agent 运行时和 Web UI，提供本地桌面体验。
* [Architecture](modules/architecture.md) - DSH Desktop 作为 DeepSeek Harness 的 Electron host，不维护第二套 Agent 运行时，也不重实现 Harness 前端。其核心价值在于提供原生桌面能力：启停 Harness、原生目录管理、系统主题
* [Development](modules/development.md) - - Node.js 22 或更高版本
* [Harness 运行时与子进程管理（harness-runtime）](modules/harness-runtime.md) - 把 DeepSeek Harness 作为内置 Node 子进程拉起、探活、采集日志并从日志正则定位故障插件——HarnessRuntime 生命周期状态机、就绪探测（token+HTTP）、shell 环境解析、profile 插件安装/
* [Preset Packages](modules/preset-packages.md) - DSH Desktop 作为 `.dshpreset` 文件交换自定义 Agent preset。一个包是一个布局如下的 ZIP 归档：
* [Profile 状态管理与自愈（profile-state）](modules/profile-state.md) - 桌面外壳在 Harness 启动前对 web profile（node_modules + cordis 插件配置）做兼容性/一致性检测、损坏修复、插件隔离与卸载清理，并通过 generation 代次机制与 macOS launchd 审
* [Release Runbook](modules/release-runbook.md) - Windows 打包和签名作为单独的 job 运行。GitHub-hosted Windows runner 构建未签名的 NSIS 安装器并上传短暂的工作流 artifact。本地 macOS ARM64 runner 下载它，使用 Js
* [共享契约与类型（shared-contracts）](modules/shared-contracts.md) - 主进程与预加载层共用的类型真相源——运行时阶段、更新状态、桌面菜单命令联合类型与特性开关，是 main/preload 两 bundle 之间 IPC 的 wire format。
* [安全模式与插件恢复视图（recovery-views）](modules/recovery-views.md) - 把"运行时日志诊断结果 + profile 兼容性扫描结果"翻译为用户可操作的中英双语视图模型——安全模式页（停用第三方插件/卸载）与启动修复页（定位具体插件、解释失败原因、引导卸载或进入安全模式）。
* [应用引导与主进程生命周期（app-bootstrap）](modules/app-bootstrap.md) - Electron 主进程入口——app 生命周期、窗口创建、便携 DSH_HOME、内置 Node/pnpm/dsh 路径解析、Harness 启动编排（检测→修复→generation→启动→失败回滚）、IPC handler、托盘/菜单
* [构建与打包工具链（build-tooling）](modules/build-tooling.md) - electron-vite 三段构建（main/preload）、electron-builder 打包配置（Win NSIS / Mac dmg+zip、asar 关闭、extraResources/extraFiles）、bundle-
* [桌面扩展插件包（desktop-extensions）](modules/desktop-extensions.md) - 随桌面外壳分发的 4 个本地 Cordis 插件——品牌 UI 占位（client-ui）、打包环境 HMR 回退（hmr-fallback）、插件市场固定目标安装器（market-installer，含环回校验的 HTTP 安装路由与包内
* [移动端配对桥接（mobile-bridge）](modules/mobile-bridge.md) - Electron 主进程内的手机配对桥：在局域网或公网隧道上暴露一个带配对授权的 HTTP/WebSocket 网关，把手机浏览器的请求代理到本机 Harness web server，使手机可查看会话、回答 agent 提问并推送指令。
* [窗口外壳与平台集成（window-shell）](modules/window-shell.md) - BrowserWindow 安全加固、导航与 cookie 策略、右键菜单、托盘、GPU 崩溃分级降级、窗口恢复、macOS launchd 守护判别与版本信息——主进程中围绕"窗口"这一资源的全部平台相关策略。
* [自动更新（auto-update）](modules/auto-update.md) - 基于 electron-updater 的更新状态机——平台策略门控、延迟+抖动的启动检查、6 小时间隔与 resume 检查、用户同意后才下载、按版本持久化跳过、IPC 推送状态给预加载层提示条。
* [预加载层与桌面 UI 注入（preload-ui）](modules/preload-ui.md) - 运行在 renderer 上下文的 preload 脚本——在不改 Harness 前端源码的前提下，用 DOM 注入桌面专属 UI（更新提示卡、移动配对按钮、安全模式横幅）、侦测启动失败与插件加载错误、挂载 Windows 自定义标题栏/
