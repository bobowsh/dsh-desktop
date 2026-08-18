#!/usr/bin/env node
// bin/dsh-chat-import.mjs — REQ-67 独立 CLI（无 DSH host 也可用）
//
// 当前子命令：
//   export-md <session.jsonl | session-dir> [--out file]   DSH 会话日志 → Markdown
//   doctor                                                 （轻量）本地 registry 体检
//   help                                                   打印帮助
//
// 说明：import/apply 的完整独立 CLI 依赖 DSH 会话持久化布局，仍建议在 DSH 内用
// import_* 工具；export-md/doctor 提供无需启动 DSH 的只读通道。

import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { sessionJsonlToMarkdown } from '../lib/markdown.mjs'

const DSH_HOME = () => process.env.DSH_HOME || join(homedir(), '.dsh')

async function readSessionText(path) {
  const st = await stat(path)
  let target = path
  if (st.isDirectory()) {
    const candidates = ['session.jsonl', 'session.jsonl.zstd']
    let found = null
    for (const name of candidates) {
      try {
        const p = join(path, name)
        await stat(p)
        found = p
        break
      } catch {
        // try next
      }
    }
    if (!found) throw new Error('目录中没有找到 session.jsonl / session.jsonl.zstd')
    target = found
  }
  if (target.endsWith('.zstd')) {
    throw new Error('暂不支持直接读取 .zstd，请先解压：zstd -dc ' + target + ' > session.jsonl')
  }
  return readFile(target, 'utf8')
}

async function cmdExportMd(args) {
  if (args.length === 0) throw new Error('用法：dsh-chat-import export-md <session.jsonl | session-dir> [--out file]')
  const positional = args.filter((a) => !a.startsWith('--'))
  const outIdx = args.indexOf('--out')
  const outPath = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : null
  const source = positional[0]
  const text = await readSessionText(source)
  const md = sessionJsonlToMarkdown(text)
  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, md, 'utf8')
    return `已写入 ${outPath}`
  }
  return md
}

async function cmdDoctor() {
  const registryPath = join(DSH_HOME(), 'dsh-chat-import', 'imports.json')
  let records = 0
  try {
    const parsed = JSON.parse(await readFile(registryPath, 'utf8'))
    records = Object.keys(parsed.imports || {}).length
  } catch {
    records = 0
  }
  let sessionDirs = 0
  const sessionsRoot = join(DSH_HOME(), 'sessions')
  try {
    const workspaces = await readdir(sessionsRoot)
    for (const ws of workspaces) {
      try {
        const wsDir = join(sessionsRoot, ws)
        if ((await stat(wsDir)).isDirectory()) {
          sessionDirs += (await readdir(wsDir)).length
        }
      } catch {
        // 忽略单个 workspace 不可读
      }
    }
  } catch {
    // sessions 根不存在
  }
  const issues = []
  if (records === 0) issues.push('imports registry 为空')
  if (sessionDirs === 0) issues.push('DSH sessions 目录为空或不可读')
  return `doctor: registry ${records} 条记录，sessions ${sessionDirs} 个会话${issues.length ? '\n' + issues.map((i) => '  - ' + i).join('\n') : ''}`
}

const HELP = `dsh-chat-import — standalone CLI

用法：
  dsh-chat-import export-md <session.jsonl | session-dir> [--out file]
  dsh-chat-import doctor
  dsh-chat-import help
`

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  try {
    let output
    if (cmd === 'export-md') {
      output = await cmdExportMd(args)
    } else if (cmd === 'doctor') {
      output = await cmdDoctor()
    } else {
      output = HELP
    }
    process.stdout.write(output.endsWith('\n') ? output : output + '\n')
  } catch (err) {
    process.stderr.write(String((err && err.message) || err) + '\n')
    process.exitCode = 1
  }
}

main()
