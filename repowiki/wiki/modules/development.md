---

title: "Development"
type: Module
description: "- Node.js 22 或更高版本"
generated: { by: codewiki/5.5.0, at: 2026-08-30T13:35:06Z }
stale_after: 2026-11-28
aliases: [development]
status: stable

---

# DSH Desktop 开发指南

## 前提条件

- Node.js 22 或更高版本
- npm
- macOS (Apple Silicon 或 Intel) 或 Windows x64

DSH Desktop 当前锁定 `@deepseek-ai/dsh@0.1.1-rc.2`。Windows 打包捆绑了 target-native Node.js 运行时，而 macOS 使用 Electron UtilityProcess。两者均独立于运行开发命令的 Node.js 版本。

## 本地设置

```bash
git clone https://github.com/dataelement/dsh-desktop.git
cd dsh-desktop
npm ci
npm run dev
```

`npm ci` 执行仓库的 `postinstall` 钩子。它重新应用跟踪的 `patch-package` 补丁，将 DSH brand assets 安装到固定的 Harness 前端，并安装 Electron。

### 开发构建隔离

开发构建使用独立的应用名称 `DSH Desktop Dev` 和独立的 user-data 目录 `dsh-desktop-dev`，因此它们不重用生产 DSH Desktop 数据。多个 development worktrees 默认共享该 development profile；在测试 profile、plugin、迁移或恢复变更时，避免同时运行它们。

## 验证

提交更改前运行核心检查：

```bash
npm test
npm run typecheck
npm run build
```

静态检查无法替代运行时验证。影响启动、profile、plugin、native dialogs、updates、mobile access 或 packaging 的变更，也应通过对应的真实应用流程进行验证。

### Cloudflare 失败模拟

为在不扰乱机器网络的情况下测试 Cloudflare-to-Pinggy 降级：

```bash
DSH_TUNNEL_FORCE_PINGGY=1 npm run dev
```

启动后从手机连接屏幕启用临时公开隧道。应应报告 `pinggy` 状态，生成的 URL 应使用 Pinggy 主机名。此变量仅影响从该命令启动的进程；省略后可恢复正常的 Cloudflare-first 行为。

## 项目映射

```
src/main/                 Electron 主进程与应用编排
src/main/runtime/         Harness 进程生命周期与诊断
src/main/state/           Profile 一致性、修复、恢复、Safe Mode
src/main/mobile/          配对手机桥接与可选 Cloudflare 隧道
src/main/update/          已安装构建更新状态与生命周期
src/preload/              受限渲染器到主进程 IPC 与桌面 UI 粘性点
src/shared/               共享合约与桌面菜单定义
packages/                 绑定的桌面支持包
patches/                  固定 Harness 包的可追踪补丁
build/                    打包的 HTML、图标、加载器与 Harness 入口文件
scripts/                  构建、签名、元数据与目标验证工具
test/                     单元测试与源码契约回归覆盖
.github/workflows/        原生 CI、签名、发布与出版工作流
```

## 维护上游补丁

桌面产品有意重用 upstream Harness UI。桌面特定的 provider onboarding、preset transfer、model selection、workspace、branding 和 layout 变更捕获在 `patches/` 中，而不是存储为 `node_modules` 中的未跟踪编辑。

### 升级 Harness

1. 安装目标上游版本
2. 验证当前 Settings、Credentials、Provider Directory、workspace 和 preset 合约
3. 重新编写或重新应用每个桌面定制化
4. 重新生成相关的 `patch-package` 补丁
5. 运行完整的自动化套件
6. 启动真实应用并验证每个受影响的用户流

## Packaging

Harness 包含 architecture-specific native dependencies。必须在将要运行的操作系统和架构上构建每个安装程序。

```bash
# macOS Apple Silicon，在 Apple Silicon Mac 或 runner 上
npm run package:mac:arm64

# macOS Intel，在 Intel Mac 或 runner 上
npm run package:mac:x64

# Windows x64 NSIS installer，在 Windows x64 机器或 runner 上
npm run package:win
```

**切勿**从 macOS 或 Linux 调用 `electron-builder --win` 以生成分发用的 Windows 包。目标验证脚本明确拒绝 host/target 不匹配。

对于本地未签名的开发包，使用对应的 `package:dev:*` 命令。交付 Windows 安装器前，验证 `win-unpacked` 中是否存在 `resources/app/node_modules/node/bin/node.exe`，并要求打包的 Windows Harness smoke test 通过。

正式发布的构建、签名和发布由 tag workflow 完成。本地构建或 pull-request check 不是正式发布证据。

## contributor hygiene

- 问题、日志、截图、fixtures 或 test data 中**绝不**包含真实的 API keys
- 保留无关的 worktree 变更
- 暂时性研究、本地报告和内部工作文档保留在被忽略的 `doc/` 目录下
- 更改用户可见事实时，更新所有本地化的 README 文件