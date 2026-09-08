// Probe reachability of remote-catalog promptFile/avatar URLs for a set of experts.
import { readFile } from 'node:fs/promises'

const root = 'E:/work/dsh-desktop-me/data/profiles/web/node_modules/dsh-expert-market'
const cat = JSON.parse(await readFile(root + '/resources/expert-center.json', 'utf8'))
const base = 'https://acc-1258344699.cos.accelerate.myqcloud.com/workbuddy/expert-marketplace'

const cats = process.argv[2] ? process.argv[2].split(',') : ['02-Engineering']
const list = cat.experts.filter(e => cats.includes(e.categoryId))

async function head(url) {
  try {
    const r = await fetch(url, { method: 'GET' })
    return r.ok ? r.status : r.status
  } catch (e) { return 'ERR' }
}

const results = []
for (const e of list) {
  const files = [e.promptFile, ...(e.members ?? []).map(m => m.promptFile)].filter(Boolean)
  const uniq = [...new Set(files)]
  const statuses = []
  for (const f of uniq) statuses.push(await head(base + f))
  const av = e.avatar ? await head(base + e.avatar) : '-'
  const ok = statuses.every(s => s === 200)
  results.push({ id: e.id, type: e.expertType ?? 'agent', files: uniq.length, statuses: [...new Set(statuses)].join('/'), avatar: av, ok })
  console.log(`${ok ? 'OK ' : 'BAD'} ${e.id.padEnd(38)} ${(e.expertType ?? 'agent').padEnd(6)} files=${uniq.length} md=[${[...new Set(statuses)].join(',')}] avatar=${av}`)
}
const bad = results.filter(r => !r.ok)
console.log(`\ntotal=${results.length} ok=${results.length - bad.length} bad=${bad.length}`)
if (bad.length) console.log('BAD: ' + bad.map(b => b.id).join(', '))
