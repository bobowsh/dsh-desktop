// lib/sync-panel.mjs — 双向同步控制面板路由
//
// GET  /api-import/sync   读开关 / 间隔 / 上次巡检 / 定时器状态
// POST /api-import/sync   改开关（inbound/outbound/intervalMs）或立即跑一轮（runNow）

import { loadSyncConfig, patchSyncConfig, SYNC_FORMATS } from './sync-config.mjs'
import { getSyncStatus, lazyInboundCheck, runSyncOnce, startSyncTimer } from './sync-loop.mjs'

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(String(chunk))
  return JSON.parse(chunks.join('') || '{}')
}

function json(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function registerSyncRoutes(ctx, ws, registryDir) {
  // REQ-54 watch 懒检查：面板（GET/POST /api-import/sync）打开即触发入站续写——
  // 已导入源按 mtime 门控，未增长零动作；watch 关闭时不跑（response 无 lazyCheck 键）。
  const replyStatus = async () => {
    const config = await loadSyncConfig(registryDir)
    const body = { ok: true, config, status: getSyncStatus(), formats: SYNC_FORMATS }
    if (config.watch.enabled) {
      try {
        body.lazyCheck = await lazyInboundCheck(ctx, registryDir)
      } catch (err) {
        body.lazyCheck = { triggered: true, failed: 1, errors: [{ error: String((err && err.message) || err) }] }
      }
    }
    return body
  }

  ws.register({
    kind: 'exact',
    path: '/api-import/sync',
    handler: async (req, res) => {
      try {
        const method = String(req.method || 'GET').toUpperCase()
        if (method === 'GET') {
          json(res, 200, await replyStatus())
          return
        }
        if (method !== 'POST') {
          json(res, 405, { ok: false, error: '只支持 GET / POST' })
          return
        }
        const body = await readBody(req)
        if (body.runNow === true) {
          const out = await runSyncOnce(ctx, registryDir, {
            dryRun: body.dryRun === true,
            path: typeof body.path === 'string' ? body.path : undefined,
          })
          json(res, out.ok === false ? 500 : 200, { ...(await replyStatus()), result: out })
          return
        }
        const patch = {}
        if (body.inbound && typeof body.inbound === 'object') patch.inbound = body.inbound
        if (body.outbound && typeof body.outbound === 'object') patch.outbound = body.outbound
        if (body.watch && typeof body.watch === 'object') patch.watch = body.watch
        if (body.intervalMs !== undefined) patch.intervalMs = body.intervalMs
        await patchSyncConfig(registryDir, patch)
        await startSyncTimer(ctx, registryDir)
        json(res, 200, await replyStatus())
      } catch (err) {
        json(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    },
  })
}
