import { readFileSync } from 'node:fs'
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const bad = Object.entries(lock.packages).filter(([loc, meta]) => {
  const seg = loc.slice(loc.lastIndexOf('node_modules/') + 'node_modules/'.length)
  return seg.startsWith('@deepseek-ai/') && meta.peer === true && meta.dev !== true
}).map(([loc]) => loc)
console.log('peer-only runtime packages now:', JSON.stringify(bad))
const nested = Object.keys(lock.packages).filter((k) =>
  k.startsWith('node_modules/dsh-llm-opencode/node_modules/@deepseek-ai/'))
console.log('nested @deepseek-ai under dsh-llm-opencode now:', JSON.stringify(nested, null, 1))
console.log('lock root version:', lock.version)
console.log('root pkg entry version:', lock.packages[''].version)
const four = ['@deepseek-ai/dsh-attachment', '@deepseek-ai/dsh-brand', '@deepseek-ai/dsh-home-paths', '@deepseek-ai/dsh-invariants']
for (const name of four) {
  console.log(name, '->', lock.packages['node_modules/' + name]?.version ?? 'MISSING AT ROOT')
}
