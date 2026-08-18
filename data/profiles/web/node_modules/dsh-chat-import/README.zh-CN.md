<div align="center">

# 📥 DSH Chat Import

**把 15 种外部 Agent 聊天历史全保真导入 DeepSeek Harness 为可继续（resume）会话——并可导出 / 同步回 Claude Code、Codex、Kimi，或便携 interchange bundle。**

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](README.md)
[![简体中文](https://img.shields.io/badge/Language-简体中文-blue?style=for-the-badge)](#)

[![npm version](https://img.shields.io/npm/v/dsh-chat-import?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-chat-import)
[![npm downloads](https://img.shields.io/npm/dm/dsh-chat-import?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-chat-import)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Node.js >= 22.13](https://img.shields.io/badge/Node.js-%3E%3D22.13-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](package.json)
[![CI](https://img.shields.io/github/actions/workflow/status/Nwflower/dsh-chat-import/ci.yml?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/Nwflower/dsh-chat-import/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-chat-import?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Nwflower/dsh-chat-import)
[![已收录于 Awesome DeepSeek Harness](https://img.shields.io/badge/%E5%B7%B2%E6%94%B6%E5%BD%95%E4%BA%8E-Awesome_DeepSeek_Harness-6A5ACD?style=for-the-badge&logo=awesome&logoColor=white)](https://github.com/0xsline/awesome-deepseek-harness)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![已收录于 Awesome DSH Plugins](https://img.shields.io/badge/%E5%B7%B2%E6%94%B6%E5%BD%95%E4%BA%8E-Awesome_DSH_Plugins-6A5ACD?style=for-the-badge&logo=awesome&logoColor=white)](https://github.com/Dominic789654/awesome-deepseek-harness)

[💡 概念](#-概念) · [✨ 功能特性](#-功能特性) · [🗂 支持的来源](#-支持的来源) · [🚀 快速开始](#-快速开始) · [🛠 使用](#-使用) · [🔑 关键行为](#-关键行为) · [🏗️ 技术栈](#-技术栈) · [🗺️ 路线图](#-路线图) · [⭐ Star History](#-star-history) · [🤝 贡献](#-贡献)

</div>

> **一个插件，15 种来源** —— 全保真导入 DeepSeek Harness，无缝续聊，反向可互转 / 备份 / 交接。

<div align="center">

<img src="./assets/qoder.png" alt="Qoder CLI" width="600" />

**更新日志（英文）：** [CHANGELOG.md](CHANGELOG.md) · **路线图：** [ROADMAP.md](ROADMAP.md) · **互转协议：** [docs/INTERCHANGE.md](docs/INTERCHANGE.md)

</div>

---

## 💡 概念

`dsh-chat-import` 从 **Claude Code、Codex、ChatGPT、Cursor、Gemini、Reasonix、opencode、ZCode、Grok Build、OpenClaw、Pi Coding Agent、Hermes、Kimi CLI / Kimi Code、Qoder CLI 与 DSH 会话日志** 导入聊天历史——工具调用、思考过程一应俱全——成为**全保真、可继续（resume）的 DeepSeek Harness 会话**。源文件**只读**读取（绝不改写），不碰 DSH 引擎；每次导入都成为一条全新会话，并按源 `cwd` 归入对应工作区（经 `~/.claude.json` projects 权威映射 / Reasonix slug 贪心解码解析，带主目录沙箱防护）。

反向方向同样覆盖：`export_claude` 把 DSH 会话序列化回 Claude Code JSONL（只读——绝不修改你的 DSH 日志），Claude Code 可用 `--resume` 加载续聊；`sync_to_claude` 再把会话新增轮次增量写回 Claude Code 文件——带守卫、绝不静默覆盖；同一矩阵延伸到 **Codex rollout**（`export_codex`）与 **Kimi wire**（`export_kimi`），外加带 SHA-256 指纹与跨机器还原的**便携 interchange bundle**（`export_bundle` / `restore_bundle`，REQ-56/62）。

---

## ✨ 功能特性

| 分类 | 特性 | 说明 |
| --- | --- | --- |
| 导入 | **15 种来源 + 本地 JSONL，一个插件** | 每种来源一条命令——从 Claude Code JSONL、Codex rollout 到 SQLite 数据库与会话目录，含 Reasonix 桌面版与 Claude-3p 新端根。 |
| 导入 | **全保真** | 工具调用与结果、思考块、标题、模型与时间戳，源有记录就原样保留。 |
| 导入 | **批量导入** | 指向一个目录（或整个数据库），每个文件 / 每段对话都成为独立会话，并返回逐文件汇总。 |
| 导入 | **ChatGPT 分支还原** | `import_chatgpt({ branch: 'all' })` 把每条 root→leaf 分支还原为独立会话；工具消息还原为真正的 `tool/call` + `tool/result`。 |
| 导入 | **工具名映射** | opencode 工具名映射为 DSH 等价名（`websearch → web_search`、`question → ask_user_question`、`task → subagent` 等），续聊时工具调用更有意义。 |
| 续聊 | **可无缝续聊** | 打开导入的会话，从源记录停下的地方继续对话——工具完整可用（默认 preset scope + 绑定默认模型）。 |
| 续聊 | **自动归组工作区** | 会话按源 `cwd` 挂进对应工作区（权威映射 → slug 解码 → 主目录沙箱防护；本机无此路径时回退源文件所在目录）——不再「未分组」。 |
| 互转 | **矩阵化导出** | `export_claude` / `export_codex` / `export_kimi` 把任意 DSH 会话序列化为目标格式——DSH↔Claude↔Codex↔Kimi 四向互通。 |
| 互转 | **降级显式报告** | 每次导出逐条列出有损项（`degradations`：孤儿结果 / 注入跳过 / 附件跳过）——绝不静默丢弃。 |
| 备份 | **便携 bundle** | `export_bundle` 产出带双重 SHA-256 指纹的 interchange bundle；`restore_bundle` 本机或跨机器还原（cwd 不可达回退有报告，不静默）。 |
| 反向 | **反向同步** | `sync_to_claude` 把会话新增完整轮次追加回 Claude Code 文件——带守卫、绝不覆盖。 |
| 交接 | **外部历史续聊** | `/resume-claude` / `/resume-codex` 把外部 transcript 当不可信历史生成交接摘要（目标 / 文件 / 停止点 / 下一步）注入当前会话；多匹配列候选不猜测。 |
| 资产 | **agent/skill/config 迁移** | `import_agents` 把 pi / opencode / Claude / Codex 的 agent、prompt、skill、指令与配置参考转换为持久化 DSH skills。 |
| MCP | **MCP 镜像计划** | `import_mcp` 读取 Claude/Codex 的 MCP server 并生成可人工审阅的 DSH MCP client YAML 片段；`/mcp-status` 列出发现的 server。 |
| 配置 | **settings 翻译建议** | `import_settings` / `/settings-suggest` 读取 Claude settings.json 与 Codex config.toml，给出 DSH 迁移建议（模型 / 权限 / hooks / env / provider）。 |
| 修复 | **回填工作区** | `/attach-workspaces` 按 imports registry 把已导入会话重新挂到 cwd 匹配的工作区；`--mode dedicated` 可统一挂到单个工作区。 |
| 工作区 | **导入时 workspace 模式** | 导入工具支持 `workspaceMode: auto\|dedicated\|per-project` 与 `workspaceDir`，在导入阶段控制归组方式。 |
| 修复 | **重置扫描缓存** | `/import-reset` 清空进程内扫描缓存与 `scan-cache.json` 书签，不影响已导入会话。 |
| CLI | **独立 CLI** | `dsh-chat-import export-md <会话>` 把 DSH 会话日志渲染为 Markdown；`dsh-chat-import doctor` 做轻量本地体检——无需启动 DSH。 |
| 质量 | **校验** | `verify_session` 只读结构审计（seq / 事件白名单 / surfaceOp / 回合平衡 / 工具配对），按 kind 给 repair 提示。 |
| 质量 | **doctor 体检** | `doctor` / `/doctor` 只读检查 registry、导入会话存在性、skills 落盘与 workspaceRegistry 可用性。 |
| 保护 | **幂等 + 增量** | 重复导入未变化的源直接跳过；增长的源只追加新增轮次。 |
| 保护 | **期望哈希校验** | 所有导入工具支持 `expectedHash`（SHA-256），不匹配时落盘前大声失败。 |
| 导入 | **时间戳置顶** | 所有导入工具支持 `restamp: true`，把会话时间戳平移到当前并保持相对间隔。 |
| 保护 | **上下文预算保护** | 超长会话按安全上下文预算裁剪，裁剪结果显式上报；`compacted: true` 还原 Claude 压缩摘要。 |

---

## 🗂 支持的来源

| 来源 | 存储位置 | 导入工具 |
| --- | --- | --- |
| **Claude Code** | `~/.claude/projects/<slug>/<sessionId>.jsonl` | `import_claude` |
| **Claude-3p**（新端） | `%LOCALAPPDATA%\Claude-3p\claude-code-sessions`（元数据经 `cliSessionId` 反查 jsonl） | `import_claude` |
| **Codex / ChatGPT CLI** | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | `import_codex` |
| **ChatGPT**（网页导出） | 导出压缩包（任意路径）——`conversations.json` | `import_chatgpt` |
| **Cursor** | `~/.cursor/projects/<slug>/agent-transcripts/<id>/<id>.jsonl` | `import_cursor` |
| **Gemini CLI** | `~/.gemini/history/<slot>/chats/session-*.json` | `import_gemini` |
| **Reasonix**（CLI + 桌面版） | `~/.reasonix/sessions/desktop-*.jsonl` · `%APPDATA%\reasonix\projects\<slug>\sessions\*.jsonl` | `import_reasonix` |
| **opencode** | `~/.local/share/opencode/opencode.db` | `import_opencode` |
| **ZCode**（z.ai CLI） | `~/.zcode/cli/db/db.sqlite` | `import_zcode` |
| **Grok Build** | `~/.grok/sessions/<project>/<session_id>/` | `import_grokbuild` |
| **OpenClaw** | `~/.openclaw/agents/<agent>/sessions/*.jsonl` | `import_openclaw` |
| **Pi Coding Agent** | `~/.pi/agent/sessions/--<cwd>--/<timestamp>_<uuid>.jsonl` | `import_pi` |
| **Hermes** | `~/.hermes/`（Windows `%LOCALAPPDATA%\hermes`） | `import_hermes` |
| **Kimi CLI / Kimi Code** | `~/.kimi/sessions/<workdir-md5>/<sessionId>/wire.jsonl` · `~/.kimi-code/sessions/<workspaceId>/<sessionId>/agents/main/wire.jsonl` | `import_kimi` |
| **Qoder CLI** | `~/.qoder/projects/<encoded-project>/<sessionId>.jsonl`（子代理在 `<sessionId>/subagents/*.jsonl`） | `import_qoder` |
| **DSH 会话日志** | `~/.dsh/sessions/<encoded-workspace>/<sessionId>/session.jsonl(.zstd)` | `import_dsh` |
| **任意本地 JSONL** | 任意 `.jsonl` 文件 / 目录（自动识别格式） | `import_local_jsonl` |

每次导入都会保留源实际记录的内容——sessionId、`cwd`、标题、模型、时间戳、工具调用与结果、思考过程。数据较少的源导入其已有的内容；源格式无法保留的部分，会在导入报告里显式标注（如 Kimi 镜像进父 wire 的 `SubagentEvent` 子代理对话会跳过——父 `Agent` 工具调用与结果保留，子代理自己的 `subagents/<agentId>/wire.jsonl` 或新布局 `agents/<agentId>/wire.jsonl` 可直接导入）。Reasonix V2 会话自动合并 `*.events.jsonl` WAL（上报 `walMerged`）；Claude 会话可用 `compacted: true` 只导最后一次压缩摘要 + 尾部。

**Qoder CLI**（`import_qoder`）读取 `~/.qoder/projects/<encoded-project>/<sessionId>.jsonl` 会话——Claude 同构的 `user` / `assistant` 记录与 `text` / `thinking` / `tool_use` / `tool_result` 内容块。工具调用与结果完整保留并按 `tool_use_id` 配对（缺省按未决调用顺序回退），thinking 映射为 reasoning，标题链为 `ai-title` → `last-prompt` → 首问；`cwd`、模型与时间戳一并保留。子代理 transcript（`<sessionId>/subagents/*.jsonl`）跳过，仅主会话成为 DSH 会话——`scan_discover` 与导入面板的来源筛选均含 `qoder`。

---

## 🚀 快速开始

**1. 安装** — 把插件加进 profile：

```bash
dsh plugin --profile web add dsh-chat-import                    # npm 包
dsh plugin --profile web add -w link:/path/to/dsh-chat-import   # 本地源码（符号链接）
```

**2. 导入** — 在任意 DSH 会话里导入单个文件或整个目录（16 个导入工具调用方式一致——见上方来源表）：

```
import_claude({ path: "~/.claude/projects" })
```

**3. 续聊** — 刷新一次会话列表，打开导入的会话，继续对话——它会从源记录停下的地方无缝接上。

**4. 双向增量同步** — 侧边栏「导入会话」面板新增 **同步** 页：

- **外部 → DSH**：按间隔巡检 Claude / Codex / Grok 的新增或增长会话，走既有幂等续写。
- **DSH → 外部**：把 DSH 新增完整轮次写回对应 agent。导入源追加到原文件；原生 DSH 会话在该 agent 默认根下落一份副本。
- 两个方向**默认关闭**，必须在面板里打开开关，或点「立即同步」。配置在 `$DSH_HOME/dsh-chat-import/sync.json`。
- **Watch 懒检查模式** — 开启后，打开面板即按 mtime 检查已导入源，增长者增量续写（幂等，无常驻监听）。

<details>
<summary><b>卸载</b></summary>

`dsh plugin` 把插件的 bundle 声明收编进 profile；重启 dsh 后插件生效。卸载：从 profile 的 bundles 移除 `import-claude` insert 行并重启 dsh。

卸载绝不触碰数据：已导入会话保留在 DSH 数据目录；插件卸载时宿主自动撤销全部 Hook（工具 / 面板路由 / 同步定时器 / 事件订阅），无残留注册。移除前可用 `list_imported_sessions()` 列出本插件导入的全部会话，用 `retract_import({ sessionId })` 清除 registry 记录并获取手动删除引导——一切删除都需手动，插件绝不自动删。

</details>

---

## 🛠 使用

> **注意**：导入会即时落盘，但 DSH 的会话列表不会自动刷新——导入后请刷新页面（或会话列表）才能看到新会话。

**导入——单个文件或目录。** 每个 `import_*` 工具都接受 `path`；目录递归扫描，每个文件 / 每段对话成为独立会话：

```
import_claude({ path: "C:\Users\<you>\.claude\projects\<slug>\<sessionId>.jsonl" })
import_codex({ path: "C:\Users\<you>\.codex\sessions\2026\05\18\rollout-2026-05-18T21-14-16-xxxx.jsonl" })
import_chatgpt({ path: "C:\Users\<you>\Downloads\chatgpt-export\conversations.json" })
import_opencode({ path: "C:\Users\<you>\.local\share\opencode\opencode.db" })
import_local_jsonl({ path: "D:\downloads\session.jsonl" })
```

`import_local_jsonl({ path })` 接受任意本地 `.jsonl` 会话文件（或目录）：自动识别 `dsh` / `claude` / `codex` / `cursor` / `reasonix` / `pi` / `openclaw` / `hermes`，识别不准时可用 `format` 参数强制指定：

```
import_local_jsonl({ path: "D:\downloads\session.jsonl" })
import_local_jsonl({ path: "D:\downloads\unknown.jsonl", format: "claude" })
```

`import_chatgpt` / `import_opencode` / `import_zcode` / `import_hermes` 恒返回批量结果——一个文件 / 数据库包含全部会话，一次调用即可让每段对话成为独立会话。

<details>
<summary><b>导入参数与行为</b></summary>

- `preview: true`（别名 `dryRun: true`）— **只读**运行：照常解析 / 读取 / 转换，但**零副作用**、不落盘。去掉该参数再调一次即正式导入。
- `force: true` — 即使已导入，也以新 id（`import-<sessionId>-<n>`）另存一份**完整副本**；旧会话绝不修改。
- `sessionId`（可选）— 覆盖目标 DSH 会话 id（默认 `import-<源sessionId>`）。
- `import_chatgpt({ branch: 'all' })` — 把对话 DAG 的**每条 root→leaf 分支**还原为独立会话（主线程仍是最后 child 链；分支会话带后缀源 id 与分支标记标题）。导出里的工具消息还原为真正的 `tool/call` + `tool/result`（结构化 JSON 参数、FIFO 配对），不再是纯文本。
- `import_claude({ compacted: true })` — 只导长会话的**最后一次压缩摘要 + 尾部**（摘要作前置 `reasoning` 块；标题取 summary 记录）。无 summary 记录时该参数不生效。
- `import_hermes({ lineage: 'tail' })` — 只导**叶子链尾**（不是任何其它会话父会话的会话）；压缩分叉父会话跳过并标注。
- **已归档会话可重新导入** — DSH 的归档会把会话从侧边栏隐藏，但保留在持久化里（及其 id）——面板与 `scan_discover` 现在把已归档目标标记为 **已归档 / Archived** 并提供重新导入按钮。再次导入以新 id（`import-<sessionId>-<n>`，与 `force` 同一铸键）另存完整副本，不触碰已归档会话；多会话源（chatgpt / opencode / zcode / hermes 库）内逐会话同样适用。
- **增量续写（重导）** — 重导同一源路径绝不改写已导入历史：未变文件跳过（`already-imported`，不重读）；增长文件只把**新增轮次** append 进同一会话（`appended`）；截断文件检测并上报（`sourceShrunk`）——需要完整新副本时用 `force: true`：

```
import_claude({ path: "C:\Users\<you>\.claude\projects\<slug>\<sessionId>.jsonl" })
// 未变化 → "already-imported" · 增长 → "appended"（只追加新轮次）
```

</details>

每次导入结果都会上报 `status` 与任何异常——畸形行、疑似敏感信息、逐源丢弃——绝不静默吞掉。

### import_agents — 把 pi/opencode/Claude/Codex 的 agent、prompt、skill、指令与配置参考转换为 DSH skills

`import_agents` 把 **pi**（`~/.pi/agent/{agents,prompts}/*.md`）、**opencode**（`~/.config/opencode/{agents,skill}/*.md`）、**Claude**（`~/.claude/memory/<group>/*.md`、`~/.claude/skills/<skill>/SKILL.md`，或经 `claudeProjectRoot` 显式指定的项目根 `CLAUDE.md`）与 **Codex**（`~/.codex/skills/<skill>/SKILL.md`、`~/.codex/instructions.md`、`~/.codex/AGENTS.md`、`~/.codex/config.toml`）的自定义 agent、mode prompt、skill、指令与配置参考转换为**持久化 DSH skill 资产**——`$DSH_AGENTS_HOME/skills/<name>/SKILL.md`（`$DSH_AGENTS_HOME` 缺省 `~/.agents`），成为任意会话里可发现的技能。这与运行时只读的 Claude 桥（`context-bridge`，默认关）互补：后者把 Claude 的 memory/CLAUDE.md/skills 临时注入；本工具把 pi/opencode/Claude/Codex 资产持久落盘。

默认 **dry-run**（只返回 write/complete/skip 规划清单，零副作用）；传 `apply: true` 才真正写盘：

```
import_agents()                    // dry-run：仅规划
import_agents({ apply: true })     // 写入 $DSH_AGENTS_HOME/skills/<name>/SKILL.md
import_agents({ codexRoot: "~/.codex", apply: true })  // 显式包含 Codex 资产
```

语义：跨源同名冲突加 `-<source>` 后缀消歧（如 `-pi` / `-opencode` / `-codex`）；内容相同幂等跳过；已带 `kind: dsh`/`kind: skill` frontmatter 的源不重复导入；bundle 目录缺 `SKILL.md` 时原地补全（保留既有 `scripts/` 等）；嵌套 YAML（如 `permission:`）原样保留。

### scan_discover — 只读会话发现

`scan_discover` 扫描全部 15 种格式的已知数据根（Windows 上含 Reasonix 桌面版与 Claude-3p 根），返回结构化会话索引（标题、项目、cwd、路径、导入状态，源目录为 git 仓库时附分支/dirty），供批导入前预览。零副作用：

```
scan_discover()
scan_discover({ path: "~/.codex/sessions", format: "codex", query: "import" })
```

### list_imported_sessions & retract_import — 识别与撤回

`list_imported_sessions()` 枚举本插件已导入的全部 DSH 会话；`retract_import({ sessionId })`（或 `sourcePath`）移除其 registry 记录并返回手动删除引导。**只识别 + 引导手动删，绝不执行任何删除**：

```
list_imported_sessions()
retract_import({ sessionId: "import-019f5f27-…" })
```

### export_claude / export_codex / export_kimi — DSH → 目标格式

`export_claude({ sessionId })` 把现有 DSH 会话（导入的或原生的）序列化为 Claude Code JSONL transcript，可直接 `--resume`。文件写到 `<outputDir>/<slug>/<uuid>.jsonl`（默认 `~/.claude/projects`），文件名是全新 UUID v4——绝不覆盖已有文件。`export_codex` 与 `export_kimi` 分别写 Codex rollout JSONL 与 Kimi `wire.jsonl`（默认 `~/.dsh/exports`）——补齐 DSH↔Claude↔Codex↔Kimi 矩阵（导入边已存在）。每次导出在 `degradations` 字段里逐条列出**有损项**（孤儿工具结果 / 注入跳过 / 附件跳过）——绝不静默丢弃：

```
export_claude({ sessionId: "import-019f5f27-…" })
export_codex({ sessionId: "…", dryRun: true })
export_kimi({ sessionId: "…", outputDir: "D:\backup\kimi" })
```

### export_bundle / restore_bundle — 便携 interchange bundle

`export_bundle({ sessionId })` 写出 **`.dshbundle.json`**——事件级无损的 interchange bundle（协议见 [docs/INTERCHANGE.md](docs/INTERCHANGE.md)），带双重 SHA-256 指纹（会话级 + 文件级）与机器无关的落点信息（`originalCwd` + `landingHint`）。`restore_bundle({ path })` 先校验指纹（损坏大声报告、绝不静默还原），再经同一幂等状态机导入——重复还原跳过、`force: true` 另存副本、目录模式逐个还原 `.dshbundle.json`：

```
export_bundle({ sessionId: "import-019f5f27-…" })                    // → ~/.dsh/exports/<id>.dshbundle.json
restore_bundle({ path: "D:\backup\sess.dshbundle.json" })            // A 机导出 → B 机还原
restore_bundle({ path: "D:\backup\bundle-dir", preview: true })      // dry-run
```

**跨机器（REQ-62）：** A 机导出 → 拷贝 bundle → B 机还原。原 `cwd` 在 B 机不可达时，会话回退归到 bundle 文件所在目录（REQ-39-lite 归组），结果报告 `cwdAvailable: false` / `groupedTo` / `restoreNote`——绝不静默。

### verify_session — 只读结构审计

`verify_session({ sessionId })` 对任意 DSH 会话做只读结构校验：seq 连续、事件类型白名单、surface 事件带 `surfaceOp`、`sourceEventSeqs` 指向真实 `tool/call`、turn/step 平衡、工具调用↔结果配对。问题逐条定位（kind + seq + message），并按 kind 给出 `repairHints`（`force` 重导 / 闭合半开轮 / 源转录中途开始的边界说明）：

```
verify_session({ sessionId: "import-019f5f27-…" })
```

### doctor — 只读迁移健康检查

`doctor()` 做一次只读迁移后体检：imports registry 是否可读、每个已导入会话是否仍存在于 `sessionPersistence`、`import_agents` 的 skills 是否落盘、`workspaceRegistry` 是否可用。绝不写文件、不导入、不同步、不删除：

```
doctor()
```

返回 `{ ok, checks, issues, totals }`——适合大批量导入后，或 DSH 数据跨机器搬运前后使用。

### 独立 CLI — export-md / doctor

npm 包还附带一个小的独立 CLI（无需启动 DSH）：

```
npx dsh-chat-import export-md ~/.dsh/sessions/<workspace>/<session>/session.jsonl
npx dsh-chat-import export-md <会话目录> --out session.md
npx dsh-chat-import doctor
```

`export-md` 把 DSH 会话日志渲染为可读 Markdown（会话头、标题、user/assistant 文本、thinking、工具调用与结果）。`doctor` 读取 `$DSH_HOME/dsh-chat-import/imports.json` 与本地 `sessions` 树，做轻量健康汇总。

### import_mcp — MCP 镜像计划

`import_mcp` 从 **Claude**（`~/.claude.json` / `.mcp.json`）与 **Codex**（`~/.codex/config.toml`）读取 MCP server，并生成可人工审阅的 **DSH MCP client YAML 片段**。默认 dry-run；`apply: true` 把片段写到 `$DSH_HOME/dsh-chat-import/mcp-mirror.cordis.yml`（或 `outPath`）——绝不自动改 profile：

```
import_mcp()                                  // dry-run：列出 server + YAML 片段
import_mcp({ apply: true })                   // 写盘生成片段
/mcp-status                                   // 列出发现的 server
```

### import_settings — settings/config 翻译建议

`import_settings` 读取 **Claude `~/.claude/settings.json`** 与 **Codex `~/.codex/config.toml`**，返回迁移到 DSH 的建议：模型绑定、权限规则、hooks、环境变量、模型 provider。只读，绝不自动应用：

```
import_settings()                             // 列出建议
/settings-suggest                             // 斜杠命令同款
```

### sync_to_claude — 增量写回

`sync_to_claude({ sessionId })` 把会话的**新增完整轮次**追加回其 Claude Code 文件——`target: "source"`（默认，写回导入源文件）或 `"copy"`（最近一次 `export_claude` 副本）。文件被外部修改或缩小时一律上报、绝不覆盖；`force: true` 越过外部修改重锚定（被覆盖的守卫仍会上报）：

```
sync_to_claude({ sessionId: "import-019f5f27-…" })
sync_to_claude({ sessionId: "…", target: "copy", dryRun: true })
```

### 浏览器面板 — 侧边栏发现与导入

dsh web 侧边栏底部上方有一个「导入会话」浮动胶囊（`sidebar.footer.action` 槽条目以 fixed 浮层渲染，同槽其它条目——如官方 Cordis 徽标占满整个 footer 行——不会把它挤出或挡住）。打开的面板**按工作区文件夹分组**列出发现的会话（各来源记录里的 `cwd`/项目名，缺省归入「(未分组)」），支持来源过滤——「全部来源」扫描全部格式的默认数据根，单选来源则只看该格式——并带逐会话导入状态徽标（已导入 / 部分 / 未导入）。搜索框按标题 / 工作区 / 路径过滤，列表**分页**展示（每页 50 条），跨页选择保留便于批量操作。面板支持 `Esc` 关闭。

每行支持**单选导入**，复选框支持**多选导入**（「导入所选 (N)」）：面板调用与 `import_*` 工具完全相同的 host 导入管线，幂等跳过 / 增量续写 / force / 上下文预算语义完全一致；导入后自动刷新列表展示最新状态。多会话源（如 `conversations.json`、opencode/zcode/hermes 库）整源导入——opencode/zcode 只导所选 `sessionId`。

> 数据来自与 `scan_discover` 同一套只读发现（30s TTL 缓存 + 持久化 mtime 书签）；面板除你主动触发的导入外零写入。

### `/import` 斜杠命令与 `/resume-*` 交接

插件还注册了一个 **`/import <source> <path>`** 斜杠命令（在挂载了 dsh `commands` 服务的环境下可用）：直接在会话里输入即可导入，不占模型轮次——与 `import_*` 工具同一管线、同一幂等 / 增量 / force / 上下文预算语义。`<source>` 接受短名（`claude`、`codex`…）、客户端来源 id（`claude-code`）或工具全名（`import_claude`）；`<path>` 为 transcript 文件或会话目录 / 数据根（单文件导入 / 目录批量照常判定）。

**`/import-all [source] [path]`** 一键扫描默认数据根（或单一来源 / 显式路径）并批量导入所有未导入会话——同一管线，幂等跳过 / 增量续写，归档会话跳过，失败逐条上报。

**`/attach-workspaces`** 按 imports registry 把已导入会话重新挂到 cwd 匹配的工作区——适合修复早期落在「未分组」或之前 workspace 挂载失败的导入；幂等，可重复执行。参数：`--mode auto|dedicated|per-project` 与 `--dir <path>`（dedicated 用）。

**`/doctor`** 运行与 `doctor` 工具相同的只读健康检查，并输出简洁报告。

**`/mcp-status`** 只读列出从 Claude/Codex 配置中发现的 MCP server；需要生成 DSH MCP client 片段时使用 `import_mcp`。

**`/settings-suggest`** 只读列出 Claude/Codex 配置翻译建议；需要结构化工具输出时使用 `import_settings`。

**`/import-reset`** 清空扫描缓存（进程内 TTL + 持久化 `scan-cache.json`），适合发现结果疑似过期时强制重扫；已导入会话不受影响。

**`/resume-claude [id:<会话id> | 关键词]`** 与 **`/resume-codex`** 从外部 transcript 生成**交接摘要**（目标 + 最后请求、涉及文件/产物、最近工具调用、精确停止点、最安全下一步）并注入当前会话，让你在 DSH 里接着干——把 transcript 当**不可信静态历史**（不复述 system/developer/thinking；旧工具输出视为过期证据需复核）。留空取最近会话，`id:<会话id>` 精确指定，或用标题关键词——**多匹配列候选不猜测**：

```
/resume-claude id:282095ab-1111-4222-8333-444455556666
/resume-codex 修复登录
```

### 会话启动上下文增强

两个可选钩子在 DSH 会话启动时运行（host `agent/session-start` 事件），均为 agent 级作用域、绝不触碰你的 transcript：

- **迁移提示（默认开）**——当会话工作区存在可发现的（已导入或可导入）外部聊天历史时，注入一行 `PromptContext`，告诉模型如何继续（`/import <source> <path>` 命令或侧边栏面板）。per-project 记忆保证同一工作区只提示一次；设 `DSH_IMPORT_SESSION_HINT=0` 关闭。
- **Claude 上下文桥接（默认关）**——设 `DSH_IMPORT_CONTEXT_BRIDGE=1` 把 Claude Code 的上下文资产桥进会话：`~/.claude/memory/*.md`（按 `feedback` > `project` > `reference` > `user` 分组、8 KiB 上限、mtime 缓存重读）、项目根 `CLAUDE.md` **与全局 `~/.claude/CLAUDE.md`**、以及 `~/.claude/skills/*/SKILL.md`（注册为该 agent 独有的 `claude-<name>` 技能）。

---

## 🔑 关键行为

- **只读导入** — 源转录与数据库绝不改写；导入的 DSH 历史 append-only（既有事件绝不修改）。
- **幂等 + 增量** — 未变源不重读直接跳过；增长只追加新增轮次；截断检测并上报。
- **自动归组工作区** — 会话按源 `cwd` 归入对应工作区；`cwd` 经 `~/.claude.json` projects 权威映射（精确 / basename / 下划线变体，CJK 保留同款编码）解析、ASCII slug 解码兜底（Claude）、磁盘存在性贪心解码（Reasonix 项目 slug），并带**主目录沙箱防护**（cwd = 用户主目录绝不当工作区——沙箱 ACL 会拒绝）。解析出的 `cwd` 在本机不存在时（跨机器迁移 transcript 的常见情况）回退归到**源文件所在目录**的工作区，不会消失在「未分组」里。
- **导入会话工具完整可用** — 会话创建优先走 host `agents.create`（`setup` 钩子挂载默认 preset scope，`agentOptions` 绑定默认模型 provider/model/maxTokens），导入会话与原生会话工具面一致、自动压缩可触发；`agents` 服务缺席时回退纯 `sessionPersistence`，不破坏导入。
- **上下文预算保护** — 导入会话没有 provider 配置，dsh 不会自动压缩它们；超长会话按上下文预算裁剪（单条内容上限，中间段压缩，保留最早提问、一条摘要与尾部）。预算可在调用时指定，或通过环境变量 `DSH_IMPORT_CONTEXT_BUDGET` 设置；裁剪结果总是上报。Claude 会话也可用 `compacted: true` 只导最后一次压缩摘要 + 尾部。
- **失败要大声，绝不静默** — 畸形行与疑似敏感信息按位置计数上报（行号 / kind——绝不输出内容）；源格式无法保留的部分在导入报告里显式标注，每次导出上报其 `degradations`。每个落盘会话还会跑一次结构自检（seq 连续、事件类型白名单、surface 事件带 surfaceOp、sourceEventSeqs 有效）——违规以 `validation` 报告随导入结果上报；`verify_session` 可随时对任意会话只读审计并给 repair 提示。
- **沙箱** — 读取工作区之外的源文件或写工作区之外的导出目标，需要会话沙箱放行该路径。

---

## 🏗️ 技术栈

| 层 | 技术 |
| --- | --- |
| 运行时 | Node.js ≥ 22.13 — 纯 ESM，零构建 |
| 平台 | DeepSeek Harness 插件 — Cordis「一切皆插件」，只消费公开 host 服务 |
| 解析器 | Claude/Codex/Cursor/Gemini/Reasonix/Pi/Kimi JSONL · ChatGPT JSON · opencode/ZCode/Hermes SQLite（`node:sqlite`） |
| 互转 | Interchange v1 协议（[docs/INTERCHANGE.md](docs/INTERCHANGE.md)）——共享 turns IR + 降级规则 + bundle 格式 |
| UI | dsh web 侧边栏面板（手写 CJS bundle）· 经 `@deepseek-ai/dsh-client-locale` 多语言 |
| CI | GitHub Actions — test / lint / `check:linux` 跨平台护栏 / headless 冒烟 |

```
lib/
├── convert/          # 纯函数按源转换器 + interchange v1 核心（零 DSH 依赖）
├── export/           # 反向序列化器（claude / codex / kimi / bundle）
├── imports.mjs       # 幂等导入 registry
├── import-core.mjs   # 共享导入状态机（agents.create + cwdHint + 主目录防护）
├── toolkit.mjs       # makeImportTool 工厂 + IMPORT_SPECS
├── panel.mjs         # 浏览器面板 JSON 路由
├── command.mjs       # /import + /import-all + /attach-workspaces + /doctor 斜杠命令
├── resume-command.mjs # /resume-claude /resume-codex 交接（REQ-30）
├── handoff.mjs       # 交接摘要纯函数（REQ-30）
├── cwd-map.mjs       # cwd 权威映射 + slug 解码 + 主目录防护（REQ-39）
├── restore.mjs       # restore_bundle 编排（REQ-56/62）
├── verify.mjs        # verify_session 结构审计（REQ-23）
├── doctor.mjs        # 只读迁移健康检查（REQ-66）
├── mcp.mjs           # Claude/Codex MCP 镜像计划（REQ-68）
├── settings.mjs      # Claude/Codex settings 翻译建议（REQ-71）
├── prompt-hint.mjs   # 会话启动迁移提示（REQ-53）
└── context-bridge.mjs # Claude memory / CLAUDE.md / skills 桥接（REQ-28）
```

---

## ⚙️ 兼容性

面向 `dsh 0.1.x` 线（`dsh-tools ^0.1.0-rc.6`，实测 `dsh 0.1.0-rc.6`），需要 **Node.js >= 22.13**（`node:sqlite` 免 flag 的首个版本）。`npm test` — 484 个用例。

---

## 🗺️ 路线图

- [x] 15 种来源导入 + 反向导出 / 同步回 Claude Code
- [x] 浏览器导入面板 + `/import` / `/import-all` 斜杠命令 + 会话启动迁移提示与上下文桥接
- [x] Interchange IR v1 + 便携备份 bundle + 跨机器还原（REQ-18 / REQ-56 / REQ-62）
- [x] 矩阵化互转（Claude ↔ Codex ↔ Kimi ↔ DSH）+ `verify_session` 审计（REQ-23）+ `/resume-claude` / `/resume-codex` 交接（REQ-30）
- [x] 更多来源：Reasonix 桌面版、Claude-3p（REQ-45）· Hermes lineage（REQ-51）
- [ ] Codex 官方 App Server API 源（REQ-52——侦察已落盘，维持 rollout 路线）

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-chat-import&type=Date)](https://star-history.com/#Nwflower/dsh-chat-import&Date)

---

## 🤝 贡献

欢迎贡献——fork 本仓库，新建 `feature/<name>` 分支，提交 PR。完整指南见 [CONTRIBUTING.md](CONTRIBUTING.md)（开发环境、提交规范、安全与隐私）。

- **测试：** `npm test` · **跨平台护栏：** `npm run check:linux`
- 仓库规范见 [AGENTS.md](AGENTS.md)：conventional commit（中文）、双语 README 必须保持同步、插件只消费公开 dsh host 服务、多会话并发走文件认领协议。

---

## 📄 许可证

MIT — 见 [LICENSE](LICENSE)。
