// lib/toolkit.mjs — makeImportTool 工厂：13 个导入工具共享的 schema / render /
// execute 骨架，只差名称、描述、转换器与导入函数。
//
// registryDir 由调用方传入（$DSH_HOME/dsh-chat-import）；fingerprintKeys 决定哪些
// 工具参数计入 imports registry 的 args 指纹（opencode 的 fullHistory 等）。
// previewFile / previewDir 提供 REQ-17 dry-run 预览实现（缺省走标准单文件/目录预览）。
// 带 format 的来源同时登记进 IMPORT_SPECS（REQ-41 Stage 2，供 POST /api-import/import
// 路由复用同一套导入编排——面板导入与 import_* 工具行为完全一致）。

import { defineTool } from '@deepseek-ai/dsh-tools'
import { resolveImportBudget } from './budget.mjs'
import {
  importTranscript, importDirectory, previewTranscript, previewDirectory, isPreview,
} from './import-core.mjs'

// REQ-41 Stage 2：面板批量导入（POST /api-import/import）按 format 复用工具层同一套
// 导入编排。IMPORT_SPECS 由 makeImportTool 在 apply 注册各来源时登记（带 format 的
// spec），保证面板导入与 import_* 工具行为完全一致（同一注册对象，同一转换/落盘/
// 归组状态机）。lib/panel.mjs 的 importDiscoveryItem 消费它。
export const IMPORT_SPECS = new Map()

