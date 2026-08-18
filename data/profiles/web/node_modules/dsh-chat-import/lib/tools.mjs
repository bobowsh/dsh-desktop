// lib/tools.mjs — 30 个工具的注册（16 个 import_* + import_agents + doctor +
// import_mcp + import_settings + export_claude/codex/kimi + export_bundle/restore_bundle +
// sync_to_claude + list_imported_sessions + retract_import + scan_discover +
// verify_session）
//
// apply 入口只做两件事：本文件的 registerTools（工具注册）与 lib/panel.mjs 的
// registerPanelRoutes（webServer 路由，可选服务延迟挂载）。每个 import_* 工具由
// makeImportTool（lib/toolkit.mjs）按 spec 收敛 schema/render/execute；特殊形态来源
//（chatgpt / grokbuild / hermes / opencode / zcode 的导入编排与预览）在
// lib/import-variants.mjs。依赖 ctx（host 服务），非纯函数。

import { defineTool, TOOL_RUNTIME_SCHEDULER } from '@deepseek-ai/dsh-tools'
import { join } from 'node:path'
import {
  convertClaudeJsonl, convertCodexJsonl, convertChatgptJson, convertCursorJsonl,
  convertGeminiJson, convertReasonixJsonl, convertPiJsonl, convertOpencodeJson,
  convertZcodeJson, convertGrokbuildJson, convertOpenclawJson, convertHermesJson,
  convertKimiWire, convertQoderJsonl, convertDshJsonl, convertLocalJsonl,
} from '../convert.mjs'
import { openclawDisplayNames } from './convert/openclaw.mjs'
import { markTrimmedSource } from './budget.mjs'
import { runDecision, collectJsonFiles } from './import-core.mjs'
import { syncClaudeSession } from './backfill.mjs'
import { importOpencodeFile, importOpencodeDirectory } from './opencode.mjs'
import { importZcodeFile, importZcodeDirectory } from './zcode.mjs'
import { FORMATS } from './discovery.mjs'
import { makeImportTool } from './toolkit.mjs'
import {
  importChatgptFile, importChatgptDirectory,
  importGrokbuildSession, importGrokbuildDirectory,
  importHermesFile, importHermesDirectory, hermesFileArgs,
  importKimiFile, importKimiDirectory, kimiDeriveArgs, kimiIsSessionDir,
  previewChatgptFile, previewChatgptDirectory,
  previewGrokbuildSession, previewGrokbuildDirectory,
  previewHermesFile, previewHermesDirectory,
  previewKimiFile, previewKimiDirectory,
  previewOpencodeFile, previewOpencodeDirectory,
  previewZcodeFile, previewZcodeDirectory,
} from './import-variants.mjs'
import { exportClaudeSession, exportBundleSession, exportCodexSession, exportKimiSession } from './export-tool.mjs'
import { restoreBundle, restoreBundleDirectory } from './restore.mjs'
import { verifySession } from './verify.mjs'
import { listImportedSessions, retractImport } from './retract.mjs'
import { runScanDiscover } from './discovery-host.mjs'
import { runAgentsImport } from './agents.mjs'
import { runDoctor } from './doctor.mjs'
import { runMcpMirror } from './mcp.mjs'
import { runSettingsSuggest } from './settings.mjs'
import { readDshText, collectDshFiles } from './dsh.mjs'
import { greedyDecodeSlugPath } from './cwd-map.mjs'

