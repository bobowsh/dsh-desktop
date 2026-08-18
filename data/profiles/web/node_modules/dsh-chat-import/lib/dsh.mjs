// lib/dsh.mjs — DSH 自身会话日志（session.jsonl / session.jsonl.zstd）的读取
// 与目录收集适配。DSH 落盘是 zstd 压缩 JSONL，fs.readText 不解压，因此这里用
// fzstd（MIT、零依赖纯 JS）解压——不依赖系统 zstd 二进制，也避免 child_process
// 触发安全扫描的 code-exec 判定。
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { decompress } from 'fzstd'

export function isDshSessionFile(name) {
  return /^session\.jsonl(?:\.zstd)?$/i.test(String(name || ''))
}

export function dshPath(target) {
  return target.displayPath || target.path || target
}

export async function readDshText(ctx, target) {
  const path = dshPath(target)
  if (/\.zstd$/i.test(path)) {
    return Buffer.from(decompress(readFileSync(path))).toString('utf8')
  }
  return ctx.fs.readText(target)
}

// 递归收集目录下的 session.jsonl(.zstd)；跳过 events/conflicts/guardian 等伴生文件。
export async function collectDshFiles(ctx, dirTarget, out, recursive) {
  const entries = await ctx.fs.listDir(dirTarget)
  for (const entry of entries) {
    if (entry.type === 'directory') {
      if (recursive) await collectDshFiles(ctx, entry.target, out, recursive)
    } else if (entry.type === 'file' && isDshSessionFile(entry.name)) {
      out.push(entry.target)
    }
  }
}
