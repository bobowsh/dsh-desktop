---

title: "Wiki Overview"
type: Module
description: "DSH Desktop 是一个基于 DeepSeek Harness 的跨平台桌面应用。它作为 Electron host，整合了 Harness 的 Agent 运行时和 Web UI，提供本地桌面体验。"
generated: { by: codewiki/5.5.0, at: 2026-08-30T13:32:12Z }
stale_after: 2026-11-28
aliases: [wiki_overview]
status: stable

---

# DSH Desktop 项目概览

## 项目简介

DSH Desktop 是一个基于 DeepSeek Harness 的跨平台桌面应用。它作为 Electron host，整合了 Harness 的 Agent 运行时和 Web UI，提供本地桌面体验。

## 核心架构

- **Electron Main**：应用主进程，负责生命周期、窗口管理、IPC 和原生功能
- **Isolated Node Harness**：独立的 Node 进程，运行 DeepSeek Harness 运行时
- **Web UI**：在 Sandboxed BrowserWindow 中渲染 Harness 前端 UI
- **Preload IPC**：预加载脚本，通过受限 IPC 连接 Main 和 Renderer
- **Persistent Data**：用户数据、会话、设置、插件存储在 Electron userData 目录下

## 目录结构概览

```
src/
├── main/              主进程代码
│   ├── runtime/       Harness 进程生命周期
│   ├── state/         状态管理、恢复、Safe Mode
│   ├── mobile/        手机桥接与 Cloudflare 隧道
│   └── update/        自动更新管理
├── preload/           预加载脚本
└── shared/            共享合约与菜单定义

docs/                文档（Markdown）
patches/             可追踪的补丁包
packages/            绑定的桌面支持包
scripts/             构建、签名、验证工具
```

## 关键文件

- `package.json` - 项目配置，依赖与脚本
- `README.md` - 项目说明（中英文等多语言）
- `AGENTS.md` - 当前会话代理说明
- `openwiki/` - OpenWiki 生成的证据索引

## 开发流程

1. `npm ci` 安装依赖并应用 patch-package 补丁
2. `npm run dev` 启动开发模式
3. 修改代码后运行 `npm test`、`npm run typecheck`、`npm run build`
4. 打包使用对应平台命令：`npm run package:win`、`npm run package:mac:*`

## 平台支持

| 平台                  | 状态                |
| ------------------- | ----------------- |
| macOS Apple Silicon | 支持（已签名 notarized） |
| macOS Intel         | 支持（已签名 notarized） |
| Windows x64         | 支持（已签名 NSIS 安装器）  |
| Windows ARM64       | 暂不支持              |
| Linux               | 暂不支持              |

## 数据安全

- Harness Web UI 仅在 loopback 端口服务
- 渲染进程无 Node.js 特权，使用上下文隔离和沙箱
- 用户配置和会话存储在 Electron userData 目录，不在安装目录内
- 更新检查由应用内部管理，用户可控