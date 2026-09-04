---

title: "Release Runbook"
type: Module
description: "Windows 打包和签名作为单独的 job 运行。GitHub-hosted Windows runner 构建未签名的 NSIS 安装器并上传短暂的工作流 artifact。本地 macOS ARM64 runner 下载它，使用 Jsign 和 SafeNet UKey 签名安装器，重新生成 blockmap 和 `latest.yml`，并上传已签名的 release 集。GitHub R…"
generated: { by: codewiki/5.5.0, at: 2026-08-30T13:35:40Z }
stale_after: 2026-11-28
aliases: [release-runbook]
status: stable

---

# Desktop 发布说明书

## 本地 Windows UKey 签名运行器

Windows 打包和签名作为单独的 job 运行。GitHub-hosted Windows runner 构建未签名的 NSIS 安装器并上传短暂的工作流 artifact。本地 macOS ARM64 runner 下载它，使用 Jsign 和 SafeNet UKey 签名安装器，重新生成 blockmap 和 `latest.yml`，并上传已签名的 release 集。GitHub Release job 在签名成功之前不能启动。

### 本地 runner 准备

1. 使用 `self-hosted`、`macOS` 和 `ARM64` 标签注册它
2. 安装 SafeNet Authentication Client 并确认 `/usr/local/lib/libeTPkcs11.dylib` 可读
3. 在推送 release tag 前连接 UKey
4. 在 GitHub 仓库中，打开 **Settings → Secrets and variables → Actions**，创建名为 `DESKTOP_WINDOWS_SIGNING_PIN` 的仓库 secret，包含 UKey PIN。更强的发布控制可使用环境 secret，并将匹配的 `environment` 添加到 `sign-windows` job

### 工作流细节

工作流 pins Jsign 7.5 通过 SHA-256，并使用 SafeNet `ETOKEN` store，SHA-256 signing，以及 DigiCert RFC 3161 timestamp。GitHub 仅在 signing step 中注入 PIN。该 step 将其复制到 mode-`600` 的临时文件，从 shell environment 中移除，且在 step 退出时删除该文件。workflow 永不打印 PIN 也不会作为命令行参数传递。

### 验证

发布成功后，验证 Windows 安装器显示预期的 publisher 并在其 Digital Signatures 属性中拥有有效的 RFC 3161 timestamp。永不重用已发布的 tag；修复问题并发布新版本。

## 更新流程

已发布的 macOS 和 Windows 构建使用 `electron-updater`。应用启动后不久、每六小时以及长系统恢复后检查可用版本。新版本提供后，用户确认才开始下载。只有用户选择重启并安装时，安装才开始。用户可以跳过一个版本而不抑后续发布。

更新元数据和发布成果由原生 release 工作流产生。macOS arm64 和 x64 元数据合并用于 generic provider；已签名的 Windows 安装器在签名后重新生成 blockmap 和 metadata。

## 桌面自定义边界

大部分产品 UI 保持 upstream Harness。DSH Desktop 通过 Electron Main 和 preload code 添加原生 host surface，在可用时使用 Harness extension slots，并追踪不可避免的 upstream package 变更为 reproducible `patch-package` 文件。这使得 desktop 层可审查，同时使 upstream 升级成为明确的兼容性练习。