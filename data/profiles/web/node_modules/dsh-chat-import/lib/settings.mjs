// lib/settings.mjs — REQ-71 settings.json / config.toml 翻译建议（不自动应用）
//
// 只读解析 Claude settings.json 与 Codex config.toml 的关键配置项，给出迁移到 DSH
// 时的建议与不可直接映射项清单。不写任何文件、不改 profile。

import { homedir } from 'node:os'
import { join } from 'node:path'

/** 解析 Claude settings.json，返回建议列表。纯函数。 */
export function parseClaudeSettings(jsonText) {
  const suggestions = []
  let doc
  try {
    doc = JSON.parse(jsonText)
  } catch {
    return suggestions
  }
  if (!doc || typeof doc !== 'object') return suggestions
  if (typeof doc.model === 'string' && doc.model) {
    suggestions.push({
      key: 'model',
      source: 'claude',
      value: doc.model,
      suggestion: '在 DSH 中通过默认模型绑定 / agentDefaultModel 选择对应模型；不会自动迁移。',
      unmappable: false,
    })
  }
  if (doc.permissions && typeof doc.permissions === 'object') {
    const rules = []
    for (const kind of ['allow', 'deny', 'ask']) {
      const list = doc.permissions[kind]
      if (Array.isArray(list) && list.length > 0) rules.push(`${kind}: ${list.length} 条`)
    }
    suggestions.push({
      key: 'permissions',
      source: 'claude',
      value: rules.join('；') || 'empty',
      suggestion: 'Claude 权限规则需人工映射到 DSH preset / dsh-permission-rules；本工具只做提示。',
      unmappable: true,
    })
  }
  if (doc.hooks && typeof doc.hooks === 'object' && Object.keys(doc.hooks).length > 0) {
    suggestions.push({
      key: 'hooks',
      source: 'claude',
      value: Object.keys(doc.hooks).join(','),
      suggestion: 'Claude hooks 不能直接等价到 DSH；可评估 dsh-hooks-claude-code 桥。',
      unmappable: true,
    })
  }
  if (doc.env && typeof doc.env === 'object' && Object.keys(doc.env).length > 0) {
    suggestions.push({
      key: 'env',
      source: 'claude',
      value: Object.keys(doc.env).join(','),
      suggestion: '环境变量需在 DSH 启动环境或 profile 中配置；不会自动复制。',
      unmappable: true,
    })
  }
  return suggestions
}

/** 解析 Codex config.toml 的 model / model_provider，返回建议列表。纯函数。 */
export function parseCodexConfig(tomlText) {
  const suggestions = []
  const modelMatch = /(?:^|\n)\s*model\s*=\s*"([^"]+)"/
  const providerMatch = /(?:^|\n)\s*model_provider\s*=\s*"([^"]+)"/
  const model = modelMatch.exec(String(tomlText || ''))
  const provider = providerMatch.exec(String(tomlText || ''))
  if (model) {
    suggestions.push({
      key: 'model',
      source: 'codex',
      value: model[1],
      suggestion: '在 DSH 中通过默认模型绑定 / agentDefaultModel 选择对应模型；不会自动迁移。',
      unmappable: false,
    })
  }
  if (provider) {
    suggestions.push({
      key: 'model_provider',
      source: 'codex',
      value: provider[1],
      suggestion: 'Codex provider 需在 DSH 中配置对应 provider（如 deepseek-official / openai 兼容端点）；不会自动迁移。',
      unmappable: true,
    })
  }
  return suggestions
}

/** 合并多个来源的建议。 */
export function buildSettingsSuggestions(...lists) {
  return lists.flat()
}

/** 默认 Claude settings.json 路径：~/.claude/settings.json。 */
export function defaultClaudeSettingsPath(env = process.env) {
  return join(env.HOME || homedir(), '.claude', 'settings.json')
}

/** 默认 Codex config.toml 路径：~/.codex/config.toml。 */
export function defaultCodexConfigPath(env = process.env) {
  return join(env.HOME || homedir(), '.codex', 'config.toml')
}

/**
 * REQ-71 入口：读 Claude/Codex 配置 → 返回翻译建议。只读。
 * @param {object} ctx host ctx（fs）
 * @param {object} args { claudeSettingsPath?, codexConfigPath? }
 * @returns {object} { total, suggestions, sources }
 */
export async function runSettingsSuggest(ctx, args = {}) {
  const claudePath = args.claudeSettingsPath || defaultClaudeSettingsPath()
  const codexPath = args.codexConfigPath || defaultCodexConfigPath()
  const lists = []
  const sources = []
  for (const [path, parse, source] of [
    [claudePath, parseClaudeSettings, 'claude'],
    [codexPath, parseCodexConfig, 'codex'],
  ]) {
    try {
      const target = await ctx.fs.resolve(path)
      const text = await ctx.fs.readText(target)
      lists.push(parse(text))
      sources.push(source)
    } catch {
      // 缺文件/不可读：静默跳过
    }
  }
  const suggestions = buildSettingsSuggestions(...lists)
  return { total: suggestions.length, suggestions, sources }
}
