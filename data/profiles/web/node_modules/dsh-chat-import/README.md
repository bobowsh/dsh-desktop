<div align="center">

# 📥 DSH Chat Import

**Import 15 external agent conversation histories into DeepSeek Harness as full-fidelity, resumable sessions — and export / sync back to Claude Code, Codex, Kimi, or a portable interchange bundle.**

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](#)
[![简体中文](https://img.shields.io/badge/Language-简体中文-blue?style=for-the-badge)](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/dsh-chat-import?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-chat-import)
[![npm downloads](https://img.shields.io/npm/dm/dsh-chat-import?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-chat-import)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Node.js >= 22.13](https://img.shields.io/badge/Node.js-%3E%3D22.13-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](package.json)
[![CI](https://img.shields.io/github/actions/workflow/status/Nwflower/dsh-chat-import/ci.yml?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/Nwflower/dsh-chat-import/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-chat-import?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Nwflower/dsh-chat-import)
[![Listed in Awesome DeepSeek Harness](https://img.shields.io/badge/Listed_in-Awesome_DeepSeek_Harness-6A5ACD?style=for-the-badge&logo=awesome&logoColor=white)](https://github.com/0xsline/awesome-deepseek-harness)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![Listed in Awesome DSH Plugins](https://img.shields.io/badge/Listed_in-Awesome_DSH_Plugins-6A5ACD?style=for-the-badge&logo=awesome&logoColor=white)](https://github.com/Dominic789654/awesome-deepseek-harness)

[💡 Concept](#-concept) · [✨ Features](#-features) · [🗂 Supported sources](#-supported-sources) · [🚀 Quick start](#-quick-start) · [🛠 Usage](#-usage) · [🔑 Key behaviors](#-key-behaviors) · [🏗️ Tech Stack](#-tech-stack) · [🗺️ Roadmap](#-roadmap) · [⭐ Star History](#-star-history) · [🤝 Contributing](#-contributing)

</div>

> **15 agent sources, one plugin** — full-fidelity import into DeepSeek Harness, seamless resume, matrix interop / backup / handoff on the way out.

<div align="center">

<img src="./assets/qoder.png" alt="Qoder CLI" width="600" />

**Changelog:** [CHANGELOG.md](CHANGELOG.md) · **Roadmap:** [ROADMAP.md](ROADMAP.md) · **Interchange protocol:** [docs/INTERCHANGE.md](docs/INTERCHANGE.md)

</div>

---

## 💡 Concept

`dsh-chat-import` imports conversation histories from **Claude Code, Codex, ChatGPT, Cursor, Gemini, Reasonix, opencode, ZCode, Grok Build, OpenClaw, Pi Coding Agent, Hermes, Kimi CLI / Kimi Code, Qoder CLI and DSH session logs** — tool calls, reasoning and all — as **full-fidelity, resumable DeepSeek Harness sessions**. Source files are read **read-only** (never rewritten), the DSH engine is never touched, and every import becomes a fresh session grouped into the workspace of its source `cwd` (resolved via the authoritative `~/.claude.json` project mapping, greedy slug decoding for Reasonix, with a home-directory sandbox guard).

The reverse direction is covered too: `export_claude` serializes a DSH session back into a Claude Code JSONL transcript that Claude Code can load with `--resume` (read-only — your DSH log is never modified), `sync_to_claude` incrementally appends a session's new turns back to a Claude Code file — guarded, never silently overwriting — and the same matrix extends to **Codex rollouts** (`export_codex`) and **Kimi wire files** (`export_kimi`), plus a **portable interchange bundle** (`export_bundle` / `restore_bundle`, REQ-56/62) with SHA-256 fingerprints and cross-machine restore.

---

## ✨ Features

| Category | Feature | Description |
| --- | --- | --- |
| Import | **15 sources + local JSONL, one plugin** | One tool per source — from Claude Code JSONL and Codex rollouts to SQLite databases and session directories, including the Reasonix desktop app and Claude-3p new client roots. |
| Import | **Full fidelity** | Tool calls & results, thinking blocks, titles, models and timestamps carry over wherever the source records them. |
| Import | **Batch import** | Point at a directory (or a whole database) and every file / conversation becomes its own session, with a per-file summary. |
| Import | **ChatGPT branches** | `import_chatgpt({ branch: 'all' })` restores every root→leaf branch as its own session; tool messages become real `tool/call` + `tool/result`. |
| Import | **Tool name mapping** | opencode tool names are mapped to DSH equivalents (`websearch → web_search`, `question → ask_user_question`, `task → subagent`, …) so resumed tool calls stay meaningful. |
| Resume | **Seamlessly resumable** | Open an imported session and keep chatting exactly where the source left off — fully tool-enabled (default preset scope + bound default model). |
| Resume | **Auto workspace grouping** | Sessions land in the workspace of their source `cwd` (authoritative mapping, then slug decode, with a home-directory sandbox guard; falling back to the source file's directory when that path does not exist locally) — no more "ungrouped". |
| Interop | **Matrix export** | `export_claude` / `export_codex` / `export_kimi` serialize any DSH session into the target format — DSH↔Claude↔Codex↔Kimi four-way interop. |
| Interop | **Fidelity degradation reporting** | Every export lists its lossy items (`degradations`: orphan results, skipped injections, skipped attachments) — nothing is silently dropped. |
| Backup | **Portable bundle** | `export_bundle` writes a fingerprint-verified interchange bundle; `restore_bundle` restores it on this machine or another (cwd-unreachable fallback is reported, not silent). |
| Reverse | **Sync back** | `sync_to_claude` appends a session's new complete turns to its Claude Code file — guarded, never overwriting. |
| Handoff | **Resume from external history** | `/resume-claude` / `/resume-codex` generate a handoff summary (untrusted history → goal, files, stop point, next step) into the current session; multi-match lists candidates without guessing. |
| Assets | **Agents/skills/config migration** | `import_agents` converts pi / opencode / Claude / Codex agents, prompts, skills, instructions and config references into persistent DSH skills. |
| MCP | **MCP mirror plan** | `import_mcp` reads Claude/Codex MCP servers and generates a reviewable DSH MCP client YAML snippet; `/mcp-status` lists discovered servers. |
| Config | **Settings translation suggestions** | `import_settings` / `/settings-suggest` read Claude settings.json and Codex config.toml and produce DSH migration suggestions (model, permissions, hooks, env, provider). |
| Repair | **Attach workspaces retroactively** | `/attach-workspaces` re-attaches already-imported sessions to cwd-matched workspaces; `--mode dedicated` groups them into one workspace. |
| Workspace | **Import-time workspace modes** | Import tools accept `workspaceMode: auto\|dedicated\|per-project` and `workspaceDir` to control grouping at import time. |
| Repair | **Reset scan cache** | `/import-reset` clears the in-memory scan cache and `scan-cache.json` bookmarks without touching imported sessions. |
| CLI | **Standalone CLI** | `dsh-chat-import export-md <session>` renders a DSH session log as Markdown; `dsh-chat-import doctor` does a lightweight local health check — no DSH host needed. |
| Quality | **Verify** | `verify_session` runs a read-only structural audit (seq / event whitelist / surfaceOp / balance / tool pairing) with per-kind repair hints. |
| Quality | **Doctor** | `doctor` / `/doctor` run a read-only migration health check (registry, session existence, skills, workspace registry). |
| Protection | **Idempotent + incremental** | Re-importing an unchanged source skips it; a grown source appends only its new turns. |
| Protection | **Expected-hash verification** | Any import tool accepts `expectedHash` (SHA-256) and fails loudly before persisting if the source file does not match. |
| Import | **Restamp timestamps** | Any import tool accepts `restamp: true` to shift all session timestamps to now while keeping relative intervals. |
| Protection | **Context budget protection** | Oversized sessions are trimmed to fit a safe context budget, and the trim is reported; `compacted: true` restores Claude compression summaries. |

---

## 🗂 Supported sources

| Source | Storage location | Import tool |
| --- | --- | --- |
| **Claude Code** | `~/.claude/projects/<slug>/<sessionId>.jsonl` | `import_claude` |
| **Claude-3p** (new client) | `%LOCALAPPDATA%\Claude-3p\claude-code-sessions` (metadata → JSONL via `cliSessionId`) | `import_claude` |
| **Codex / ChatGPT CLI** | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | `import_codex` |
| **ChatGPT** (web export) | anywhere you saved the export — `conversations.json` | `import_chatgpt` |
| **Cursor** | `~/.cursor/projects/<slug>/agent-transcripts/<id>/<id>.jsonl` | `import_cursor` |
| **Gemini CLI** | `~/.gemini/history/<slot>/chats/session-*.json` | `import_gemini` |
| **Reasonix** (CLI + desktop) | `~/.reasonix/sessions/desktop-*.jsonl` · `%APPDATA%\reasonix\projects\<slug>\sessions\*.jsonl` | `import_reasonix` |
| **opencode** | `~/.local/share/opencode/opencode.db` | `import_opencode` |
| **ZCode** (z.ai CLI) | `~/.zcode/cli/db/db.sqlite` | `import_zcode` |
| **Grok Build** | `~/.grok/sessions/<project>/<session_id>/` | `import_grokbuild` |
| **OpenClaw** | `~/.openclaw/agents/<agent>/sessions/*.jsonl` | `import_openclaw` |
| **Pi Coding Agent** | `~/.pi/agent/sessions/--<cwd>--/<timestamp>_<uuid>.jsonl` | `import_pi` |
| **Hermes** | `~/.hermes/` (Windows `%LOCALAPPDATA%\hermes`) | `import_hermes` |
| **Kimi CLI / Kimi Code** | `~/.kimi/sessions/<workdir-md5>/<sessionId>/wire.jsonl` · `~/.kimi-code/sessions/<workspaceId>/<sessionId>/agents/main/wire.jsonl` | `import_kimi` |
| **Qoder CLI** | `~/.qoder/projects/<encoded-project>/<sessionId>.jsonl` (subagents in `<sessionId>/subagents/*.jsonl`) | `import_qoder` |
| **DSH session logs** | `~/.dsh/sessions/<encoded-workspace>/<sessionId>/session.jsonl(.zstd)` | `import_dsh` |
| **Any local JSONL** | any `.jsonl` file / directory (auto-detected) | `import_local_jsonl` |

Each import preserves what the source actually records — session id, `cwd`, title, model, timestamps, tool calls & results, reasoning. Sources that record less import what exists; anything a format cannot preserve is explicitly flagged in the import report (e.g. Kimi sub-agent conversations mirrored into the parent wire as `SubagentEvent` are skipped — the parent's `Agent` tool call & result are kept, and a sub-agent's own `subagents/<agentId>/wire.jsonl` or new-layout `agents/<agentId>/wire.jsonl` can be imported directly). Reasonix V2 sessions merge their `*.events.jsonl` WAL automatically (`walMerged` reported); Claude sessions can be imported as their last compression summary + tail with `compacted: true`.

**Qoder CLI** (`import_qoder`) reads `~/.qoder/projects/<encoded-project>/<sessionId>.jsonl` transcripts — Claude-style `user` / `assistant` records with `text` / `thinking` / `tool_use` / `tool_result` content blocks. Tool calls & results are preserved and paired by `tool_use_id` (with in-order fallback when the id is absent), thinking maps to reasoning, and the title follows the `ai-title` → `last-prompt` → first-user-message chain; `cwd`, model and timestamps carry over. Subagent transcripts (`<sessionId>/subagents/*.jsonl`) are skipped so only the main session becomes a DSH session — and both `scan_discover` and the import panel's source filter include `qoder`.

---

## 🚀 Quick start

**1. Install** — add the plugin to a profile:

```bash
dsh plugin --profile web add dsh-chat-import                    # npm package
dsh plugin --profile web add -w link:/path/to/dsh-chat-import   # local checkout (symlink)
```

**2. Import** — in any DSH session, import a single file or a whole directory (the same call shape works for all 16 import tools — see the table above):

```
import_claude({ path: "~/.claude/projects" })
```

**3. Resume** — refresh the session list once, open the imported session, and continue chatting — it resumes exactly where the source left off.

**4. Two-way incremental sync** — the sidebar **Import Sessions** panel now has a **Sync** tab:

- **External → DSH**: periodically scan Claude / Codex / Grok for new or grown sessions and import incrementally (same idempotent append state machine).
- **DSH → External**: write new complete DSH turns back. Imported sessions append to their source file; native DSH sessions get a copy under that agent's default root.
- Both directions are **off by default**. Turn them on in the panel, or click **Sync now**. Config lives in `$DSH_HOME/dsh-chat-import/sync.json`.
- **Watch (lazy) mode** — when enabled, opening the panel checks the mtimes of already-imported sources and incrementally appends any that grew (idempotent, no resident watcher).

<details>
<summary><b>Uninstall</b></summary>

`dsh plugin` folds the plugin's bundle declaration into the profile; the plugin becomes active after restarting dsh. To uninstall, remove the `import-claude` insert line from the profile's bundles and restart dsh.

Uninstall never touches your data: already-imported sessions stay in the DSH data directory, and every plugin hook (tools, panel routes, sync timer, event subscriptions) is torn down by the host when the plugin unloads — nothing stays registered. Before removing the plugin you can enumerate everything it imported with `list_imported_sessions()` and clear its registry records — with manual-deletion guidance — via `retract_import({ sessionId })`; nothing is ever deleted automatically.

</details>

---

## 🛠 Usage

> **Note:** imports persist to disk immediately, but the DSH session list does not auto-refresh — refresh the page (or the session list) after importing to see the new sessions.

**Import — a single file or a directory.** Every `import_*` tool takes a `path`; directories are scanned recursively and each file / conversation becomes its own session:

```
import_claude({ path: "C:\Users\<you>\.claude\projects\<slug>\<sessionId>.jsonl" })
import_codex({ path: "C:\Users\<you>\.codex\sessions\2026\05\18\rollout-2026-05-18T21-14-16-xxxx.jsonl" })
import_chatgpt({ path: "C:\Users\<you>\Downloads\chatgpt-export\conversations.json" })
import_opencode({ path: "C:\Users\<you>\.local\share\opencode\opencode.db" })
import_local_jsonl({ path: "D:\downloads\session.jsonl" })
```

`import_local_jsonl({ path })` accepts any local `.jsonl` session file (or directory): it auto-detects `dsh` / `claude` / `codex` / `cursor` / `reasonix` / `pi` / `openclaw` / `hermes`, and the `format` parameter forces one parser when detection is wrong:

```
import_local_jsonl({ path: "D:\downloads\session.jsonl" })
import_local_jsonl({ path: "D:\downloads\unknown.jsonl", format: "claude" })
```

`import_chatgpt` / `import_opencode` / `import_zcode` / `import_hermes` always return a batch result — one file / database holds all conversations, so each conversation becomes its own session in a single call.

<details>
<summary><b>Import parameters & behaviors</b></summary>

- `preview: true` (alias `dryRun: true`) — run the import **read-only**: resolve, read and convert exactly like a real import, but persist nothing (zero side effects). Drop the flag and call again to actually import.
- `force: true` — create a **fresh full copy** under a new id (`import-<sessionId>-<n>`) even when the source was already imported; the old session is never modified.
- `sessionId` (optional) — override the target DSH session id (default `import-<source sessionId>`).
- `import_chatgpt({ branch: 'all' })` — restore **every root→leaf branch** of the conversation DAG as its own session (the main thread stays the last-child chain; branch sessions carry a suffixed source id and a branch-marked title). Tool messages in the export are restored as real `tool/call` + `tool/result` (structured JSON arguments, FIFO pairing) instead of plain text.
- `import_claude({ compacted: true })` — import only the **last compression summary + tail** of a long session (summary restored as a leading `reasoning` block; title from the summary record). Without a summary record the flag has no effect.
- `import_hermes({ lineage: 'tail' })` — import only **leaf chain tails** (sessions that are not any other session's parent); compaction-fork parent sessions are skipped and annotated.
- **Archived sessions are re-importable** — DSH's archive hides a session from the sidebar but keeps it (and its id) in persistence, so the panel and `scan_discover` now report an archived target as **已归档 / Archived** with a re-import button. Importing again creates a fresh copy under a new id (`import-<sessionId>-<n>`, same minting as `force`) without touching the archived session; the same applies per-session inside multi-session sources (chatgpt / opencode / zcode / hermes DBs).
- **Incremental re-import** — re-importing the same source never rewrites imported history. Unchanged files are skipped (`already-imported`) without re-reading; grown files append only their **new turns** to the same session (`appended`); truncated files are detected and reported (`sourceShrunk`) — use `force: true` for a complete fresh copy:

```
import_claude({ path: "C:\Users\<you>\.claude\projects\<slug>\<sessionId>.jsonl" })
// unchanged → "already-imported" · grew → "appended" (new turns only)
```

</details>

Every import result reports its `status` and any anomalies — malformed lines, suspected secrets, per-source drops — nothing is silently swallowed.

### import_agents — convert pi/opencode/Claude/Codex agents, prompts, skills & config into DSH skills

`import_agents` converts custom agents, mode prompts, skills, instructions and config references from **pi** (`~/.pi/agent/{agents,prompts}/*.md`), **opencode** (`~/.config/opencode/{agents,skill}/*.md`), **Claude** (`~/.claude/memory/<group>/*.md`, `~/.claude/skills/<skill>/SKILL.md`, or an explicit project-root `CLAUDE.md` via `claudeProjectRoot`) and **Codex** (`~/.codex/skills/<skill>/SKILL.md`, `~/.codex/instructions.md`, `~/.codex/AGENTS.md`, `~/.codex/config.toml`) into **persistent DSH skill assets** — `$DSH_AGENTS_HOME/skills/<name>/SKILL.md` (`$DSH_AGENTS_HOME` defaults to `~/.agents`), so they become discoverable skills in any session. This complements the runtime-only Claude bridge (`context-bridge`, off by default): that one injects Claude memory/CLAUDE.md/skills transiently; this one persists them (plus pi/opencode/Codex assets).

By default it **dry-runs** (returns the write/complete/skip plan with zero side effects); pass `apply: true` to actually write:

```
import_agents()                    // dry-run: plan only
import_agents({ apply: true })     // write $DSH_AGENTS_HOME/skills/<name>/SKILL.md
import_agents({ codexRoot: "~/.codex", apply: true })  // include Codex assets explicitly
```

Semantics: same-name conflicts across sources get a `-<source>` suffix (e.g. `-pi` / `-opencode` / `-codex`); identical content is skipped (idempotent); sources already carrying `kind: dsh`/`kind: skill` frontmatter are not re-imported; a bundle directory that lacks `SKILL.md` is completed in place (preserving existing `scripts/` etc.); nested YAML (e.g. `permission:`) is preserved.

### scan_discover — read-only session discovery

`scan_discover` scans the known data roots of all 15 formats (including the Reasonix desktop app and Claude-3p roots on Windows) and returns a structured session index (title, project, cwd, path, import status, and git branch/dirty when the source directory is a git repo) so you can preview before a batch import. Zero side effects:

```
scan_discover()
scan_discover({ path: "~/.codex/sessions", format: "codex", query: "import" })
```

### list_imported_sessions & retract_import — identify & retract

`list_imported_sessions()` enumerates every DSH session this plugin has imported; `retract_import({ sessionId })` (or `sourcePath`) removes its registry record and returns manual-deletion guidance. **Identification and guided manual deletion only — nothing is ever deleted**:

```
list_imported_sessions()
retract_import({ sessionId: "import-019f5f27-…" })
```

### export_claude / export_codex / export_kimi — DSH → target format

`export_claude({ sessionId })` serializes an existing DSH session (imported or native) into a Claude Code JSONL transcript, ready for `--resume`. It is written to `<outputDir>/<slug>/<uuid>.jsonl` (default `~/.claude/projects`), with a fresh UUID v4 file name — an existing file is never overwritten. `export_codex` and `export_kimi` write Codex rollout JSONL and Kimi `wire.jsonl` respectively (default `~/.dsh/exports`) — completing the DSH↔Claude↔Codex↔Kimi matrix (the import edges already exist). Every export lists its **lossy items** in a `degradations` field (orphan tool results, skipped injections, skipped attachments) — nothing is silently dropped:

```
export_claude({ sessionId: "import-019f5f27-…" })
export_codex({ sessionId: "…", dryRun: true })
export_kimi({ sessionId: "…", outputDir: "D:\backup\kimi" })
```

### export_bundle / restore_bundle — portable interchange bundle

`export_bundle({ sessionId })` writes a **`.dshbundle.json`** — an event-level lossless interchange bundle (protocol: [docs/INTERCHANGE.md](docs/INTERCHANGE.md)) with double SHA-256 fingerprints (session-level + file-level) and machine-independent landing info (`originalCwd` + `landingHint`). `restore_bundle({ path })` verifies the fingerprints (corruption is reported loudly, never restored silently), then imports the session through the same idempotent state machine — repeat restores skip, `force: true` makes a copy, directory mode restores every `.dshbundle.json`:

```
export_bundle({ sessionId: "import-019f5f27-…" })                    // → ~/.dsh/exports/<id>.dshbundle.json
restore_bundle({ path: "D:\backup\sess.dshbundle.json" })            // machine A → machine B
restore_bundle({ path: "D:\backup\bundle-dir", preview: true })      // dry-run
```

**Cross-machine (REQ-62):** export on machine A, copy the bundle, restore on machine B. When the original `cwd` does not exist there, the session falls back to the bundle file's directory (REQ-39-lite grouping) and the result reports `cwdAvailable: false` / `groupedTo` / `restoreNote` — never silent.

### verify_session — read-only structural audit

`verify_session({ sessionId })` runs a read-only structural check on any DSH session: seq continuity, event-type whitelist, `surfaceOp` on surface events, `sourceEventSeqs` pointing at real `tool/call`s, turn/step balance, and tool-call↔result pairing. Problems are located one-by-one (kind + seq + message), and per-kind `repairHints` tell you what to do (re-import with `force`, close a half-open turn, or accept a mid-transcript source boundary):

```
verify_session({ sessionId: "import-019f5f27-…" })
```

### doctor — read-only migration health check

`doctor()` runs a read-only health check after migration: imports registry readability, whether every imported session still exists in `sessionPersistence`, whether `import_agents` skills were persisted, and whether `workspaceRegistry` is available. It never writes, imports, syncs, or deletes anything:

```
doctor()
```

It returns `{ ok, checks, issues, totals }` — useful after a large batch import or before/after moving DSH data between machines.

### standalone CLI — export-md / doctor

The npm package also ships a small standalone CLI (no DSH host required):

```
npx dsh-chat-import export-md ~/.dsh/sessions/<workspace>/<session>/session.jsonl
npx dsh-chat-import export-md <session-dir> --out session.md
npx dsh-chat-import doctor
```

`export-md` renders a DSH session log as readable Markdown (session header, title, user/assistant text, thinking, tool calls and results). `doctor` reads `$DSH_HOME/dsh-chat-import/imports.json` and the local `sessions` tree for a lightweight health summary.

### import_mcp — MCP mirror plan

`import_mcp` reads MCP servers from **Claude** (`~/.claude.json` / `.mcp.json`) and **Codex** (`~/.codex/config.toml`) and generates a reviewable **DSH MCP client YAML snippet**. By default it dry-runs; `apply: true` writes the snippet to `$DSH_HOME/dsh-chat-import/mcp-mirror.cordis.yml` (or `outPath`) — it never edits your profile automatically:

```
import_mcp()                                  // dry-run: list servers + YAML snippet
import_mcp({ apply: true })                   // write generated snippet
/mcp-status                                   // list discovered servers
```

### import_settings — settings/config translation suggestions

`import_settings` reads **Claude `~/.claude/settings.json`** and **Codex `~/.codex/config.toml`** and returns migration suggestions for DSH: model binding, permission rules, hooks, environment variables, and model provider. It is read-only and never applies anything:

```
import_settings()                             // list suggestions
/settings-suggest                             // same via slash command
```

### sync_to_claude — incremental write-back

`sync_to_claude({ sessionId })` appends a session's **new complete turns** back to its Claude Code file — `target: "source"` by default (the import source) or `"copy"` (the last `export_claude` copy). Guards report an externally modified or shrunken file instead of overwriting it; `force: true` re-anchors past external edits (the overridden guard is still reported):

```
sync_to_claude({ sessionId: "import-019f5f27-…" })
sync_to_claude({ sessionId: "…", target: "copy", dryRun: true })
```

### Browser panel — discover & import from the sidebar

The dsh web sidebar shows an **导入会话** button in its footer, styled to match the sidebar's **设置** entry and carrying the plugin logo as its icon (a `sidebar.footer.action` slot entry: while the official Cordis plugin badge occupies the whole footer row the button renders as a fixed overlay just above the footer so it can never be squeezed out; when the badge is hidden or absent it sits in the footer row itself, right above 设置). It opens a panel listing discovered sessions **grouped by workspace folder** (each source's `cwd`/project when available, otherwise an "(未分组)" bucket), with a source filter — "全部来源" scans every format's default data root, a single source restricts the view — and a per-session import-status badge (已导入 / 部分 / 未导入). A search box filters by title / workspace / path, and the list is **paginated** (50 per page) with selections kept across pages for bulk operations. The panel closes on `Escape`.

Each row supports **single import**, and the checkboxes enable **multi-select import** ("导入所选 (N)"): the panel calls the same host import pipeline as the `import_*` tools, so idempotent skip / incremental append / `force` / context-budget semantics are identical, and the list refreshes with the new statuses after importing. A multi-session source (e.g. `conversations.json`, an opencode/zcode/hermes DB) is imported whole — opencode/zcode restrict to the selected `sessionId`s.

> The data comes from the same read-only discovery as `scan_discover` (30s TTL cache + persistent mtime bookmarks); the panel itself never writes anything except the imports you trigger.

### `/import` slash command & `/resume-*` handoff

The plugin also registers a **`/import <source> <path>`** slash command (available where the dsh `commands` service is mounted): type it directly in a session to import without a model round-trip — the same pipeline and the same idempotent / incremental / `force` / context-budget semantics as the `import_*` tools. `<source>` accepts the short name (`claude`, `codex`, …), the client source id (`claude-code`), or the full tool name (`import_claude`); `<path>` is a transcript file or a session directory / data root (single-file import vs. directory batch as usual).

**`/import-all [source] [path]`** scans the default data roots (or one source / explicit path) and imports every not-yet-imported session in one shot — same pipeline, idempotent skip / incremental append, archived sessions skipped, failures reported individually.

**`/attach-workspaces`** re-attaches already-imported sessions to their cwd-matched workspaces from the imports registry — useful for fixing early imports that landed in “未分组” or whose workspace attach previously failed. It is idempotent and safe to re-run. Options: `--mode auto|dedicated|per-project` and `--dir <path>` (for `dedicated`).

**`/doctor`** runs the same read-only health check as the `doctor` tool and prints a concise report.

**`/mcp-status`** lists MCP servers discovered from Claude/Codex configs (read-only); use `import_mcp` to generate a DSH MCP client snippet.

**`/settings-suggest`** lists Claude/Codex config translation suggestions (read-only); use `import_settings` for the structured tool output.

**`/import-reset`** clears the scan cache (in-memory TTL + persistent `scan-cache.json`) when discovery results look stale; imported sessions are untouched.

**`/resume-claude [id:<sessionId> | keyword]`** and **`/resume-codex`** generate a **handoff summary** from an external transcript (goal + last request, involved files/artifacts, last tool call, exact stop point, safest next step) and inject it into the current session so you can continue the work in DSH — treating the transcript as untrusted static history (no system/developer/thinking content is reproduced; old tool output is flagged as stale evidence). Leave the argument empty for the most recent session, use `id:<sessionId>` for an exact one, or a title keyword — **multiple matches list candidates without guessing**:

```
/resume-claude id:282095ab-1111-4222-8333-444455556666
/resume-codex 修复登录
```

### Session-start context enhancements

Two optional hooks run when a DSH session starts (the host `agent/session-start` event), both agent-scoped and never touching your transcripts:

- **Migration hint (default on)** — when the session's workspace has discoverable external history (already-imported or importable), a one-line `PromptContext` is injected telling the model how to continue (`/import <source> <path>` or the sidebar panel). Per-project memory shows the hint only once per workspace; set `DSH_IMPORT_SESSION_HINT=0` to disable.
- **Claude context bridge (default off)** — set `DSH_IMPORT_CONTEXT_BRIDGE=1` to bridge Claude Code context assets into the session: `~/.claude/memory/*.md` (grouped `feedback` > `project` > `reference` > `user`, 8 KiB cap, re-read via mtime cache), the project-root `CLAUDE.md` **and global `~/.claude/CLAUDE.md`**, and `~/.claude/skills/*/SKILL.md` (registered as `claude-<name>` skills on this agent only).

---

## 🔑 Key behaviors

- **Read-only import** — source transcripts and databases are never rewritten; imported DSH history is append-only (existing events are never modified).
- **Idempotent + incremental** — unchanged sources are skipped without re-reading; growth appends only the new turns; truncation is detected and reported.
- **Auto workspace grouping** — sessions are grouped into the workspace of their source `cwd`; the cwd is resolved through the authoritative `~/.claude.json` project mapping (exact / basename / underscore variants, CJK-preserving) with an ASCII slug-decode fallback for Claude, greedy disk-existence decoding for Reasonix project slugs, and a **home-directory sandbox guard** (a cwd equal to the user's home is never used as a workspace — the sandbox ACL would reject it). When the resolved `cwd` does not exist on this machine (common when migrating transcripts from another machine), the session falls back to the workspace of the **source file's directory** so it never disappears into "未分组".
- **Imported sessions are fully tool-enabled** — session creation prefers the host `agents.create` path with the default preset scope mounted (`agentPresets.mount`) and the default model bound (`provider` / `model` / `maxTokens`), so imported sessions expose the same tool surface as native ones and auto-compaction can engage; if the `agents` service is absent it falls back to plain `sessionPersistence` without breaking imports.
- **Context budget protection** — imported sessions carry no provider configuration, so dsh never auto-compacts them; oversized sessions are trimmed to fit a context budget (per-message caps, then a compressed middle keeping the earliest prompts, a summary and the tail). The budget can be set per call or via the `DSH_IMPORT_CONTEXT_BUDGET` env var; the trim is always reported in the result. Claude sessions can instead be imported as their last compression summary + tail (`compacted: true`).
- **Fail loudly, never silently** — malformed lines and suspected secrets are counted and reported by position (line numbers / kind — content is never output); anything a source format cannot preserve is explicitly flagged in the import report, and every export reports its `degradations`. Every persisted session also runs a structural self-check (seq continuity, known event types, `surfaceOp` on surface events, valid `sourceEventSeqs`) — violations surface in the import result as a `validation` report, and `verify_session` audits any session on demand with repair hints.
- **Sandbox** — reading source files or writing exports outside the workspace requires the session sandbox to allow the path.

---

## 🏗️ Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js ≥ 22.13 — pure ESM, zero build |
| Platform | DeepSeek Harness plugin — Cordis `everything-is-a-plugin`, consumes only public host services |
| Parsers | Claude/Codex/Cursor/Gemini/Reasonix/Pi/Kimi JSONL · ChatGPT JSON · opencode/ZCode/Hermes SQLite (`node:sqlite`) |
| Interop | Interchange v1 protocol ([docs/INTERCHANGE.md](docs/INTERCHANGE.md)) — shared turns IR + degradation rules + bundle format |
| UI | dsh web sidebar panel (hand-written CJS bundle) · i18n via `@deepseek-ai/dsh-client-locale` |
| CI | GitHub Actions — test / lint / `check:linux` cross-platform guard / headless smoke |

```
lib/
├── convert/          # pure per-source converters + interchange v1 core (zero DSH deps)
├── export/           # reverse serializers (claude / codex / kimi / bundle)
├── imports.mjs       # idempotent import registry
├── import-core.mjs   # shared import state machine (agents.create + cwdHint + home guard)
├── toolkit.mjs       # makeImportTool factory + IMPORT_SPECS
├── panel.mjs         # browser panel JSON routes
├── command.mjs       # /import + /import-all + /attach-workspaces + /doctor commands
├── resume-command.mjs # /resume-claude /resume-codex handoff (REQ-30)
├── handoff.mjs       # handoff summary pure functions (REQ-30)
├── cwd-map.mjs       # cwd authoritative mapping + slug decode + home guard (REQ-39)
├── restore.mjs       # restore_bundle orchestration (REQ-56/62)
├── verify.mjs        # verify_session structural audit (REQ-23)
├── doctor.mjs        # read-only migration health check (REQ-66)
├── mcp.mjs           # Claude/Codex MCP mirror plan (REQ-68)
├── settings.mjs      # Claude/Codex settings translation suggestions (REQ-71)
├── prompt-hint.mjs   # session-start migration hint (REQ-53)
└── context-bridge.mjs # Claude memory / CLAUDE.md / skills bridge (REQ-28)
```

---

## ⚙️ Compatibility

Targets the `dsh 0.1.x` line (`dsh-tools ^0.1.0-rc.6`, tested on `dsh 0.1.0-rc.6`) and requires **Node.js >= 22.13** (the first release where `node:sqlite` is available without a flag). `npm test` — 484 cases.

---

## 🗺️ Roadmap

- [x] 15 import sources + reverse export / sync back to Claude Code
- [x] Browser import panel + `/import` / `/import-all` slash commands + session-start migration hint & context bridge
- [x] Interchange IR v1 + portable backup bundle + cross-machine restore (REQ-18 / REQ-56 / REQ-62)
- [x] Matrix interop (Claude ↔ Codex ↔ Kimi ↔ DSH) + `verify_session` audit (REQ-23) + `/resume-claude` / `/resume-codex` handoff (REQ-30)
- [x] More sources: Reasonix desktop, Claude-3p (REQ-45) · Hermes lineage (REQ-51)
- [ ] Codex official App Server API source (REQ-52 — recon done, rollout route maintained)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-chat-import&type=Date)](https://star-history.com/#Nwflower/dsh-chat-import&Date)

---

## 🤝 Contributing

Contributions are welcome — fork the repo, create a `feature/<name>` branch, and open a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide (dev setup, conventions, security & privacy).

- **Tests:** `npm test` · **Cross-platform guard:** `npm run check:linux`
- Repo conventions live in [AGENTS.md](AGENTS.md): conventional commits (Chinese), bilingual README must stay in sync, plugin consumes only public dsh host services, multi-session coordination via the file-claim protocol.

---

## 📄 License

MIT — see [LICENSE](LICENSE).
