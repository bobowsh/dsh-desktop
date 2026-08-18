# PRIVACY CHECKLIST · 发布前隐私与安全审核清单

本清单供发布者在推送 GitHub / npm 前逐项核对。当前代码已通过自动化扫描
（无本机用户名 / 绝对路径 / 代理地址 / 密钥模式），下列为人工复核项。

## 1. 数据流（确认无外泄）

- [ ] 插件 host 端只监听本机回环（DSH webServer 默认 `127.0.0.1`），不对外网开放端口
- [ ] 浏览器面板只 `fetch` 同源 `/api/skill-manager-ytxue/*`，无任何外部 API 调用
- [ ] 无遥测、无统计、无第三方追踪脚本

## 2. 本机文件与日志（确认写入内容合理）

- [ ] `skill-manager-ytxue.log` 记录操作事件（skill 名/路径/时间），仅本机使用
- [ ] `skill-manager-ytxue.checked.json` 记录检查状态（skill 名 + sha1 指纹），仅本机使用
- [ ] 以上文件只写入 `<dshHome>`（`~/.dsh`）下，路径严格限定 `skills/` 与 `skill-pool/`
- [ ] 无任何用户文档 / 会话内容 / 凭据被读取或写入

## 3. 代码面（自动化已扫，人工复核一次）

- [ ] 无硬编码用户名 / 本机绝对路径（扫描通过；测试根已改为环境变量 `SM_TEST_HOME` 可覆盖）
- [ ] 无 API 密钥 / token / 代理地址（扫描通过）
- [ ] 依赖：运行时零第三方包；仅 peerDependencies（`@deepseek-ai/cordis`、`dsh-home-paths`、`dsh-host-webserver`、`dsh-workspace`、`schemastery`）——均为 DSH 官方包
- [ ] 上传前对 `lib/`、`test/`、`README.md` 做一次全文阅读复核

## 4. 行为边界（确认无越权）

- [ ] enable/disable/import 的目标目录严格限定 `<dshHome>/skills` 与 `<dshHome>/skill-pool`
- [ ] overwrite 覆盖只删除目标目录内同名条目，不触碰其他路径
- [ ] 项目级 skill 只读展示（不修改项目文件）；`.git` 探测只读

## 5. 发布物料

- [ ] `package.json` 的 `repository.url` 替换为真实 GitHub 地址
- [ ] `LICENSE` 版权行（Copyright (c) 2026 …）按需修改
- [ ] `README.md` 的示例路径/代理相关文字复核（示例均为占位，无真实地址）
- [ ] `git ls-files` 确认仓库仅含预期文件（lib/test/README/LICENSE 等）
- [ ] 检查 git 历史/远程无敏感提交（本发布副本为全新 git 仓库，无历史包袱）

## 6. 跨平台适配（发布者计划项）

- [ ] macOS / Linux：`install.ps1` 为 Windows 专用，其他平台走手动挂载或 npm 安装（README 已说明）
- [ ] `listDir` 盘符探测在非 Windows 返回根 `/`（已处理）；路径拼接全用 `node:path`
- [ ] 新增平台适配时保持"零第三方运行时依赖"约束
