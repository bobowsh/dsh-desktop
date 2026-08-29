#!/usr/bin/env node
/**
 * sync-harness-pkgs.mjs — 把仓库根 node_modules 的 @deepseek-ai/* (harness 构建版本)
 * 对齐到 data/profiles/web/node_modules/@deepseek-ai/ 顶层。
 *
 * 背景：npm 上 @deepseek-ai/* 的 latest 仍是 0.0.1-rc.1，web profile 经 pnpm install
 * 解析出的 @deepseek-ai/* 全是旧版，会遮蔽 harness 核心 (0.1.2-alpha.1)，导致
 * 「does not provide an export named 'ToolCallId'」和「llm/listProviders HTTP 404」。
 * pnpm v11 overrides 的 file:/link: 值在传递依赖场景下不生效（实测），故用本脚本
 * 在每次 pnpm install 之后做落盘对齐。
 *
 * 用法：node scripts/sync-harness-pkgs.mjs [--dry]
 * 规则：对 src 中每个包——dst 缺失或版本不同 → 用 src 覆盖 dst；版本一致 → 跳过。
 * 注意：pnpm install 会重建 node_modules，本脚本必须在每次 install 之后重新执行。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcBase = join(root, 'node_modules', '@deepseek-ai');
const dstBase = join(root, 'data', 'profiles', 'web', 'node_modules', '@deepseek-ai');
const dry = process.argv.includes('--dry');

if (!existsSync(srcBase)) {
  console.error(`[sync] source missing: ${srcBase}`);
  process.exit(1);
}

const getVersion = (base, name) => {
  try {
    return JSON.parse(readFileSync(join(base, name, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
};

const names = readdirSync(srcBase).filter((n) => existsSync(join(srcBase, n, 'package.json')));
mkdirSync(dstBase, { recursive: true });

let copied = 0;
let skipped = 0;
for (const name of names) {
  const sv = getVersion(srcBase, name);
  const dv = getVersion(dstBase, name);
  if (sv && sv === dv) {
    skipped++;
    continue;
  }
  const action = dv ? `${dv} -> ${sv}` : `(missing) -> ${sv}`;
  console.log(`[sync] ${name}: ${action}`);
  if (dry) {
    copied++;
    continue;
  }
  const dst = join(dstBase, name);
  rmSync(dst, { recursive: true, force: true });
  cpSync(join(srcBase, name), dst, { recursive: true });
  copied++;
}

console.log(`[sync] done: ${copied} aligned, ${skipped} already up-to-date (of ${names.length})${dry ? ' [DRY RUN]' : ''}`);
