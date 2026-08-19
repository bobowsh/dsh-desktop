// lib/import-prefs.mjs — 导入偏好设置（宿主侧命名空间注册 + 读取）
//
// 用 DSH 设置命名空间（ctx.settings / ctx.settingsScope）承载一个开关：
//   importSystemPrompt —— 是否把源 transcript 的系统提示词作为「上下文注入」导入。
// 默认 false（保持既有过滤行为：system/developer/harness 注入一律丢弃）。
// ctx.settings 是可选宿主服务（dsh-settings-file provider 未挂载时缺席），注册/读取
// 都容错回退默认，绝不阻塞导入。命名空间与 lib/client.js 的 settings.general.item
// 卡片共用 'chat-import' 命名空间（客户端经 ctx.settingsScope.bind 读写同一分区）。

import Schema from '@deepseek-ai/schemastery'

export const IMPORT_SETTINGS_NAMESPACE = 'chat-import'

// 命名空间 schema：importSystemPrompt 布尔、缺省 false（继承 schema 默认，无需 base）。
const ImportPrefsSchema = Schema.object({
  importSystemPrompt: Schema.boolean().default(false),
})

// 注册设置命名空间（效果挂插件 fiber：dispose 即移除）。settings 服务缺席/注册失败
// 不致命——读取方回退默认，导入照常可用。
export function registerImportPrefs(ctx) {
  const settings = ctx.get('settings')
  if (!settings || typeof settings.register !== 'function') return
  try {
    settings.register(IMPORT_SETTINGS_NAMESPACE, ImportPrefsSchema)
  } catch (err) {
    console.error('[dsh-chat-import] settings register failed: ' + String((err && err.message) || err))
  }
}

// 读取导入偏好（缺省 { importSystemPrompt: false }）。ctx.settings 缺席 / 命名空间未
// 注册 / 值形态异常时返回默认，不抛错。
export function readImportPrefs(ctx) {
  try {
    const settings = ctx.get('settings')
    if (!settings || typeof settings.get !== 'function') return { importSystemPrompt: false }
    const value = settings.get(IMPORT_SETTINGS_NAMESPACE)
    if (!value || typeof value !== 'object') return { importSystemPrompt: false }
    return { importSystemPrompt: value.importSystemPrompt === true }
  } catch {
    return { importSystemPrompt: false }
  }
}
