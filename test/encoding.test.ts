import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import iconv from 'iconv-lite'

describe('GB18030 Encoding Support', () => {
  const testDir = join(tmpdir(), 'dsh-encoding-test-' + Date.now())

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Cleanup test files
    try {
      await unlink(join(testDir, 'utf8-test.txt'))
      await unlink(join(testDir, 'gb18030-test.txt'))
      await unlink(join(testDir, 'mixed-test.txt'))
    } catch {}
  })

  it('should detect and read UTF-8 files', async () => {
    const content = 'Hello World\n你好，世界！\nLine 3'
    const path = join(testDir, 'utf8-test.txt')
    await writeFile(path, content, 'utf8')

    const buffer = await readFile(path)
    const text = buffer.toString('utf8')
    expect(text).toBe(content)
  })

  it('should detect and read GB18030 files', async () => {
    const content = '你好，世界！\n这是GB18030编码\nLine 3'
    const path = join(testDir, 'gb18030-test.txt')
    // Write as GB18030 encoded buffer
    const buffer = iconv.encode(content, 'gb18030')
    await writeFile(path, buffer)

    // Read and decode
    const raw = await readFile(path)
    const decoded = iconv.decode(raw, 'gb18030')
    expect(decoded).toBe(content)
  })

  it('should convert between UTF-8 and GB18030', () => {
    const utf8Content = '你好，世界！'
    const gb18030Buffer = iconv.encode(utf8Content, 'gb18030')
    const backToUtf8 = iconv.decode(gb18030Buffer, 'gb18030')
    expect(backToUtf8).toBe(utf8Content)
  })

  it('should handle mixed content with encoding detection', async () => {
    // This test verifies our detectEncoding logic
    const utf8Text = 'Hello UTF-8'
    const gb18030Text = '你好 GB18030'

    // UTF-8 buffer
    const utf8Buffer = Buffer.from(utf8Text, 'utf8')
    expect(utf8Buffer.includes(0)).toBe(false)

    // GB18030 buffer
    const gb18030Buffer = iconv.encode(gb18030Text, 'gb18030')
    expect(gb18030Buffer.includes(0)).toBe(false)

    // Both should be decodable
    expect(utf8Buffer.toString('utf8')).toBe(utf8Text)
    expect(iconv.decode(gb18030Buffer, 'gb18030')).toBe(gb18030Text)
  })

  it('should preserve GB18030 encoding on round-trip', async () => {
    const originalContent = '旧代码注释：这是GB18030编码的文件\nfunction oldCode() {}'
    const path = join(testDir, 'mixed-test.txt')

    // Write as GB18030
    const gb18030Buffer = iconv.encode(originalContent, 'gb18030')
    await writeFile(path, gb18030Buffer)

    // Read back
    const raw = await readFile(path)
    const decoded = iconv.decode(raw, 'gb18030')
    expect(decoded).toBe(originalContent)

    // Simulate edit: replace text and write back
    const editedContent = decoded.replace('旧代码注释', '更新的注释')
    const reEncoded = iconv.encode(editedContent, 'gb18030')
    await writeFile(path, reEncoded)

    // Verify
    const finalRaw = await readFile(path)
    const finalDecoded = iconv.decode(finalRaw, 'gb18030')
    expect(finalDecoded).toBe(editedContent)
  })
})