export function registerTools(ctx, registryDir) {
  // 声明 TOOL_RUNTIME_SCHEDULER 命名导入：一旦解析到旧副本 dsh-tools@0.0.1-rc.1
  //（只导出 TOOL_REGISTRY_SCHEDULER），模块加载即失败并大声报错，而不是静默用旧
  // ABI 注册工具、最终让宿主 agent-loop 在调度时崩溃
  //（Cannot read properties of undefined (reading 'prepare')）并污染会话历史。
  if (typeof TOOL_RUNTIME_SCHEDULER !== 'symbol') {
    throw new Error('dsh-chat-import: resolved @deepseek-ai/dsh-tools lacks TOOL_RUNTIME_SCHEDULER — requires ^0.1.0-rc.6')
  }
  ctx.tools.register(makeImportTool(ctx, {
    format: 'claude',
    toolName: 'import_claude',
    sourceLabel: 'Claude Code',
    convert: convertClaudeJsonl,
    registry: { dir: registryDir },
    // REQ-22：compacted 摘要导入选项（只导最后一次压缩摘要 + 尾部）
    schema: {
      extra: {
        compacted: {
          type: 'boolean',
          description: '可选：true 时只导最后一次压缩摘要 + 尾部（Claude compacted 摘要导入，超长会话主动压缩还原，REQ-22）；默认 false 全量。',
        },
      },
    },
    // 文件名 stem 传给转换器做「主 transcript」判定：subagent/workflow 辅助 transcript
    // 记录携带父 sessionId，按它建会话会与主 transcript 撞 id 导致主内容被跳过。
    // REQ-39 权威映射在转换层（convertClaudeJsonl 无 cwd 记录时输出 cwdHint slug，
    // importTranscript 消费 resolveClaudeCwd）——避免对每个文件都读 ~/.claude.json。
    derive: {
      args: (target) => {
        const p = target.displayPath || ctx.fs.processPath(target)
        const base = String(p).split(/[\\/]/).pop() || ''
        return { fileStem: base.replace(/\.jsonl$/i, '') }
      },
    },
    description:
      '从 Claude Code 的 JSONL transcript 导入历史对话为可继续的 DSH 会话。' +
      'path 可以是单个 .jsonl 文件，也可以是包含多个 .jsonl 的目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析 user/assistant/tool 消息、合成会话事件并持久化；重复导入同一会话会幂等跳过。' +
      '返回新会话 id（或批量统计）与明细。',
  }))
  ctx.tools.register(makeImportTool(ctx, {
    format: 'codex',
    toolName: 'import_codex',
    sourceLabel: 'Codex/ChatGPT',
    convert: convertCodexJsonl,
    registry: { dir: registryDir },
    description:
      '从 Codex / ChatGPT CLI 的 rollout JSONL 导入历史对话为可继续的 DSH 会话（' +
      '~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl）。' +
      'path 可以是单个 .jsonl 文件，也可以是包含多个 .jsonl 的目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析 user/assistant/function_call/custom_tool_call 消息、合成会话事件并持久化；重复导入同一会话会幂等跳过。' +
      '返回新会话 id（或批量统计）与明细。',
  }))
  ctx.tools.register(makeImportTool(ctx, {
    format: 'chatgpt',
    toolName: 'import_chatgpt',
    sourceLabel: 'ChatGPT',
    convert: convertChatgptJson,
    io: {
      file: (c, t, a) => importChatgptFile(c, t, a, { registryDir }),
      dir: (c, d, a) => importChatgptDirectory(c, d, a, { registryDir }),
      previewFile: (c, t, a) => previewChatgptFile(c, t, a),
      previewDir: (c, d, a) => previewChatgptDirectory(c, d, a),
      alwaysBatch: true,
    },
    registry: { dir: registryDir },
    // REQ-19：branch 控制分支还原（main 默认 = 最后 child 链；all = 全部分支会话）
    schema: {
      extra: {
        branch: {
          type: 'string',
          enum: ['main', 'all'],
          description: "可选：'main'（默认）只重建主线程（children 最后一个）；'all' 导出全部分支会话（每条 root→leaf 路径一个会话，分支会话标题带分支标记）。",
        },
      },
    },
    description:
      '从 ChatGPT 网页导出的 conversations.json 导入历史对话为可继续的 DSH 会话。' +
      '导出 ZIP 解压后得到 conversations.json（JSON 数组，一个文件含全部会话）；' +
      'path 可以是该 .json 文件，也可以是包含多个 .json 的目录（目录模式递归扫描）。' +
      '解析 mapping 主线程（占位节点/系统消息跳过）、工具消息还原 tool/call + tool/result、' +
      '合成会话事件并持久化；branch:\'all\' 枚举全部分支（REQ-19）；重复导入同一会话会幂等跳过。' +
      '返回批量统计与逐会话明细。',
  }))
  ctx.tools.register(makeImportTool(ctx, {
    format: 'cursor',
    toolName: 'import_cursor',
    sourceLabel: 'Cursor',
    convert: convertCursorJsonl,
    registry: { dir: registryDir },
    // Cursor 行内无会话 id：用文件名（composer uuid）作稳定 id，保证幂等
    derive: {
      args: (target) => {
        const p = target.displayPath || ctx.fs.processPath(target)
        const base = String(p).split(/[\\/]/).pop() || ''
        return { cursorId: base.replace(/\.jsonl$/i, '') }
      },
    },
    description:
      '从 Cursor 的 agent transcript JSONL 导入历史对话为可继续的 DSH 会话（' +
      '~/.cursor/projects/<slug>/agent-transcripts/<composer-id>/<composer-id>.jsonl）。' +
      'path 可以是单个 .jsonl 文件，也可以是包含多个 .jsonl 的目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析 user/assistant 文本与 tool_use 调用（transcript 不含 tool_result，仅导入调用历史）；' +
      '过滤 [REDACTED] 哨兵；重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  ctx.tools.register(makeImportTool(ctx, {
    format: 'gemini',
    toolName: 'import_gemini',
    sourceLabel: 'Gemini CLI',
    convert: convertGeminiJson,
    derive: { collect: collectJsonFiles }, // Gemini 是单会话 .json（非 JSONL）
    registry: { dir: registryDir },
    description:
      '从 Gemini CLI 的会话 JSON 导入历史对话为可继续的 DSH 会话（' +
      '~/.gemini/history/<slot>/chats/session-*.json）。' +
      'path 可以是单个 .json 文件，也可以是包含多个 .json 的目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析 user/gemini 消息、thoughts→reasoning、内联 toolCalls（结果同对象）并持久化；' +
      'info 系统通知跳过；重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  ctx.tools.register(makeImportTool(ctx, {
    format: 'reasonix',
    toolName: 'import_reasonix',
    sourceLabel: 'Reasonix',
    convert: convertReasonixJsonl,
    registry: { dir: registryDir },
    // 会话 id 用文件名 stem（幂等）；cwd/标题从同目录 <stem>.meta.json 派生；
    // REQ-45 桌面版：projects/<slug>/sessions 布局下标题走目录级 .titles.json 权威
    // 索引、cwd 走 slug 贪心解码（REQ-39）；
    // REQ-22：V2 WAL（<stem>.events.jsonl）读取经 args.walText 传入转换层合并
    derive: {
      args: async (target) => {
        const p = target.displayPath || ctx.fs.processPath(target)
        const base = String(p).split(/[\\/]/).pop() || ''
        const stem = base.replace(/\.jsonl$/i, '')
        const derived = { reasonixId: stem }
        try {
          // meta 与 transcript 同目录：<stem>.meta.json
          const metaPath = String(p).replace(/[\\/][^\\/]*\.jsonl$/i, '') + '\\' + stem + '.meta.json'
          const metaTarget = await ctx.fs.resolve(metaPath)
          const raw = await ctx.fs.readText(metaTarget)
          const meta = JSON.parse(raw)
          if (meta && typeof meta.workspace === 'string' && meta.workspace) derived.cwd = meta.workspace
          if (meta && typeof meta.summary === 'string' && meta.summary.trim()) derived.title = meta.summary.trim()
        } catch {
          // meta 缺失（子代理或旧文件）不致命：仍按 stem 导入，仅无 cwd/标题
        }
        // REQ-45 桌面版布局：projects/<slug>/sessions/<stem>.jsonl
        const segs = String(p).replace(/[\\/]+$/, '').split(/[\\/]/)
        const sessionsIdx = segs.lastIndexOf('sessions')
        if (sessionsIdx >= 2 && segs[sessionsIdx - 2] === 'projects') {
          const slug = segs[sessionsIdx - 1]
          const sessionDir = segs.slice(0, sessionsIdx + 1).join('\\')
          // 目录级 .titles.json 权威标题（basename → 标题）
          if (!derived.title) {
            try {
              const titlesTarget = await ctx.fs.resolve(join(sessionDir, '.titles.json'))
              const titles = JSON.parse(await ctx.fs.readText(titlesTarget))
              if (titles && typeof titles[stem] === 'string' && titles[stem].trim()) {
                derived.title = titles[stem].trim()
              }
            } catch {
              // .titles.json 缺失/损坏：标题回退首问（不致命）
            }
          }
          // cwd = slug 贪心解码（REQ-39；meta.json 无 workspace 时）
          if (!derived.cwd) {
            const decoded = await greedyDecodeSlugPath(ctx, slug)
            if (decoded) derived.cwd = decoded
          }
        }
        try {
          // REQ-22：WAL 与 checkpoint 同目录：<stem>.events.jsonl（V2 事件日志权威，
          // 自动合并；无 WAL 的旧版本/子代理文件自然回退纯 checkpoint）
          const walPath = String(p).replace(/[\\/][^\\/]*\.jsonl$/i, '') + '\\' + stem + '.events.jsonl'
          const walTarget = await ctx.fs.resolve(walPath)
          derived.walText = await ctx.fs.readText(walTarget)
        } catch {
          // 无 WAL：纯 checkpoint 导入
        }
        return derived
      },
    },
    description:
      '从 Reasonix 的会话 JSONL 导入历史对话为可继续的 DSH 会话（' +
      '~/.reasonix/sessions/desktop-*.jsonl 与 subagent-sub-*.jsonl）。' +
      'path 可以是单个 .jsonl 文件，也可以是包含多个 .jsonl 的目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析 user/assistant/tool 消息（兼容 v1 嵌套与 v2 扁平 tool_calls）、reasoning_content→reasoning、' +
      'tool_call_id 配对结果；会话 id 取文件名 stem，cwd/标题从同目录 .meta.json 派生；' +
      '重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  ctx.tools.register(makeImportTool(ctx, {
    format: 'opencode',
    toolName: 'import_opencode',
    sourceLabel: 'opencode',
    convert: convertOpencodeJson,
    // 一库多会话：单 .db 文件也恒返回批量形态；目录模式自动定位 opencode.db（无递归）
    io: {
      file: (c, t, a) => importOpencodeFile(c, t, a, { registryDir, runDecision, markTrimmedSource }),
      dir: (c, d, a) => importOpencodeDirectory(c, d, a, { registryDir, runDecision, markTrimmedSource }),
      previewFile: (c, t, a) => previewOpencodeFile(c, t, a),
      previewDir: (c, d, a) => previewOpencodeDirectory(c, d, a),
      alwaysBatch: true,
    },
    registry: { dir: registryDir },
    // opencode 无单会话 id 覆盖、无递归（目录里就是 opencode.db）
    schema: {
      drop: ['sessionId', 'recursive'],
      extra: {
        sessionIds: {
          type: 'array',
          items: { type: 'string' },
          description: '可选：只导入指定源会话 id（缺省导入全部会话）。',
        },
        fullHistory: {
          type: 'boolean',
          description: '可选：true 时导入全量历史（忽略 opencode 的对话压缩）；默认 false（尊重压缩：只导最后一次摘要 + 尾巴）。',
        },
      },
    },
    label: {
      path: 'opencode 历史数据库（opencode.db）的文件路径，或包含 opencode.db 的数据目录路径。',
      batch: '会话',
      skipped: '无用户回合',
    },
    description:
      '从 opencode 的 SQLite 历史库 opencode.db 导入历史会话为可继续的 DSH 会话（默认位置 ~/.local/share/opencode/opencode.db）。' +
      'path 可以是 .db 文件，也可以是包含 opencode.db 的数据目录（目录模式自动定位，无递归）。' +
      '读取 session/message/part 表重建对话（event 表是部分镜像、session_message/session_input 为空，忽略）；' +
      '文本/reasoning/工具调用（tool/call + tool/result，含错误标记与 sourceEventSeqs 关联）/图片附件/补丁/子任务完整保留；' +
      '默认尊重对话压缩（compaction，只导最后一次摘要+尾巴，摘要作 reasoning 块前置），可选 fullHistory 导全量；' +
      '可选 sessionIds 只导指定源会话；重复导入同一会话会幂等跳过。返回批量统计与逐会话明细。',
  }))
  // REQ-38 zcode 源（第 8 个导入源）：z.ai 官方 CLI（zcode.z.ai）会话存储
  // ~/.zcode/cli/db/db.sqlite（SQLite 权威索引）+ 旧版 transcript.jsonl 回退。
  // 一库多会话：单 .db / 单 transcript.jsonl 也恒返回批量形态；目录模式自动定位
  // db.sqlite（无递归）；zcode://<id> 伪路径走默认库只导该会话。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'zcode',
    toolName: 'import_zcode',
    sourceLabel: 'zcode',
    convert: convertZcodeJson,
    io: {
      file: (c, t, a) => importZcodeFile(c, t, a, { registryDir, runDecision, markTrimmedSource }),
      dir: (c, d, a) => importZcodeDirectory(c, d, a, { registryDir, runDecision, markTrimmedSource }),
      previewFile: (c, t, a) => previewZcodeFile(c, t, a),
      previewDir: (c, d, a) => previewZcodeDirectory(c, d, a),
      alwaysBatch: true,
    },
    registry: { dir: registryDir },
    // zcode 无单会话 id 覆盖、无递归（目录里就是 db.sqlite）；伪路径的会话 id
    // 由 deriveArgs 从 zcode://<id> 取出（fs.resolve 归一化后 importZcodeFile 还会
    // 从原始 args.path 兜底再取一次，见 lib/zcode.mjs）
    schema: {
      drop: ['sessionId', 'recursive'],
      extra: {
        sessionIds: {
          type: 'array',
          items: { type: 'string' },
          description: '可选：只导入指定源会话 id（缺省导入全部会话）。',
        },
      },
    },
    derive: {
      args: (target) => {
        const p = target.displayPath || ctx.fs.processPath(target)
        if (typeof p === 'string' && p.startsWith('zcode://')) {
          return { zcodeId: p.slice('zcode://'.length) }
        }
        return {}
      },
    },
    label: {
      path: 'zcode 会话数据库（db.sqlite）的文件路径、包含 db.sqlite 的数据目录路径，或 zcode://<sessionId> 伪路径（走默认 ~/.zcode/cli/db/db.sqlite）。',
      batch: '会话',
      skipped: '无用户回合',
    },
    description:
      '从 z.ai 官方 CLI（zcode）的 SQLite 历史库 db.sqlite 导入历史会话为可继续的 DSH 会话（默认位置 ~/.zcode/cli/db/db.sqlite）。' +
      'path 可以是 .db 文件、包含 db.sqlite 的数据目录（目录模式自动定位，无递归），或 zcode://<sessionId> 伪路径（走默认库，只导该会话）。' +
      '读取 session/message/part 表重建对话（message/part 无 sequence 列，按 time_created, id 升序；主会话 parent_id IS NULL）；' +
      '文本/工具调用（tool/call + tool/result 成对输出，含错误标记与 sourceEventSeqs 关联）完整保留；' +
      'compaction 自动压缩摘要（part.type === "compaction" 的 data.summary.body）还原为前置上下文 reasoning 块；' +
      '含 <system-reminder> 的系统注入 user 消息过滤；db 不可用时回退读旧版 transcript.jsonl；' +
      '可选 sessionIds 只导指定源会话；重复导入同一会话会幂等跳过。返回批量统计与逐会话明细。',
  }))
  // grokbuild 源（第 9 个导入源）：Grok Build 本地 CLI 会话存储
  // ~/.grok/sessions/<project>/<session_id>/（及 ~/.grok/archived_sessions/），
  // 每会话目录含 summary.json + chat_history.jsonl。path 可指向单个会话目录
  // （mode single）或 sessions/archived_sessions 根（递归扫 summary.json，批量）。
  // 转换器 convertGrokbuildJson 需读两个文件再转换，编排见 lib/import-variants.mjs
  // 的 importGrokbuildSession / importGrokbuildDirectory。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'grokbuild',
    toolName: 'import_grokbuild',
    sourceLabel: 'Grok Build',
    convert: convertGrokbuildJson,
    io: {
      file: (c, t, a) => importGrokbuildSession(c, t, a, { registryDir }),
      dir: (c, d, a) => importGrokbuildDirectory(c, d, a, { registryDir }),
      previewFile: (c, t, a) => previewGrokbuildSession(c, t, a),
      previewDir: (c, d, a) => previewGrokbuildDirectory(c, d, a),
      // 会话目录（含 summary.json）视作单源走单会话导入；其余目录走批量扫描
      dirSingle: async (ctx, target) => {
        const dirPath = target.displayPath || ctx.fs.processPath(target)
        const sumTarget = await ctx.fs.resolve(join(dirPath, 'summary.json'))
        const sumStat = await ctx.fs.stat(sumTarget)
        return !!(sumStat && sumStat.type === 'file')
      },
    },
    registry: { dir: registryDir },
    label: {
      path: 'Grok Build 会话目录（含 summary.json + chat_history.jsonl）的路径（单会话导入），或 ~/.grok/sessions / archived_sessions 根目录路径（递归扫 summary.json，批量导入）。',
      batch: '会话',
      skipped: '无用户回合',
    },
    description:
      '从 Grok Build 的本地会话目录导入历史对话为可继续的 DSH 会话（' +
      '~/.grok/sessions/<project>/<session_id>/，每会话目录含 summary.json + chat_history.jsonl）。' +
      'path 可指向单个会话目录（单文件导入），或 sessions/archived_sessions 根（递归扫 summary.json，批量导入）。' +
      '解析 user/assistant/tool/system/reasoning 记录（reasoning 加密内部状态与 system 注入过滤）、' +
      'Claude 风格 content block（tool_use/tool_result 配对挂回所属 step）并持久化；' +
      '标题取 generated_title > session_summary；重复导入同一会话会幂等跳过。' +
      '返回新会话 id（或批量统计）与明细；provider=grokbuild，可用 grok --resume <id> 续聊。',
  }))
  // openclaw 源（第 10 个导入源）：OpenClaw 会话 JSONL
  // ~/.openclaw/agents/<agent>/sessions/*.jsonl（同目录 sessions.json 索引提供
  // displayName 作会话标题）。标准单文件/目录批量形态；deriveArgs 按文件 stem 从
  // sessions.json 查 displayName（openclawDisplayNames 纯函数）。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'openclaw',
    toolName: 'import_openclaw',
    sourceLabel: 'OpenClaw',
    convert: convertOpenclawJson,
    registry: { dir: registryDir },
    derive: {
      args: async (target) => {
        const p = target.displayPath || ctx.fs.processPath(target)
        const base = String(p).split(/[\\/]/).pop() || ''
        const stem = base.replace(/\.jsonl$/i, '')
        const derived = { openclawId: stem }
        try {
          // sessions.json 与 transcript 同目录：<dir>/sessions.json（displayName 索引）
          const dirPath = String(p).replace(/[\\/][^\\/]*\.jsonl$/i, '')
          const indexTarget = await ctx.fs.resolve(join(dirPath, 'sessions.json'))
          const name = openclawDisplayNames(await ctx.fs.readText(indexTarget)).get(stem)
          if (name) derived.displayName = name
        } catch {
          // sessions.json 缺失/损坏不致命：仍按 stem 导入，仅无 displayName（标题回退首问）
        }
        return derived
      },
    },
    description:
      '从 OpenClaw 的会话 JSONL 导入历史对话为可继续的 DSH 会话（' +
      '~/.openclaw/agents/<agent>/sessions/*.jsonl，同目录 sessions.json 索引提供 displayName 作标题）。' +
      'path 可以是单个 .jsonl 文件，也可以是包含多个 .jsonl 的 sessions 目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析 user/assistant/toolResult 事件（tool_use/tool_result 配对挂回所属 step、剥 message_id 尾缀）并持久化；' +
      '重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  // hermes 源（第 11 个导入源）：Hermes（本地 AI 编码 CLI）会话存储
  // ~/.hermes/state.db（SQLite 权威索引，恒批量）+ ~/.hermes/sessions/*.jsonl 回退
  // （db 不可用 readHermesDb 返回 null 时）。.db 单文件恒批量（对齐 import_opencode）；
  // 单 .jsonl = 单会话（mode single）；目录优先 state.db、不可用则递归扫 .jsonl。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'hermes',
    toolName: 'import_hermes',
    sourceLabel: 'Hermes',
    convert: convertHermesJson,
    io: {
      file: (c, t, a) => importHermesFile(c, t, a, { registryDir }),
      dir: (c, d, a) => importHermesDirectory(c, d, a, { registryDir }),
      previewFile: (c, t, a) => previewHermesFile(c, t, a),
      previewDir: (c, d, a) => previewHermesDirectory(c, d, a),
      // .db 单文件恒返回批量形态（SQLite 一库多会话）；.jsonl 走单会话导入
      fileBatch: (ctx, target) => /\.db$/i.test(String(target.displayPath || ctx.fs.processPath(target))),
    },
    derive: { args: (target) => hermesFileArgs(ctx, target) },
    registry: { dir: registryDir },
    // REQ-51：lineage 过滤（压缩分叉感知：只导叶子链尾）
    schema: {
      extra: {
        lineage: {
          type: 'string',
          enum: ['tail'],
          description: "可选：'tail' 只导 lineage 链尾（叶子会话，非任何会话的父会话）；压缩分叉父会话跳过并在报告标注（默认不设 = 全部导入，空父会话按现状跳过）。",
        },
      },
    },
    label: {
      path: 'Hermes 历史库（state.db）的文件路径、包含 state.db 的目录路径（SQLite 恒批量），或 sessions/*.jsonl 单文件/目录路径（db 不可用时回退）。',
      batch: '会话',
      skipped: '无用户回合',
    },
    description:
      '从 Hermes（本地 AI 编码 CLI）的会话存储导入历史对话为可继续的 DSH 会话（' +
      '~/.hermes/state.db SQLite 权威索引 + sessions/*.jsonl 回退）。' +
      'path 可指向 state.db 文件或包含 state.db 的目录（恒批量，一库多会话）；' +
      'db 不可用（readHermesDb 返回 null）时回退递归扫描 sessions/*.jsonl，单文件 = 单会话。' +
      '解析 flat/nested 双形态 JSONL 或 DB 中间 JSON（thinking→reasoning、tool_use/tool_result 成对）并持久化；' +
      '重复导入同一会话会幂等跳过。返回批量统计与逐会话明细。',
  }))
  // Pi Coding Agent 源（第 12 个导入源）：Pi Coding Agent 会话 JSONL
  // ~/.pi/agent/sessions/--<cwd>--/<timestamp>_<uuid>.jsonl（树形条目，id/parentId
  // 链接）。活动分支（叶→根）重建、compaction 默认尊重（fullHistory 入参数指纹）；
  // 头行缺失时用文件名 stem 作稳定源 id（幂等）。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'pi',
    toolName: 'import_pi',
    sourceLabel: 'Pi Coding Agent',
    convert: convertPiJsonl,
    registry: { dir: registryDir, fingerprintKeys: ['fullHistory'] },
    // 头行缺失时用文件名 stem 作稳定源 id（幂等）；正常路径取会话头 id（uuid）
    derive: {
      args: (target) => {
        const p = target.displayPath || ctx.fs.processPath(target)
        const base = String(p).split(/[\\/]/).pop() || ''
        return { piId: base.replace(/\.jsonl$/i, '') }
      },
    },
    // fullHistory 计入导入参数指纹：换值重导 → argsChanged（同 opencode 语义）
    schema: {
      extra: {
        fullHistory: {
          type: 'boolean',
          description: '可选：true 时导入全量历史（忽略 Pi 的上下文压缩）；默认 false（尊重压缩：只导最后一次摘要 + 尾巴）。',
        },
      },
    },
    description:
      '从 Pi Coding Agent 的会话 JSONL 导入历史对话为可继续的 DSH 会话（' +
      '~/.pi/agent/sessions/--<cwd>--/<timestamp>_<uuid>.jsonl）。' +
      'path 可以是单个 .jsonl 文件，也可以是包含多个 .jsonl 的目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析活动分支（叶→根树遍历）的 user/assistant/toolResult 消息、thinking→reasoning、' +
      'branch_summary/compaction 摘要→reasoning、bashExecution/custom 注入→文本块，合成会话事件并持久化；' +
      '默认尊重上下文压缩（只导最后一次摘要+尾巴），可选 fullHistory 导全量；' +
      '重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  // REQ-14 Kimi CLI 源（第 13 个导入源）：Moonshot AI 官方开源终端 agent。
  // 旧 Kimi CLI 会话存储 ~/.kimi/sessions/<workdir-md5>/<session-id>/wire.jsonl
  //（+ state.json 标题 / kimi.json workdir 映射）；新 Kimi Code 独立版存储在
  // ~/.kimi-code/sessions/<workspace-id>/<session-id>/agents/main/wire.jsonl
  //（+ state.json，含 cwd/title）。会话目录 = 含上述任一 wire.jsonl 的目录；
  // subagents/ 子代理 wire 不并入主线程批量。path 可指向单个会话目录（mode single，
  // dirSingle 判定）或 sessions 根（批量）。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'kimi',
    toolName: 'import_kimi',
    sourceLabel: 'Kimi CLI',
    convert: convertKimiWire,
    io: {
      file: (c, t, a) => importKimiFile(c, t, a, { registryDir }),
      dir: (c, d, a) => importKimiDirectory(c, d, a, { registryDir }),
      previewFile: (c, t, a) => previewKimiFile(c, t, a),
      previewDir: (c, d, a) => previewKimiDirectory(c, d, a),
      // 会话目录（旧 wire.jsonl 或新 agents/main/wire.jsonl）视作单源；其余目录走批量扫描
      dirSingle: async (ctx, target) => kimiIsSessionDir(ctx, target),
    },
    derive: { args: (target) => kimiDeriveArgs(ctx, target) },
    registry: { dir: registryDir },
    label: {
      path: 'Kimi CLI / Kimi Code 会话目录（含 wire.jsonl 或 agents/main/wire.jsonl）的路径（单会话导入），或 ~/.kimi/sessions / ~/.kimi-code/sessions 根目录路径（递归扫 wire.jsonl，批量导入）。',
      batch: '会话',
      skipped: '无用户回合',
    },
    description:
      '从 Kimi CLI / Kimi Code（Moonshot AI 官方开源终端 agent）的会话目录导入历史对话为可继续的 DSH 会话（' +
      '旧布局 ~/.kimi/sessions/<workdir-md5>/<session-id>/，每会话含 wire.jsonl + state.json，' +
      '~/.kimi/kimi.json 提供 workdir 映射；新布局 ~/.kimi-code/sessions/<workspace-id>/<session-id>/，' +
      'wire.jsonl 位于 agents/main/ 下，state.json 提供 cwd/title）。' +
      'path 可指向单个会话目录（单会话导入），或 sessions 根（递归扫 wire.jsonl，批量导入）。' +
      '解析 wire 事件流（旧 TurnBegin/SteerInput/TextPart/ThinkPart/ToolCall/ToolResult 与' +
      '新 turn.prompt/context.append_loop_event 等）并持久化；' +
      '标题取 state.json custom_title / isCustomTitle+title > 首问；重复导入同一会话会幂等跳过。' +
      '返回新会话 id（或批量统计）与明细。',
  }))
  // REQ-59/61/64 外部 agent/mode prompt/skill/config → DSH skills 资产（第 14 个工具）：
  // 非会话导入，独立注册。收集 pi/opencode/Claude/Codex 的自定义 agent / mode prompt /
  // skill / instructions / config，转换为 `$DSH_AGENTS_HOME/skills/<name>/SKILL.md`
  // bundle（provenance frontmatter）。缺省 dry-run 预览（plan 清单零副作用）；
  // apply:true 才写盘。
  // Qoder CLI 源（第 15 个导入源）：qoder.com 的 AI 编码 CLI。会话 transcript 落盘
  // ~/.qoder/projects/<encoded-project>/<sessionId>.jsonl（子代理在 <sessionId>/subagents/
  // *.jsonl，记录携带父 sessionId，主 transcript 判定对齐 claude）。逐行 JSON、结构
  // 与 Claude Code 高度一致（type user/assistant + Claude 风格 content block：text /
  // thinking / tool_use / tool_result）。标准单文件/目录批量形态。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'qoder',
    toolName: 'import_qoder',
    sourceLabel: 'Qoder CLI',
    convert: convertQoderJsonl,
    registry: { dir: registryDir },
    // 文件名 stem 传给转换器做「主 transcript」判定：<sessionId>/subagents/*.jsonl
    // 辅助 transcript 记录携带父 sessionId，按它建会话会与主 transcript 撞 id。
    derive: {
      args: (target) => {
        const p = target.displayPath || ctx.fs.processPath(target)
        const base = String(p).split(/[\\/]/).pop() || ''
        return { fileStem: base.replace(/\.jsonl$/i, '') }
      },
    },
    description:
      '从 Qoder CLI（qoder.com 的 AI 编码 agent）的会话 JSONL 导入历史对话为可继续的 DSH 会话（' +
      '~/.qoder/projects/<encoded-project>/<sessionId>.jsonl，子代理在 <sessionId>/subagents/*.jsonl）。' +
      'path 可以是单个 .jsonl 文件，也可以是包含多个 .jsonl 的目录（目录模式递归扫描，每个文件导入为独立会话）。' +
      '解析 user/assistant 消息与 Claude 风格 content block（text / thinking→reasoning / tool_use / ' +
      'tool_result，按 tool_use_id 挂回 call 所在 step，缺省按未决调用顺序回退）并持久化；' +
      '标题取 ai-title > last-prompt > 首问；cwd 取记录内 cwd；子代理/辅助 transcript 跳过；' +
      '重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  // REQ-59/61/64 外部 agent/mode prompt/skill/config -> DSH skills 资产（第 14 个工具）：
  // 非会话导入，独立注册。收集 pi/opencode/Claude/Codex 的自定义 agent / mode prompt /
  // skill / instructions / config，转换为 `$DSH_AGENTS_HOME/skills/<name>/SKILL.md`
  // bundle（provenance frontmatter）。缺省 dry-run 预览（plan 清单零副作用）；
  // apply:true 才写盘。
  ctx.tools.register(defineTool({
    name: 'import_agents',
    description:
      '把 pi（~/.pi/agent/{agents,prompts}）、opencode（~/.config/opencode/{agents,skill}）、' +
      'Claude（~/.claude/memory/<group>/*.md、~/.claude/skills/<skill>/SKILL.md、项目 CLAUDE.md）与 ' +
      'Codex（~/.codex/skills/<skill>/SKILL.md、~/.codex/instructions.md、~/.codex/AGENTS.md、~/.codex/config.toml）的 ' +
      '自定义 agent / mode prompt / skill / 指令 / 配置参考转换为 DSH 持久化 skill 资产：' +
      '$DSH_AGENTS_HOME/skills/<name>/SKILL.md（$DSH_AGENTS_HOME 缺省 ~/.agents）。' +
      '缺省 dry-run：只返回 write/complete/skip 规划清单（零副作用）；apply:true 才落盘。' +
      '语义：同名冲突加 -<source> 后缀消歧、内容相同幂等跳过、已带 kind:dsh 的源不重复导入、' +
      'bundle 目录缺 SKILL.md 时原地补全（保留既有 scripts/ 等）。返回规划/落盘明细。',
    parameters: {
      apply: {
        type: 'boolean',
        description: '可选：true 时实际写盘（缺省 false = dry-run 预览，零副作用）。',
      },
      piRoot: {
        type: 'string',
        description: '可选：pi 根目录（默认 ~/.pi/agent）。',
      },
      opencodeRoot: {
        type: 'string',
        description: '可选：opencode 配置根（默认 ~/.config/opencode）。',
      },
      agentsHome: {
        type: 'string',
        description: '可选：DSH user-agents 根（默认 $DSH_AGENTS_HOME 或 ~/.agents），skills 写到其下 skills/。',
      },
      claudeRoot: {
        type: 'string',
        description: '可选：Claude 配置根（默认 ~/.claude），收集 memory/<group>/*.md 与 skills/<skill>/SKILL.md。',
      },
      claudeProjectRoot: {
        type: 'string',
        description: '可选：项目根目录（含 CLAUDE.md 时落为 claude-md 资产；不指定则跳过项目 CLAUDE.md）。',
      },
      codexRoot: {
        type: 'string',
        description: '可选：Codex 配置根（默认 ~/.codex），收集 skills/instructions.md/AGENTS.md/config.toml。',
      },
      preview: {
        type: 'boolean',
        description: '可选：dry-run 别名（与缺省行为一致，显式声明零副作用）。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'integer', required: true },
          planned: { type: 'integer', required: true },
          applied: { type: 'integer', required: true },
          skipped: { type: 'integer', required: true },
          results: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string', required: true },
                source: { type: 'string', required: true },
                kind: { type: 'string', required: true },
                action: { type: 'string', enum: ['write', 'complete', 'skip'], required: true },
                reason: { type: 'string' },
                target: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async execute(args) {
      return runAgentsImport(ctx, args)
    },
  }))
  // REQ-66 doctor：迁移后健康检查（对标 dsh-movein doctor）。只读，不写任何文件。
  ctx.tools.register(defineTool({
    name: 'doctor',
    description:
      '只读健康检查：imports registry 是否可读、已导入会话是否仍存在于 sessionPersistence、' +
      'DSH user-agents skills 是否落盘、workspaceRegistry 是否可用。对标 dsh-movein doctor，' +
      '不写文件、不触发导入/同步/删除。返回 checks/issues/totals。',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          checks: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string', required: true },
                ok: { type: 'boolean', required: true },
                detail: { type: 'string' },
              },
            },
          },
          issues: {
            type: 'array',
            required: true,
            items: { type: 'string' },
          },
          totals: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              records: { type: 'integer', required: true },
              sessions: { type: 'integer', required: true },
              missingSessions: { type: 'integer', required: true },
              skills: { type: 'integer', required: true },
            },
          },
        },
      },
    },
    async execute() {
      return runDoctor(ctx, registryDir)
    },
  }))
  // REQ-68 MCP 镜像：Claude/Codex MCP → DSH MCP client 计划。默认 dry-run；
  // apply=true 只把生成 YAML 片段写到 outPath（绝不直接改 profile）。
  ctx.tools.register(defineTool({
    name: 'import_mcp',
    description:
      '读取 Claude .mcp.json / ~/.claude.json 与 Codex config.toml 的 MCP server 配置，' +
      '生成可人工审阅的 DSH MCP client YAML 片段。默认 dry-run（零写盘）；apply:true 时' +
      '把片段写到 $DSH_HOME/dsh-chat-import/mcp-mirror.cordis.yml（或 outPath），' +
      '不会自动修改 profile 的 cordis.patch.yml——合并前请人工核对 dsh-mcp-client 契约。',
    parameters: {
      claudeMcpPath: {
        type: 'string',
        description: '可选：Claude MCP 配置文件路径（默认 ~/.claude.json；也兼容项目 .mcp.json 内容）。',
      },
      codexConfigPath: {
        type: 'string',
        description: '可选：Codex config.toml 路径（默认 ~/.codex/config.toml）。',
      },
      apply: {
        type: 'boolean',
        description: '可选：true 时写盘生成片段（默认 false = dry-run）。',
      },
      outPath: {
        type: 'string',
        description: '可选：apply 时输出路径（默认 $DSH_HOME/dsh-chat-import/mcp-mirror.cordis.yml）。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'integer', required: true },
          servers: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                source: { type: 'string', required: true },
                name: { type: 'string', required: true },
                command: { type: 'string', required: true },
                args: { type: 'array', required: true, items: { type: 'string' } },
                env: { type: 'object', required: true, additionalProperties: true },
              },
            },
          },
          planText: { type: 'string', required: true },
          writtenTo: { type: 'string' },
        },
      },
    },
    async execute(args) {
      return runMcpMirror(ctx, args)
    },
  }))
  // REQ-71 settings/config 翻译建议：Claude settings.json / Codex config.toml → 建议。
  // 只读，不自动应用。
  ctx.tools.register(defineTool({
    name: 'import_settings',
    description:
      '只读解析 Claude settings.json 与 Codex config.toml 的关键配置（model / permissions / hooks / env / model_provider），' +
      '返回迁移到 DSH 时的建议与不可直接映射项。不写任何文件、不自动应用。',
    parameters: {
      claudeSettingsPath: {
        type: 'string',
        description: '可选：Claude settings.json 路径（默认 ~/.claude/settings.json）。',
      },
      codexConfigPath: {
        type: 'string',
        description: '可选：Codex config.toml 路径（默认 ~/.codex/config.toml）。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'integer', required: true },
          suggestions: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                key: { type: 'string', required: true },
                source: { type: 'string', required: true },
                value: { type: 'string', required: true },
                suggestion: { type: 'string', required: true },
                unmappable: { type: 'boolean', required: true },
              },
            },
          },
          sources: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
    },
    async execute(args) {
      return runSettingsSuggest(ctx, args)
    },
  }))
  // dsh 源（第 14 个导入源）：DSH 自身会话日志
  // $DSH_HOME/sessions/<encoded-workspace>/<session-id>/session.jsonl(.zstd)。
  // .zstd 由 fzstd 纯 JS 解压后走同一转换器；目录递归收集 session.jsonl(.zstd)。
  ctx.tools.register(makeImportTool(ctx, {
    format: 'dsh',
    toolName: 'import_dsh',
    sourceLabel: 'DSH',
    convert: convertDshJsonl,
    readText: readDshText,
    derive: { collect: collectDshFiles },
    registry: { dir: registryDir },
    label: {
      path: 'DSH 会话日志 session.jsonl / session.jsonl.zstd 的文件路径，或包含这些文件的会话目录（默认根 ~/.dsh/sessions，目录递归收集）。',
    },
    description:
      '从 DeepSeek Harness（DSH）自身的会话日志导入历史对话为可继续的 DSH 会话。' +
      'path 可以是单个 session.jsonl 或 session.jsonl.zstd 文件，也可以是包含多个会话日志的目录（默认扫描 ~/.dsh/sessions）。' +
      '保留 turn/step/user/assistant/tool 核心事件并重排 seq；流式 chunk 与运行时状态事件不导入；' +
      '重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  // 本地 JSONL 会话文件：任意 .jsonl 路径，转换器按路径特征 + 内容自动识别
  // dsh / claude / codex / cursor / reasonix / pi / openclaw / hermes，也可用
  // format 参数强制指定。不是第 15 个「来源」——面板来源列表仍保持 14 个。
  ctx.tools.register(makeImportTool(ctx, {
    toolName: 'import_local_jsonl',
    sourceLabel: 'Local JSONL',
    convert: convertLocalJsonl,
    registry: { dir: registryDir },
    label: {
      path: '本地会话 JSONL 文件的路径，或包含多个 .jsonl 的目录路径。',
    },
    schema: {
      extra: {
        format: {
          type: 'string',
          enum: ['dsh', 'claude', 'codex', 'cursor', 'reasonix', 'pi', 'openclaw', 'hermes'],
          description: '可选：强制按指定格式解析；缺省自动识别（路径特征 + 首条有效会话结构）。',
        },
      },
    },
    description:
      '从本地任意 JSONL 会话文件导入历史对话为可继续的 DSH 会话。' +
      '自动识别 dsh / claude / codex / cursor / reasonix / pi / openclaw / hermes 格式，' +
      '识别失败时可用 format 参数强制指定；目录模式递归扫描 .jsonl，每个文件独立导入。' +
      '重复导入同一会话会幂等跳过。返回新会话 id（或批量统计）与明细。',
  }))
  // REQ-16 反向导出：第 17 个工具，独立注册（导出流程与导入状态机完全不同）。
  ctx.tools.register(defineTool({
    name: 'export_claude',
    description:
      '把 DSH 会话日志（只读，不 load/prepare、不改写历史事件）序列化为 Claude Code JSONL 并写入 ' +
      '<outputDir>/<slug>/<uuid>.jsonl，可被真实 Claude Code --resume 续聊。' +
      '参数：sessionId 必填；cwd 可选（默认取会话 header.cwd，两者皆无则报错）；' +
      'outputDir 可选（默认 ~/.claude/projects）；dryRun 可选（只序列化不写盘）。' +
      'user/assistant/tool_result 按 seq 顺序映射，tool_result 挂在声明其 tool_use 的 assistant 上（' +
      '并行结果扇出同一 assistant）；中断会话末尾补发空 tool_result；孤儿结果丢弃并计数；' +
      '非人类注入跳过计数。返回目标文件路径、记录数与 mapping（sourceSessionId → 新 uuid，imports registry 预留）。',
    parameters: {
      sessionId: {
        type: 'string',
        required: true,
        description: '要导出的 DSH 会话 id（必填）。',
      },
      cwd: {
        type: 'string',
        description: '可选：覆盖导出记录的 cwd（默认取会话 header.cwd；两者皆无则报错）。',
      },
      outputDir: {
        type: 'string',
        description: '可选：Claude Code projects 根目录（默认 ~/.claude/projects），文件写到 <outputDir>/<slug>/<uuid>.jsonl。',
      },
      dryRun: {
        type: 'boolean',
        description: '可选：true 时不写盘，只序列化并返回目标路径与统计。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: { type: 'string', enum: ['single'], required: true },
          sessionId: { type: 'string', required: true },
          sourceSessionId: { type: 'string', required: true },
          filePath: { type: 'string', required: true },
          slug: { type: 'string', required: true },
          cwd: { type: 'string', required: true },
          recordCount: { type: 'integer', required: true },
          title: { type: 'string' },
          dryRun: { type: 'boolean', required: true },
          degradations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                kind: { type: 'string', required: true },
                strategy: { type: 'string', enum: ['lossless', 'text-fallback', 'skip-placeholder'], required: true },
                count: { type: 'integer', required: true },
              },
            },
          },
          mapping: {
            type: 'object',
            additionalProperties: false,
            required: true,
            properties: {
              sourceSessionId: { type: 'string', required: true },
              sessionUuid: { type: 'string', required: true },
              slug: { type: 'string', required: true },
              filePath: { type: 'string', required: true },
              turns: { type: 'integer', required: true },
              messages: { type: 'integer', required: true },
              toolCalls: { type: 'integer', required: true },
              toolResults: { type: 'integer', required: true },
              droppedToolResults: { type: 'integer', required: true },
              skippedInjections: { type: 'integer', required: true },
            },
          },
        },
      },
      render: (args, value) => {
        // REQ-21：降级逐条报告（孤儿结果/注入跳过/附件跳过），不静默
        const degNote = (value.degradations || []).map((d) => d.id + ' ' + d.count).join('、')
        return [{
          type: 'text',
          text: (value.dryRun ? '导出预览（dryRun，未写盘）：' : '已导出：')
            + '会话 ' + value.sourceSessionId + ' → ' + value.filePath
            + '（' + value.recordCount + ' 条记录、' + value.mapping.toolCalls + ' 次工具调用'
            + (degNote ? '；降级：' + degNote : '') + '）',
        }]
      },
    },
    async execute(args) {
      return exportClaudeSession(ctx, args, { registryDir })
    },
  }))
  // REQ-56/62 export_bundle / restore_bundle：第 22/23 个工具。DSH 会话 → interchange
  // bundle（SHA-256 双层指纹 + 事件级无损 + 跨机器落点信息），还原 = 指纹校验 →
  // convertDshJsonl 状态机（幂等键 = bundle 路径）；跨机器 cwd 不可达走 REQ-39-lite
  // 回退归组并报告（不静默）。bundle 格式见 docs/INTERCHANGE.md §4。
  ctx.tools.register(defineTool({
    name: 'export_bundle',
    description:
      '把 DSH 会话导出为通用 interchange bundle（REQ-56）：SHA-256 双层指纹（会话级 + 文件级，' +
      '损坏可检测）、事件级无损（还原 = 可继续 DSH 会话）、携带跨机器落点信息（originalCwd + ' +
      'landingHint，REQ-62）。' +
      '参数：sessionId 必填；path 可选（输出文件路径，缺省 <outputDir>/<sessionId>.dshbundle.json）；' +
      'outputDir 可选（默认 ~/.dsh/exports）；dryRun 可选（只序列化不写盘）。' +
      '只读会话日志（list + readFrom），绝不改写历史事件；写盘 createIfAbsent 不覆盖。' +
      '返回目标文件路径、双层指纹与落点信息。',
    parameters: {
      sessionId: {
        type: 'string',
        required: true,
        description: '要导出的 DSH 会话 id（必填）。',
      },
      path: {
        type: 'string',
        description: '可选：输出文件路径（缺省 <outputDir>/<sessionId>.dshbundle.json）。',
      },
      outputDir: {
        type: 'string',
        description: '可选：输出目录（默认 ~/.dsh/exports），文件写到 <outputDir>/<sessionId>.dshbundle.json。',
      },
      dryRun: {
        type: 'boolean',
        description: '可选：true 时不写盘，只序列化并返回目标路径与指纹。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: { type: 'string', enum: ['single'], required: true },
          sessionId: { type: 'string', required: true },
          filePath: { type: 'string', required: true },
          eventCount: { type: 'integer', required: true },
          dryRun: { type: 'boolean', required: true },
          originalCwd: { type: 'string' },
          landingHint: { type: 'string' },
          sha256: {
            type: 'object',
            additionalProperties: false,
            required: true,
            properties: {
              session: { type: 'string', required: true },
              bundle: { type: 'string', required: true },
            },
          },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: (value.dryRun ? '导出预览（dryRun，未写盘）：' : '已导出 bundle：')
          + '会话 ' + value.sessionId + ' → ' + value.filePath
          + '（' + value.eventCount + ' 条事件；会话级 ' + value.sha256.session.slice(0, 12) + '…'
          + (value.originalCwd ? '；原 cwd ' + value.originalCwd : '') + '）',
      }],
    },
    async execute(args) {
      return exportBundleSession(ctx, args, { registryDir })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'restore_bundle',
    description:
      '把 interchange bundle（export_bundle 产物）还原为可继续的 DSH 会话（REQ-56/62）。' +
      '校验双层 SHA-256 指纹（损坏检测，不匹配大声报错不静默）→ 事件级无损还原（复用 ' +
      'import_dsh 状态机，幂等键 = bundle 路径；重复还原跳过、force:true 另存副本）。' +
      '跨机器（REQ-62）：bundle 的 originalCwd 在另一台机器不可达时按 REQ-39-lite 回退' +
      '归组到 bundle 文件所在目录，结果报告 cwdAvailable:false + groupedTo + restoreNote。' +
      '参数：path 必填（bundle 文件或含 .dshbundle.json 的目录）；sessionId 可选（覆盖还原' +
      '会话 id）；preview/dryRun 可选（dry-run 预览零副作用）；force/recursive 同导入语义。' +
      '返回还原状态（imported / already-imported / skipped）与跨机器落点报告。',
    parameters: {
      path: {
        type: 'string',
        required: true,
        description: 'interchange bundle 文件（.dshbundle.json）的路径，或包含 .dshbundle.json 的目录路径（目录模式逐文件还原）。',
      },
      sessionId: {
        type: 'string',
        description: '可选：覆盖还原出的 DSH 会话 id（默认 import-<源会话 id>）。',
      },
      force: {
        type: 'boolean',
        description: '可选：true 时即使已还原也以新 id 另存完整副本，旧会话原样保留。',
      },
      preview: {
        type: 'boolean',
        description: '可选：true 时 dry-run 预览——不落盘、不写 registry、不归组，仅返回将还原会话清单。',
      },
      dryRun: {
        type: 'boolean',
        description: '可选：preview 的兼容别名（语义相同）。',
      },
      recursive: {
        type: 'boolean',
        description: '可选：目录模式是否递归子目录（默认 true）。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: { type: 'string', enum: ['single', 'batch'], required: true },
          preview: { type: 'boolean' },
          sessionId: { type: 'string' },
          sourceSessionId: { type: 'string' },
          status: { type: 'string', enum: ['imported', 'already-imported', 'appended', 'skipped'] },
          turns: { type: 'integer' },
          messages: { type: 'integer' },
          toolCalls: { type: 'integer' },
          skipped: { type: 'integer' },
          skipReason: { type: 'string' },
          originalCwd: { type: 'string' },
          cwdAvailable: { type: 'boolean' },
          landingHint: { type: 'string' },
          groupedTo: { type: 'string' },
          restoreNote: { type: 'string' },
          title: { type: 'string' },
          createdAt: { type: 'integer' },
          alreadyImported: { type: 'boolean' },
          total: { type: 'integer' },
          imported: { type: 'integer' },
          alreadyImported: { oneOf: [{ type: 'boolean' }, { type: 'integer' }] },
          appended: { type: 'integer' },
          failed: { type: 'integer' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: { type: 'string', required: true },
                status: { type: 'string', required: true },
                sessionId: { type: 'string' },
                turns: { type: 'integer' },
                messages: { type: 'integer' },
                toolCalls: { type: 'integer' },
                skipped: { type: 'integer' },
                restoreNote: { type: 'string' },
                cwdAvailable: { type: 'boolean' },
                error: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
      render: (args, value) => {
        if (value.preview === true) {
          return [{
            type: 'text',
            text: '还原预览（dry-run，未落盘）：'
              + (value.title ? '《' + value.title + '》' : '')
              + (value.turns > 0 ? value.turns + ' 轮对话' : '无可导入内容')
              + (value.skipped ? '（跳过 ' + value.skipped + '）' : '')
              + (value.skipReason ? '\n跳过原因：' + value.skipReason : ''),
          }]
        }
        if (value.mode === 'batch') {
          const bits = ['共还原 ' + value.total + ' 个 bundle']
          if (value.imported) bits.push('新增 ' + value.imported)
          if (value.appended) bits.push('续写 ' + value.appended)
          if (value.alreadyImported) bits.push('已存在 ' + value.alreadyImported)
          if (value.skipped) bits.push('跳过 ' + value.skipped)
          if (value.failed) bits.push('失败 ' + value.failed)
          const notes = (value.results || []).filter((r) => r.restoreNote).slice(0, 3).map((r) => '  - ' + r.path + '：' + r.restoreNote)
          return [{
            type: 'text',
            text: '批量还原完成：' + bits.join('，') + (notes.length ? '\n' + notes.join('\n') : ''),
          }]
        }
        if (value.status === 'skipped') {
          return [{ type: 'text', text: '跳过还原：' + (value.skipReason || 'bundle 无内容') }]
        }
        return [{
          type: 'text',
          text: '已还原 ' + value.turns + ' 轮对话（' + value.messages + ' 条消息、' + value.toolCalls + ' 次工具调用）→ 会话 ' + value.sessionId
            + (value.restoreNote ? '\n' + value.restoreNote : ''),
        }]
      },
    },
    async execute(args) {
      const target = await ctx.fs.resolve(args.path)
      const info = await ctx.fs.stat(target)
      if (info && info.type === 'directory') {
        return restoreBundleDirectory(ctx, target, args, { registryDir })
      }
      return restoreBundle(ctx, args, { registryDir })
    },
  }))
  // REQ-23 矩阵化互转：第 24/25 个工具。export_codex / export_kimi 与 export_claude
  // 同构（只读会话日志 → 目标格式 JSONL，createIfAbsent 不覆盖、dryRun、降级报告），
  // 补齐 DSH↔Claude↔Codex↔Kimi 四向矩阵的 DSH→Codex / DSH→Kimi 两条出边
  //（入边 import_codex / import_kimi 已存在；Claude 双向已由 export_claude +
  // import_claude 覆盖）。verify_session 为第 26 个工具：只读结构校验 + repair 提示；
  // doctor 为第 27 个工具：迁移后健康检查（REQ-66）；import_mcp 为第 28 个工具（REQ-68）。
  for (const [toolName, ext, serialize, label] of [
    ['export_codex', 'rollout.jsonl', 'codex', 'Codex rollout JSONL'],
    ['export_kimi', 'wire.jsonl', 'kimi', 'Kimi CLI wire.jsonl'],
  ]) {
    ctx.tools.register(defineTool({
      name: toolName,
      description:
        '把 DSH 会话日志（只读，不 load/prepare、不改写历史事件）序列化为 ' + label + ' 并写入 ' +
        'path（或 <outputDir>/<sessionId>.' + ext + '，outputDir 缺省 ~/.dsh/exports），' +
        '可被 ' + (serialize === 'codex' ? 'import_codex' : 'import_kimi') + ' 再导入（矩阵化互转）。' +
        '参数：sessionId 必填；path 可选（输出文件路径）；outputDir 可选；dryRun 可选。' +
        '降级逐条报告（REQ-21）；返回目标文件路径、记录数与工具计数。',
      parameters: {
        sessionId: { type: 'string', required: true, description: '要导出的 DSH 会话 id（必填）。' },
        path: { type: 'string', description: '可选：输出文件路径（缺省 <outputDir>/<sessionId>.' + ext + '）。' },
        outputDir: { type: 'string', description: '可选：输出目录（默认 ~/.dsh/exports）。' },
        dryRun: { type: 'boolean', description: '可选：true 时不写盘，只序列化并返回目标路径与统计。' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            mode: { type: 'string', enum: ['single'], required: true },
            sessionId: { type: 'string', required: true },
            filePath: { type: 'string', required: true },
            recordCount: { type: 'integer', required: true },
            toolCalls: { type: 'integer', required: true },
            toolResults: { type: 'integer', required: true },
            dryRun: { type: 'boolean', required: true },
            degradations: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string', required: true },
                  kind: { type: 'string', required: true },
                  strategy: { type: 'string', enum: ['lossless', 'text-fallback', 'skip-placeholder'], required: true },
                  count: { type: 'integer', required: true },
                },
              },
            },
          },
        },
        render: (args, value) => [{
          type: 'text',
          text: (value.dryRun ? '导出预览（dryRun，未写盘）：' : '已导出：')
            + '会话 ' + value.sessionId + ' → ' + value.filePath
            + '（' + value.recordCount + ' 条记录、' + value.toolCalls + ' 次工具调用'
            + ((value.degradations || []).length ? '；降级：' + value.degradations.map((d) => d.id + ' ' + d.count).join('、') : '') + '）',
        }],
      },
      async execute(args) {
        return serialize === 'codex' ? exportCodexSession(ctx, args) : exportKimiSession(ctx, args)
      },
    }))
  }
  ctx.tools.register(defineTool({
    name: 'verify_session',
    description:
      '只读校验已导入/任意 DSH 会话的结构（REQ-23）：事件结构（seq 连续 / 类型白名单 / ' +
      'surfaceOp / sourceEventSeqs 指向 tool/call）、回合平衡（turn/step 配对）、工具配对' +
      '（每个 tool/call 有 tool/result、每个 tool/result 有对应调用）。' +
      '零副作用：list + readFrom 只读，绝不 load/prepare、绝不改写。' +
      '问题逐条定位（kind + seq + message，封顶 20 条），repairHints 按 kind 给出修复建议' +
      '（重导 / 闭合半开轮 / 源转录边界说明），失败大声不静默。返回 { ok, problems, repairHints }。',
    parameters: {
      sessionId: {
        type: 'string',
        required: true,
        description: '要校验的 DSH 会话 id（必填）。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: { type: 'string', enum: ['single'], required: true },
          sessionId: { type: 'string', required: true },
          ok: { type: 'boolean', required: true },
          eventCount: { type: 'integer', required: true },
          turns: { type: 'integer', required: true },
          title: { type: 'string' },
          problems: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                kind: { type: 'string', required: true },
                seq: { oneOf: [{ type: 'integer' }, { type: 'null' }], required: true },
                message: { type: 'string', required: true },
              },
            },
          },
          repairHints: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                kind: { type: 'string', required: true },
                hint: { type: 'string', required: true },
              },
            },
          },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: '会话 ' + value.sessionId + '（' + value.turns + ' 轮、' + value.eventCount + ' 条事件）'
          + (value.ok ? '：结构校验通过 ✅'
            : '：发现 ' + value.problems.length + ' 个问题\n'
              + value.problems.slice(0, 10).map((p) => '  - [' + p.kind + '] ' + (p.seq !== null ? 'seq ' + p.seq + '：' : '') + p.message).join('\n')
              + (value.repairHints.length ? '\n修复建议：\n' + value.repairHints.map((h) => '  - ' + h.kind + '：' + h.hint).join('\n') : '')),
      }],
    },
    async execute(args) {
      return verifySession(ctx, args)
    },
  }))
  // REQ-36 反向同步（双向同步桥 B 第一步）：第 18 个工具，把 DSH 会话新增轮次
  // 增量写回 Claude Code JSONL（目标 = 导入源文件或 export_claude 副本）。写回
  // 核心在 lib/backfill.mjs（纯逻辑 + ctx 注入，零 DSH 依赖）；uuid 工厂经
  // syncClaudeSession 的 args.uuid 注入（测试确定性），工具 schema 不暴露它。
  ctx.tools.register(defineTool({
    name: 'sync_to_claude',
    description:
      '反向同步（REQ-36）：把 DSH 会话新增完整轮次增量写回 Claude Code JSONL，' +
      '供真实 Claude Code --resume 续聊。目标 target:"source"（默认）写回导入源文件，' +
      'target:"copy" 写回上次 export_claude 导出的副本（需先导出）。' +
      '守卫不静默覆盖：源文件缩小（sourceShrunk）、被外部修改（source-modified-externally）、' +
      '文件尾 uuid 与写回水印失配（tail-mismatch）、并发写者（write-version-mismatch）一律跳过并上报；' +
      'force:true 跳过三闸并以当前文件重锚定（水印 + 链尾）。' +
      '只写由 turn/end 闭合的完整轮（半开进行中轮次不写，报 incompleteFinalTurn）；' +
      'dryRun 只计算不写盘。返回 status: synced | no-new-turns | skipped 与写回水印。',
    parameters: {
      sessionId: {
        type: 'string',
        required: true,
        description: '要写回的 DSH 会话 id（必须是由本插件导入的会话，带 session/imported 标记）。',
      },
      target: {
        type: 'string',
        description: "可选：写回目标 'source'（默认，导入源文件）| 'copy'（export_claude 导出的副本，需先导出）。",
      },
      force: {
        type: 'boolean',
        description: '可选：true 时跳过三闸守卫并以当前文件重锚定（水印 + 链尾），可能覆盖外部修改；默认 false。',
      },
      dryRun: {
        type: 'boolean',
        description: '可选：true 时完整计算（含格式预检）但不写盘、不更新 registry。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: { type: 'string', enum: ['single'], required: true },
          status: { type: 'string', required: true, enum: ['synced', 'no-new-turns', 'skipped'] },
          sessionId: { type: 'string', required: true },
          sourcePath: { type: 'string', required: true },
          target: { type: 'string', required: true, enum: ['source', 'copy'] },
          filePath: { type: 'string', required: true },
          appendedTurns: { type: 'integer' },
          appendedEvents: { type: 'integer' },
          appendedRecords: { type: 'integer' },
          conflictDetected: { type: 'string', enum: ['source-modified-externally', 'tail-mismatch', 'write-version-mismatch'] },
          sourceShrunk: { type: 'boolean' },
          storedShrunk: { type: 'boolean' },
          incompleteFinalTurn: { type: 'boolean' },
          precheckFailed: { type: 'boolean' },
          rollbackError: { type: 'string' },
          reason: { type: 'string' },
          precheck: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ok: { type: 'boolean', required: true },
              recordCount: { type: 'integer' },
              lastUuid: { type: 'string' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    line: { type: 'integer', required: true },
                    error: { type: 'string', required: true },
                  },
                },
              },
            },
          },
          dryRun: { type: 'boolean', required: true },
          writeback: {
            type: 'object',
            additionalProperties: false,
            properties: {
              sessionUuid: { type: 'string', required: true },
              filePath: { type: 'string', required: true },
              lastWrittenSeq: { type: 'integer', required: true },
              lastWrittenTurn: { type: 'integer' },
              prevUuid: { type: 'string' },
              lastSize: { type: 'integer', required: true },
              lastVersion: { type: 'string', required: true },
              writtenAt: { type: 'integer', required: true },
            },
          },
        },
      },
      render: (args, value) => {
        const where = value.target === 'copy' ? '导出副本' : '源文件'
        if (value.status === 'skipped') {
          let why
          if (value.sourceShrunk) why = '源文件缩小（sourceShrunk），跳过写回'
          else if (value.conflictDetected === 'source-modified-externally') why = '源文件被外部修改（size/version 变化），跳过写回'
          else if (value.conflictDetected === 'tail-mismatch') why = '文件尾 uuid 与写回水印失配（tail-mismatch），跳过写回'
          else if (value.conflictDetected === 'write-version-mismatch') why = '并发写者已改动文件（write-version-mismatch），跳过写回'
          else if (value.storedShrunk) why = 'DSH 会话日志比写回水印短（storedShrunk），跳过写回'
          else if (value.precheckFailed) why = '写回预检失败（格式校验不通过），已回滚'
          else why = value.reason || '跳过写回'
          return [{ type: 'text', text: '会话 ' + value.sessionId + ' ' + why + '（' + where + '）。' }]
        }
        if (value.status === 'no-new-turns') {
          return [{ type: 'text', text: '会话 ' + value.sessionId + ' 无新增完整轮次'
            + (value.incompleteFinalTurn ? '（存在进行中的半开轮次，闭合后再同步）' : '')
            + '（' + where + '）。' }]
        }
        return [{ type: 'text', text: (value.dryRun ? '写回预览（dryRun，未写盘）：' : '已写回：')
          + '会话 ' + value.sessionId + ' → ' + value.filePath
          + '（' + value.appendedTurns + ' 轮、' + value.appendedEvents + ' 条事件、' + value.appendedRecords + ' 条记录'
          + (value.conflictDetected || value.sourceShrunk ? '，force 覆盖守卫：' + (value.conflictDetected || 'sourceShrunk') : '')
          + '）。' }]
      },
    },
    async execute(args) {
      return syncClaudeSession(ctx, args, { registryDir })
    },
  }))
  // REQ-33 导入识别 / 撤回（只读）：第 19/20 个工具。平台无 delete 面
  //（sessionPersistence.remove / fs.removeFile 未提供，见 lib/retract.mjs 段落）——
  // list_imported_sessions 只读识别（标记权威 + registry 兜底），retract_import
  // 移除 registry 记录 + 引导手动删工件，绝不调用任何删除。
  ctx.tools.register(defineTool({
    name: 'list_imported_sessions',
    description:
      '只读列出本插件导入的全部 DSH 会话（REQ-33）：按会话日志首事件 session/imported 标记筛选' +
      '（标记是权威信号；日志读不到时用 imports registry 的 dshId 集合兜底），无标记会话不出现。' +
      '每个命中会话返回 sessionId / title（session/title 事件，无显式标题则省略）/ sourcePath / ' +
      'artifactPath（sessionPersistence.locate 报工件路径）/ importedAt。' +
      '零副作用：不落盘、不写 registry、不调用任何删除。返回 { total, sessions }。',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'integer', required: true },
          sessions: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sessionId: { type: 'string', required: true },
                title: { type: 'string' },
                sourcePath: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                artifactPath: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                importedAt: { type: 'integer' },
              },
            },
          },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: '已识别导入会话 ' + value.total + ' 个' + (value.total === 0 ? '' : '\n' + value.sessions.map((s) =>
          '  - ' + s.sessionId + (s.title ? '《' + s.title + '》' : '') + ' ← ' + s.sourcePath
          + '\n    工件路径：' + (s.artifactPath || '无（后端无单会话工件）')).join('\n')),
      }],
    },
    async execute() {
      return listImportedSessions(ctx, registryDir)
    },
  }))
  ctx.tools.register(defineTool({
    name: 'retract_import',
    description:
      '撤回（只读引导，REQ-33）：识别导入会话并移除其 imports registry 记录，输出手动删除工件路径。' +
      '绝不删除会话或工件（平台 sessionPersistence 无 delete 面，本插件不调用任何删除）。' +
      '入参 sessionId 或 sourcePath 二选一：sessionId 从会话日志 session/imported 标记定位源文件' +
      '（标记留在日志，重复撤回幂等）；sourcePath 直接按 registry 幂等键移除。' +
      'registry 记录移除后，按引导删除工件副本再重导即全新导入（副本仍在时重导按 legacy 回填基线幂等跳过）。' +
      '返回 removed:true 与 manualDelete 引导' +
      '（工件路径由 sessionPersistence.locate 给出）。',
    parameters: {
      sessionId: {
        type: 'string',
        description: '要撤回的 DSH 会话 id（与 sourcePath 二选一；从日志标记 / registry 定位源文件）。',
      },
      sourcePath: {
        type: 'string',
        description: '要撤回的源文件路径（与 sessionId 二选一；直接按 registry 幂等键移除记录）。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          removed: { type: 'boolean', required: true, const: true },
          sourcePath: { type: 'string', required: true },
          artifactPath: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          wasRegistered: { type: 'boolean', required: true },
          manualDelete: { type: 'string', required: true },
        },
      },
      render: (args, value) => [{
        type: 'text',
        text: '已撤回：registry 记录 ' + value.sourcePath + ' 已移除'
          + (value.wasRegistered ? '' : '（此前已移除，幂等）') + '。\n' + value.manualDelete,
      }],
    },
    async execute(args) {
      return retractImport(ctx, args, registryDir)
    },
  }))
  // REQ-25/REQ-40 会话发现：第 21 个工具，只读扫描（发现核心在 lib/discovery.mjs，
  // host 适配见 lib/discovery-host.mjs；30s TTL 缓存进程内共享 + 持久化 mtime 书签
  // 跨进程免重扫）。零副作用：不写库、不 create/append，registry 只读 loadImports 供
  // importStatus 标注（书签文件是缓存元数据，非会话数据）。
  ctx.tools.register(defineTool({
    name: 'scan_discover',
    description:
      '只读扫描本机 15 种外部聊天记录格式的已知数据根（Claude Code / Codex / Cursor / ' +
      'Gemini CLI / Reasonix / opencode / zcode / Grok Build / OpenClaw / Pi Coding Agent / ' +
      'Hermes / Kimi CLI / Qoder CLI / ChatGPT 导出 / DSH 会话日志），返回结构化会话索引（format / sessionId / title / project / cwd / ' +
      'createdAt / lastActiveAt / messageCount / sourcePath / gitBranch / gitDirty / importStatus），供批导入前预览。' +
      'path 可选：给定时在该根下按格式探测（目录或单文件）；缺省扫全部格式的默认数据根。' +
      'format 可选：只扫指定格式（chatgpt 无自动根，需 path 显式指向 conversations.json；dsh 默认根为 ~/.dsh/sessions）。' +
      'query 可选：按标题 / 项目 / 路径子串过滤（忽略大小写）。' +
      '进程内 30s TTL 缓存：同 key 30 秒内重复扫描直接命中，不重读源文件。' +
      '持久化 mtime/size 书签（scan-cache.json）：跨进程重启后未变文件免重扫。' +
      '只读工具：不写库、不 create/append、不修改任何会话或 registry。返回 { sessions, total }。',
    parameters: {
      path: {
        type: 'string',
        description: '可选：扫描根（目录或单文件，如 ~/.claude/projects、某个 .jsonl 或 conversations.json）。缺省扫全部格式的默认数据根。',
      },
      format: {
        type: 'string',
        enum: FORMATS,
        description: '可选：只扫指定格式；缺省按路径探测全部格式。',
      },
      query: {
        type: 'string',
        description: '可选：按标题 / 项目 / 路径子串过滤（忽略大小写）。',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'integer', required: true },
          sessions: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                format: { type: 'string', enum: FORMATS, required: true },
                sessionId: { type: 'string', required: true },
                title: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                project: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                createdAt: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
                lastActiveAt: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
                messageCount: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
                sourcePath: { type: 'string', required: true },
                cwd: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                gitBranch: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                gitDirty: { oneOf: [{ type: 'boolean' }, { type: 'null' }] },
                importStatus: { type: 'string', enum: ['imported', 'partial', 'not-imported', 'archived'], required: true },
              },
            },
          },
        },
      },
      render: (args, value) => {
        const byFormat = {}
        for (const s of value.sessions) byFormat[s.format] = (byFormat[s.format] || 0) + 1
        const formatBits = Object.entries(byFormat).map(([f, n]) => f + ' ' + n)
        const imported = value.sessions.filter((s) => s.importStatus === 'imported').length
        const partial = value.sessions.filter((s) => s.importStatus === 'partial').length
        const archived = value.sessions.filter((s) => s.importStatus === 'archived').length
        const pending = value.sessions.filter((s) => s.importStatus === 'not-imported').length
        const statusBits = ['已导入 ' + imported]
        if (partial) statusBits.push('部分 ' + partial)
        if (archived) statusBits.push('已归档 ' + archived)
        statusBits.push('未导入 ' + pending)
        return [{
          type: 'text',
          text: '扫描完成：共发现 ' + value.total + ' 个会话（' + formatBits.join('、') + '；'
            + statusBits.join('、') + '）' + (args.query ? '（query=' + args.query + '）' : ''),
        }]
      },
    },
    async execute(args) {
      return runScanDiscover(ctx, args, registryDir)
    },
  }))
}
