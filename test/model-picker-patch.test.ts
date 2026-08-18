import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const patchPath = path.join(
  projectRoot,
  'patches',
  '@deepseek-ai+dsh-client-ui-settings-models+0.1.0-rc.7.patch'
)

describe('DSH Desktop available-model picker', () => {
  it('ships one state-driven select-all toggle in the patch', async () => {
    const patch = await readFile(patchPath, 'utf8')

    expect(patch).toContain('const allCandidatesPicked =')
    expect(patch).toContain(
      'candidates.every((candidate) => picked.has(candidate.id))'
    )
    expect(patch).toContain(
      'children: t(allCandidatesPicked ? "fetchDeselectAll" : "fetchSelectAll")'
    )
    expect(patch).toContain('new Set(candidates.map((candidate) => candidate.id))')
  })

  it('includes English and Chinese copy for both toggle states', async () => {
    const patch = await readFile(patchPath, 'utf8')

    expect(patch).toContain('fetchSelectAll: "Select all"')
    expect(patch).toContain('fetchDeselectAll: "Deselect all"')
    expect(patch).toContain('fetchSelectAll: "全选"')
    expect(patch).toContain('fetchDeselectAll: "取消全选"')
  })
})
