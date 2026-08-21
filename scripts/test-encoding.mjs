// Encoding feature verification for patched @deepseek-ai/dsh-fs-local (+ dsh-fs).
// Run: node scripts/test-encoding.mjs  (cwd = repo root)
import { mkdtempSync, readFileSync, writeFileSync, rmSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import iconv from 'iconv-lite'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'

const dir = mkdtempSync(join(tmpdir(), 'dsh-enc-'))
const fs = new LocalFileSystem(new Context(), { cwd: dir, diffBasisMaxBytes: 10 * 1024 * 1024 })
// The agent sandbox's restricted token cannot SetFileSecurityW/ReplaceFileW;
// stub the native DACL/publication boundaries (encoding logic under test is unaffected).
fs.internals.copyFileDacl = async () => {}
fs.internals.replaceFile = async (replaced, replacement) => {
  const { rename } = await import('node:fs/promises')
  await rename(replacement, replaced)
}
const LOG = join(dir, 'results.log')
function log(line) { appendFileSync(LOG, line + '\n') }
let failures = 0
function check(name, cond, extra = '') {
  if (cond) log(`  ok  ${name}`)
  else { failures++; log(`FAIL  ${name} ${extra}`) }
}
const CN = '你好，世界！编码测试。'

// 1. GBK file: auto-detect read
const gbk = join(dir, 'gbk.txt')
writeFileSync(gbk, iconv.encode(CN + '\nsecond line', 'gb18030'))
{
  const target = await fs.resolve(gbk)
  check('detect gb18030', await fs.detectEncoding(target) === 'gb18030')
  const text = await fs.readText(target)
  check('read gbk text', text === CN + '\nsecond line', JSON.stringify(text))
  // stream path
  let streamed = ''
  for await (const chunk of await fs.streamText(target)) streamed += chunk
  check('stream gbk text', streamed === CN + '\nsecond line', JSON.stringify(streamed))
  // explicit encoding
  const explicit = await fs.readText(target, undefined, { encoding: 'gbk' })
  check('explicit gbk read', explicit === CN + '\nsecond line')
}

// 2. write preserves GBK encoding (no explicit encoding)
{
  const target = await fs.resolve(gbk)
  const out = await fs.writeText(target, CN + '\n重写的第二行')
  check('write outcome encoding gb18030', out.encoding === 'gb18030', String(out.encoding))
  const bytes = readFileSync(gbk)
  check('write stays gb18030 bytes', iconv.decode(bytes, 'gb18030') === CN + '\n重写的第二行')
}

// 3. edit on GBK file
{
  writeFileSync(gbk, iconv.encode('alpha 中文字符 omega', 'gb18030'))
  const target = await fs.resolve(gbk)
  const out = await fs.editText(target, { oldString: '中文字符', newString: '替换内容', replaceAll: false })
  check('edit outcome encoding gb18030', out.encoding === 'gb18030', String(out.encoding))
  check('edit roundtrip', iconv.decode(readFileSync(gbk), 'gb18030') === 'alpha 替换内容 omega')
}

// 4. UTF-16LE with BOM
const u16 = join(dir, 'u16.txt')
writeFileSync(u16, Buffer.concat([Buffer.from([0xFF, 0xFE]), iconv.encode(CN, 'utf16-le')]))
{
  const target = await fs.resolve(u16)
  check('detect utf-16le', await fs.detectEncoding(target) === 'utf-16le')
  check('read utf-16le', (await fs.readText(target)) === CN)
  const out = await fs.editText(target, { oldString: '世界', newString: '世界2', replaceAll: false })
  check('edit utf-16le encoding', out.encoding === 'utf-16le', String(out.encoding))
  const bytes = readFileSync(u16)
  check('utf-16le BOM preserved', bytes[0] === 0xFF && bytes[1] === 0xFE)
  check('utf-16le content', iconv.decode(bytes.subarray(2), 'utf16-le') === CN.replace('世界', '世界2'))
}

// 5. UTF-8 with BOM
const u8bom = join(dir, 'u8bom.txt')
writeFileSync(u8bom, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(CN, 'utf8')]))
{
  const target = await fs.resolve(u8bom)
  check('detect utf-8 (bom)', await fs.detectEncoding(target) === 'utf-8')
  check('read utf-8 bom stripped', (await fs.readText(target)) === CN)
  await fs.editText(target, { oldString: '编码', newString: '编码X', replaceAll: false })
  const bytes = readFileSync(u8bom)
  check('utf-8 BOM preserved on edit', bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF)
}

// 6. New file defaults to UTF-8
const fresh = join(dir, 'fresh.txt')
{
  const target = await fs.resolve(fresh)
  const out = await fs.writeText(target, CN)
  check('create outcome utf-8', out.encoding === 'utf-8', String(out.encoding))
  const bytes = readFileSync(fresh)
  check('create is utf-8 bytes', bytes.equals(Buffer.from(CN, 'utf8')))
}

// 7. Explicit encoding on new file: utf-16le gets a BOM
const fresh16 = join(dir, 'fresh16.txt')
{
  const target = await fs.resolve(fresh16)
  const out = await fs.writeText(target, CN, undefined, undefined, undefined, { encoding: 'utf-16le' })
  check('create utf-16le outcome', out.encoding === 'utf-16le', String(out.encoding))
  const bytes = readFileSync(fresh16)
  check('create utf-16le has BOM', bytes[0] === 0xFF && bytes[1] === 0xFE)
  check('create utf-16le content', iconv.decode(bytes.subarray(2), 'utf16-le') === CN)
}

// 8. Binary rejection still works
const bin = join(dir, 'bin.dat')
writeFileSync(bin, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x00, 0x01, 0x02]))
{
  const target = await fs.resolve(bin)
  let threw = ''
  try { await fs.readText(target) } catch (e) { threw = e.code ?? e.message }
  check('binary rejected', threw === 'FS_NOT_TEXT', String(threw))
}

// 9. Unsupported explicit encoding errors
{
  const target = await fs.resolve(gbk)
  let threw = ''
  try { await fs.readText(target, undefined, { encoding: 'shift_jis' }) } catch (e) { threw = e.code ?? e.message }
  check('unsupported encoding rejected', threw === 'FS_NOT_TEXT', String(threw))
}

// 10. Big5 detection via chardet fallback (bytes invalid as UTF-8)
const big5 = join(dir, 'big5.txt')
writeFileSync(big5, iconv.encode('繁體中文測試檔案內容，繁體中文測試檔案內容', 'big5'))
{
  const target = await fs.resolve(big5)
  const enc = await fs.detectEncoding(target)
  check('detect big5', enc === 'big5', String(enc))
  if (enc === 'big5') check('read big5', (await fs.readText(target)) === '繁體中文測試檔案內容，繁體中文測試檔案內容')
}

log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`)
const out = readFileSync(LOG, 'utf8')
rmSync(dir, { recursive: true, force: true })
writeFileSync(join(process.cwd(), 'scripts', 'test-encoding.result.txt'), out)
process.exit(failures === 0 ? 0 : 1)