// REQ-09 参数收敛：spec 分组成子对象（身份字段扁平 + io/derive/label/schema/registry
// 五组），新源加一行即可；同构参数（importFile/importDir、previewFile/previewDir、
// alwaysBatch/fileBatch/dirSingle）归入 io，避免继续拉长扁平参数表。缺省回退与旧版
// 完全一致（标准单文件/目录状态机 + 标准预览 + 默认路径/批量文案）。
export function makeImportTool(ctx, spec) {
  const {
    format, toolName, sourceLabel, convert, description, readText,
    io = {}, derive = {}, label = {}, schema = {}, registry = {},
  } = spec
  const {
    file: importFile, dir: importDir, previewFile, previewDir, alwaysBatch, fileBatch, dirSingle,
  } = io
  const { args: deriveArgs, collect } = derive
  const { path: pathDescription, batch: batchUnit = '文件', skipped: skippedNote } = label
  const { extra: extraParameters, drop: dropParameters } = schema
  const { dir: registryDir, fingerprintKeys = [] } = registry
  // REQ-41 Stage 2：带 format 的来源同时登记进 IMPORT_SPECS，供 POST /api-import/import
  // 路由复用同一套导入编排（面板导入与 import_* 工具行为完全一致）。
  if (format) IMPORT_SPECS.set(format, spec)
  const deriveFn = deriveArgs || (async () => ({}))
  const importSingle = importFile || ((c, t, a) => importTranscript(c, t, a, convert, { registryDir, fingerprintKeys, readText }))
  const importBatch = importDir || ((c, d, a) => importDirectory(c, d, a, { convert, sourceLabel, deriveArgs: deriveFn, collect, registryDir, fingerprintKeys, readText }))
  const previewSingle = previewFile || ((c, t, a) => previewTranscript(c, t, a, convert, { readText }))
  const previewBatch = previewDir || ((c, d, a) => previewDirectory(c, d, a, { convert, deriveArgs: deriveFn, collect, readText }))
  // 增量续写语义（REQ-24）：与各工具 description 里的「幂等跳过」表述互补
  const descriptionSuffix = ' 重复导入已导入的源文件会增量续写新增轮次（源文件未变则跳过）；force:true 以新 id 另存完整副本。'
  return defineTool({
    name: toolName,
    description: description + descriptionSuffix,
    parameters: {
      path: {
        type: 'string',
        required: true,
        description: pathDescription || (alwaysBatch
          ? 'ChatGPT 导出 conversations.json 的文件路径，或包含多个 .json 的目录路径。'
          : sourceLabel + ' transcript (.jsonl) 的文件路径，或包含多个 .jsonl 的目录路径。'),
      },
      force: {
        type: 'boolean',
        description: '可选：true 时即使已导入也以新 id（import-<src>-<n>）另存一份完整副本，旧会话原样保留。',
      },
      budget: {
        type: 'integer',
        description: '可选：上下文预算（token 数），超长会话按三层保护裁剪。优先级：本参数 > 环境变量 DSH_IMPORT_CONTEXT_BUDGET > 动态模型窗口（agentDefaultModel + llm）> 静态默认 550k。',
      },
      preview: {
        type: 'boolean',
        description: '可选：true 时 dry-run 预览——不落盘、不写 imports registry、不归组，仅返回将导入会话清单（标题 / cwd / 时间 / 规模 / 跳过明细），确认后再正式导入（去掉 preview 再调一次即可）。',
      },
      dryRun: {
        type: 'boolean',
        description: '可选：preview 的兼容别名（语义相同：不落盘、仅返回将导入会话清单）。',
      },
      ...((dropParameters || []).includes('sessionId') ? {} : {
        sessionId: {
          type: 'string',
          description: '可选：目标 DSH 会话 id（仅单文件导入时生效，默认 import-<源sessionId>；目录模式忽略）。',
        },
      }),
      ...((dropParameters || []).includes('recursive') ? {} : {
        recursive: {
          type: 'boolean',
          description: '可选：目录模式是否递归子目录（默认 true）。',
        },
      }),
      expectedHash: {
        type: 'string',
        description: '可选：源文件期望 SHA-256（小写 hex）；传入后导入前做强校验，不匹配则失败且不落盘。',
      },
      restamp: {
        type: 'boolean',
        description: '可选：true 时把导入会话的时间戳平移到当前时间（保持相对间隔），适合导入后置顶显示；默认 false 保留源时间。',
      },
      workspaceMode: {
        type: 'string',
        enum: ['auto', 'dedicated', 'per-project'],
        description: '可选：归组模式——auto/per-project 按 cwd 或源目录归组；dedicated 把所有导入会话挂到单个专用工作区（默认 $DSH_HOME/dsh-chat-import-workspace，可用 workspaceDir 覆盖）。',
      },
      workspaceDir: {
        type: 'string',
        description: '可选：workspaceMode=dedicated 时的工作区目录；默认 $DSH_HOME/dsh-chat-import-workspace。',
      },
      ...extraParameters,
    },
    output: {
      schema: {
        oneOf: [
          // 单文件 dry-run 预览（REQ-17）：无写入态字段（sessionId/status/alreadyImported 等）
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              mode: { type: 'string', enum: ['single'], required: true },
              preview: { type: 'boolean', const: true, required: true },
              title: { type: 'string' },
              cwd: { type: 'string' },
              createdAt: { type: 'integer' },
              turns: { type: 'integer', required: true },
              messages: { type: 'integer', required: true },
              toolCalls: { type: 'integer', required: true },
              skipped: { type: 'integer', required: true },
              skipReason: { type: 'string' },
            },
          },
          // 目录（批量）dry-run 预览（REQ-17）：同 total/results 骨架，无写入态计数
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              mode: { type: 'string', enum: ['batch'], required: true },
              preview: { type: 'boolean', const: true, required: true },
              total: { type: 'integer', required: true },
              results: {
                type: 'array',
                required: true,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    path: { type: 'string', required: true },
                    title: { type: 'string' },
                    cwd: { type: 'string' },
                    createdAt: { type: 'integer' },
                    turns: { type: 'integer' },
                    messages: { type: 'integer' },
                    toolCalls: { type: 'integer' },
                    skipped: { type: 'integer' },
                    skipReason: { type: 'string' },
                    status: { type: 'string', enum: ['failed'] },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
          // 单文件模式
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              mode: { type: 'string', enum: ['single'], required: true },
              sessionId: { type: 'string', required: true },
              turns: { type: 'integer', required: true },
              messages: { type: 'integer', required: true },
              toolCalls: { type: 'integer', required: true },
              skipped: { type: 'integer' },
              skippedLines: {
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
              secrets: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    line: { type: 'integer', required: true },
                    kind: { type: 'string', required: true },
                  },
                },
              },
              permissionCount: { type: 'integer' },
              skipReason: { type: 'string' },
              alreadyImported: { type: 'boolean', required: true },
              status: { type: 'string', required: true, enum: ['imported', 'already-imported', 'appended', 'skipped'] },
              // REQ-22：Reasonix WAL 合并 / Claude compacted 摘要导入报告
              walMerged: { type: 'boolean' },
              walRecords: { type: 'integer' },
              compacted: { type: 'boolean' },
              appendedTurns: { type: 'integer' },
              appendedEvents: { type: 'integer' },
              appendedSkipped: { type: 'string' },
              sourceShrunk: { type: 'boolean' },
              changedInPlace: { type: 'boolean' },
              argsChanged: { type: 'boolean' },
              budgetChanged: { type: 'boolean' },
              backfilled: { type: 'boolean' },
              droppedBoundaryResults: { type: 'integer' },
              trimmed: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  budget: { type: 'integer', required: true },
                  source: { type: 'string', enum: ['param', 'env', 'dynamic', 'default'], required: true },
                  originalTokens: { type: 'integer', required: true },
                  estimatedTokens: { type: 'integer', required: true },
                  croppedBlocks: { type: 'integer', required: true },
                  droppedTurns: { type: 'integer', required: true },
                  droppedMessages: { type: 'integer', required: true },
                  droppedToolCalls: { type: 'integer', required: true },
                  droppedToolResults: { type: 'integer', required: true },
                  droppedOversized: { type: 'integer', required: true },
                  summaryInserted: { type: 'boolean', required: true },
                },
              },
              forceImported: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  previous: { type: 'string', required: true },
                  current: { type: 'string', required: true },
                },
              },
              validation: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  ok: { type: 'boolean', required: true },
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
                },
              },
            },
          },
          // 目录（批量）模式
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              mode: { type: 'string', enum: ['batch'], required: true },
              total: { type: 'integer', required: true },
              imported: { type: 'integer', required: true },
              alreadyImported: { type: 'integer', required: true },
              appended: { type: 'integer', required: true },
              skipped: { type: 'integer', required: true },
              failed: { type: 'integer', required: true },
              missingFromSource: { type: 'array', items: { type: 'string' } },
              results: {
                type: 'array',
                required: true,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    path: { type: 'string', required: true },
                    status: {
                      type: 'string',
                      required: true,
                      enum: ['imported', 'already-imported', 'appended', 'skipped', 'failed'],
                    },
                    sessionId: { type: 'string' },
                    turns: { type: 'integer' },
                    messages: { type: 'integer' },
                    toolCalls: { type: 'integer' },
                    skipped: { type: 'integer' },
                    skippedLines: {
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
                    secrets: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          line: { type: 'integer', required: true },
                          kind: { type: 'string', required: true },
                        },
                      },
                    },
                    permissionCount: { type: 'integer' },
                    alreadyImported: { type: 'boolean' },
                    reason: { type: 'string' },
                    error: { type: 'string' },
                    // REQ-22：Reasonix WAL 合并 / Claude compacted 摘要导入报告
                    walMerged: { type: 'boolean' },
                    walRecords: { type: 'integer' },
                    compacted: { type: 'boolean' },
                    appendedTurns: { type: 'integer' },
                    appendedEvents: { type: 'integer' },
                    appendedSkipped: { type: 'string' },
                    sourceShrunk: { type: 'boolean' },
                    changedInPlace: { type: 'boolean' },
                    argsChanged: { type: 'boolean' },
                    budgetChanged: { type: 'boolean' },
                    backfilled: { type: 'boolean' },
                    droppedBoundaryResults: { type: 'integer' },
                    trimmed: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        budget: { type: 'integer', required: true },
                        source: { type: 'string', enum: ['param', 'env', 'dynamic', 'default'], required: true },
                        originalTokens: { type: 'integer', required: true },
                        estimatedTokens: { type: 'integer', required: true },
                        croppedBlocks: { type: 'integer', required: true },
                        droppedTurns: { type: 'integer', required: true },
                        droppedMessages: { type: 'integer', required: true },
                        droppedToolCalls: { type: 'integer', required: true },
                        droppedToolResults: { type: 'integer', required: true },
                        droppedOversized: { type: 'integer', required: true },
                        summaryInserted: { type: 'boolean', required: true },
                      },
                    },
                    forceImported: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        previous: { type: 'string', required: true },
                        current: { type: 'string', required: true },
                      },
                    },
                    validation: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        ok: { type: 'boolean', required: true },
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
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      render: (args, value) => {
        // REQ-17 dry-run 预览：人类可读清单（未落盘提示 + 逐条明细摘要）
        if (value.preview === true) {
          if (value.mode === 'batch') {
            const detail = (value.results || []).slice(0, 5).map((r) => '  - ' + r.path
              + (r.title ? '：' + r.title : '')
              + (r.skipReason ? '：' + r.skipReason : '')
              + (r.status === 'failed' && r.error ? '：' + r.error : ''))
            return [{
              type: 'text',
              text: '预览（dry-run，未落盘）：共 ' + value.total + ' 个' + batchUnit
                + (detail.length ? '\n' + detail.join('\n') : ''),
            }]
          }
          return [{
            type: 'text',
            text: '预览（dry-run，未落盘）：'
              + (value.title ? '《' + value.title + '》' : '')
              + (value.turns > 0 ? value.turns + ' 轮对话' : '无可导入内容')
              + '（' + value.messages + ' 条消息、' + value.toolCalls + ' 次工具调用'
              + (value.skipped ? '、跳过 ' + value.skipped : '') + '）'
              + (value.skipReason ? '\n跳过原因：' + value.skipReason : ''),
          }]
        }
        // REQ-37 裁剪上报摘要（trimmed 存在时追加一行人类可读说明）
        const trimmedNote = (v) => {
          const t = v && v.trimmed
          if (!t) return ''
          const bits = []
          if (t.droppedTurns > 0) bits.push('裁剪 ' + t.droppedTurns + ' 轮')
          if (t.croppedBlocks > 0) bits.push('裁剪 ' + t.croppedBlocks + ' 条超长内容')
          if (t.droppedOversized > 0) bits.push('丢弃 ' + t.droppedOversized + ' 条超半消息')
          if (t.summaryInserted) bits.push('已插入摘要')
          return bits.length > 0 ? '（' + bits.join('，') + '，估算 ' + t.estimatedTokens + '/' + t.budget + ' tokens，来源 ' + t.source + '）' : ''
        }
        // REQ-26 畸形行明细 + secrets/permission 计数：只含行号与 kind，绝不拼入内容
        const req26Note = (v) => {
          const skippedLines = v.skippedLines || []
          const counts = []
          if (v.secrets && v.secrets.length > 0) counts.push('secrets 命中 ' + v.secrets.length + ' 处')
          if (v.permissionCount) counts.push('permission ' + v.permissionCount + ' 条')
          if (skippedLines.length === 0) return counts.join('、')
          const lines = skippedLines.slice(0, 20).map((s) => 'L' + s.line).join('/')
          const more = skippedLines.length > 20 ? ' …' : ''
          return '畸形行明细：' + lines + more + (counts.length ? '（' + counts.join('、') + '）' : '')
        }
        if (value.mode === 'batch') {
          const bits = []
          bits.push('共扫描 ' + value.total + ' 个' + batchUnit)
          if (value.imported) bits.push('新增 ' + value.imported + ' 个会话')
          if (value.appended) bits.push('续写 ' + value.appended + ' 个会话')
          if (value.alreadyImported) bits.push('已存在 ' + value.alreadyImported + ' 个')
          if (value.skipped) bits.push('跳过 ' + value.skipped + ' 个（' + (skippedNote || '非 ' + sourceLabel + ' transcript') + '）')
          if (value.failed) bits.push('失败 ' + value.failed + ' 个')
          const trimmedItems = (value.results || []).filter((r) => r.trimmed).length
          if (trimmedItems) bits.push(trimmedItems + ' 个会话触发预算裁剪')
          // 错误处理打磨：失败/跳过原因要可见，不只计数（最多展示 5 条）
          const problems = (value.results || []).filter((r) => r.status === 'failed' || r.status === 'skipped').slice(0, 5)
          const detail = problems.map((r) => '  - ' + r.path + (r.error ? '：' + r.error : r.reason ? '：' + r.reason : ''))
          return [{
            type: 'text',
            text: '批量导入完成：' + bits.join('，') + (detail.length ? '\n' + detail.join('\n') : ''),
          }]
        }
        if (value.status === 'skipped' && value.sessionId === 'none') {
          return [{
            type: 'text',
            text: '跳过导入：' + (value.skipReason || '非 ' + sourceLabel + ' transcript')
              + (req26Note(value) ? '\n' + req26Note(value) : ''),
          }]
        }
        if (value.status === 'appended') {
          return [{
            type: 'text',
            text: '会话 ' + value.sessionId + ' 已续写 ' + value.appendedTurns + ' 轮、' + value.appendedEvents + ' 条事件（源文件新增轮次）。' + trimmedNote(value),
          }]
        }
        if (value.status === 'imported' && value.forceImported) {
          return [{
            type: 'text',
            text: '已强制导入完整副本 → 会话 ' + value.forceImported.current + '（前身 ' + value.forceImported.previous + ' 原样保留）。' + trimmedNote(value),
          }]
        }
        if (value.alreadyImported) {
          const why = value.sourceShrunk
            ? '源文件轮次减少（sourceShrunk），跳过；需要完整副本请用 force:true'
            : value.changedInPlace
              ? '源文件在既有轮次内变化（append-only 无法改写），跳过'
              : value.argsChanged
                ? '导入参数已变化（args-changed），跳过；需要按新参数导入请用 force:true'
                : value.budgetChanged
                  ? '上下文预算已变化（budget-changed），跳过；需要按新预算导入请用 force:true'
                  : value.appendedSkipped
                  ? '源文件已增长但无法确定已存日志长度，跳过增量续写'
                  : value.backfilled
                    ? '已回填导入记录（旧版本导入的会话）'
                    : '源文件未变化'
          return [{
            type: 'text',
            text: '会话 ' + value.sessionId + ' 已存在，跳过导入：' + why + '。',
          }]
        }
        return [{
          type: 'text',
          text: '已导入 ' + value.turns + ' 轮对话（' + value.messages + ' 条消息、' + value.toolCalls + ' 次工具调用）→ 会话 ' + value.sessionId + (value.skipped ? '（跳过 ' + value.skipped + ' 行畸形记录）' : '') + trimmedNote(value) + (req26Note(value) ? '\n' + req26Note(value) : ''),
        }]
      },
    },
    async execute(args) {
      // REQ-37：解析上下文预算（参数 > env > 动态模型窗口 > 静态默认），盖写进
      // args.budget（token 数，转换层裁剪消费、registry 记录）与 args.budgetSource
      // （裁剪上报标注来源）；预算变化经 registry 比对 → budgetChanged 跳过。
      const budgetInfo = await resolveImportBudget(ctx, args)
      const effective = { ...args, budget: budgetInfo.budget, budgetSource: budgetInfo.source }
      // REQ-17：preview/dryRun=true 走预览分支（照常 resolve/stat/readText/convert，
      // 但零副作用——不落盘、不写 registry、不归组；见 preview* 实现）
      const preview = isPreview(args)
      const flag = preview ? { preview: true } : {}
      const target = await ctx.fs.resolve(effective.path)
      const info = await ctx.fs.stat(target)
      if (info && info.type === 'directory') {
        // grokbuild：会话目录（含 summary.json）视作单源 → 单会话导入；其余目录批量
        if (dirSingle && await dirSingle(ctx, target)) {
          const fileArgs = { ...effective, ...(await deriveFn(target)) }
          const single = preview ? await previewSingle(ctx, target, fileArgs) : await importSingle(ctx, target, fileArgs)
          return { mode: 'single', ...flag, ...single }
        }
        const batch = preview ? await previewBatch(ctx, target, effective) : await importBatch(ctx, target, effective)
        return { mode: 'batch', ...flag, ...batch }
      }
      // 单文件：合并按文件派生的转换参数（可 async；Cursor 的 composer id、Reasonix 的 meta）
      const fileArgs = { ...effective, ...(await deriveFn(target)) }
      // hermes：.db 单文件恒返回批量形态（SQLite 一库多会话）
      if (alwaysBatch || (fileBatch && await fileBatch(ctx, target))) {
        const batch = preview ? await previewSingle(ctx, target, fileArgs) : await importSingle(ctx, target, fileArgs)
        return { mode: 'batch', ...flag, ...batch }
      }
      const single = preview ? await previewSingle(ctx, target, fileArgs) : await importSingle(ctx, target, fileArgs)
      return { mode: 'single', ...flag, ...single }
    },
  })
}
