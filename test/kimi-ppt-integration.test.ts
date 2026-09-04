import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const artifacts = {
  core: {
    file: 'dsh-kimi-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz',
    sha256: '300bd0f4f423a6d046cb61b193e4b5d4e535ca3d5921d21bbc0dc4f4aa002464'
  },
  adapter: {
    file: 'deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz',
    sha256: '97adcb338ced61cbbfaf9b453bf26a3c01265bd96b25778bd00061e092d10aa3'
  }
} as const

async function artifact(name: keyof typeof artifacts): Promise<Buffer> {
  return readFile(path.join(projectRoot, 'packages', 'kimi-ppt', artifacts[name].file))
}

function tarEntries(archive: Buffer): Map<string, Buffer> {
  const tar = gunzipSync(archive)
  const entries = new Map<string, Buffer>()
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/u, '')
    if (name.length === 0) break
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/u, '')
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/u, '').trim()
    const size = Number.parseInt(sizeText || '0', 8)
    const contentOffset = offset + 512
    const fullName = prefix.length === 0 ? name : `${prefix}/${name}`
    entries.set(fullName, tar.subarray(contentOffset, contentOffset + size))
    offset = contentOffset + Math.ceil(size / 512) * 512
  }
  return entries
}

describe('Kimi PPT built-in plugin', () => {
  it('pins the reviewed plugin artifacts byte-for-byte', async () => {
    const lock = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { integrity?: string }>
    }
    const packagePaths = {
      core: 'node_modules/dsh-kimi-ppt',
      adapter: 'node_modules/@deepseek-ai/dsh-experimental-kimi-ppt-standard-adapter'
    } as const

    for (const name of Object.keys(artifacts) as (keyof typeof artifacts)[]) {
      const archive = await artifact(name)
      expect(createHash('sha256').update(archive).digest('hex')).toBe(artifacts[name].sha256)
      expect(lock.packages[packagePaths[name]]?.integrity).toBe(
        `sha512-${createHash('sha512').update(archive).digest('base64')}`
      )
    }
  })

  it('ships one Kimi composer surface and excludes the Tencent route', async () => {
    const core = gunzipSync(await artifact('core')).toString('utf8')
    const adapter = gunzipSync(await artifact('adapter')).toString('utf8')
    const excluded = /\b(?:tencent|slidep|editor_sdk)\b|workbuddy[- ]runtime|\bppt_(?:create|render|write_page)\b/iu

    expect(core).toContain('experimental-kimi-ppt')
    expect(core).toContain('pptd_render')
    expect(core).toContain('ppt_get_template_reference')
    expect(core).not.toMatch(excluded)
    expect(adapter).toContain('conversation.hero.modeActions')
    expect(adapter).toContain('kimi-ppt')
    expect(adapter).not.toMatch(excluded)
  })

  it('ships every JavaScript chunk imported by the Host entry', async () => {
    const archive = gunzipSync(await artifact('core')).toString('utf8')
    const chunk = /from "\.\/(pptd-[A-Za-z0-9_-]+\.js)"/u.exec(archive)?.[1]

    expect(chunk).toBeDefined()
    expect(archive).toContain(`package/lib/${chunk}`)
  })

  it('exposes geometry-derived text capacity to the Kimi authoring workflow', async () => {
    const entries = tarEntries(await artifact('core'))
    const protocol = entries.get('package/lib/types/protocol.d.ts')?.toString('utf8') ?? ''
    const host = entries.get('package/lib/index.js')?.toString('utf8') ?? ''
    const skill = entries.get('package/skills/kimi-ppt/SKILL.md')?.toString('utf8') ?? ''

    expect(protocol).toContain('readonly textCapacity?: number')
    expect(host).toContain('textCapacity: zone.textCapacity ?? geometricTextCapacity(zone, fontSize)')
    expect(skill).toContain('每个文本区的 `textCapacity` 是该区域的最大建议字符数')
  })

  it('ships three core templates in each category plus the 58-page Vitality Blue pack', async () => {
    const entries = tarEntries(await artifact('core'))
    const designs = [...entries.keys()]
      .filter(name => /^package\/skills\/kimi-ppt\/references\/[^/]+\/[^/]+\/design\.md$/u.test(name))
    const categories = designs.reduce<Record<string, number>>((counts, name) => {
      const category = name.split('/')[4]!
      counts[category] = (counts[category] ?? 0) + 1
      return counts
    }, {})

    expect(designs).toHaveLength(22)
    expect(categories).toEqual({
      academic: 3,
      business: 4,
      consulting: 3,
      finance: 3,
      promotion: 3,
      strategy: 3,
      work: 3
    })

    const vitalityRoot = 'package/skills/kimi-ppt/references/business/curated-vitality-blue'
    const vitalityPages = [...entries.keys()].filter(name =>
      new RegExp(`^${vitalityRoot}/pages/\\d{2}\\.jpg$`, 'u').test(name)
    )
    const design = entries.get(`${vitalityRoot}/design.md`)?.toString('utf8') ?? ''
    expect(vitalityPages).toHaveLength(58)
    expect(design).toContain('shared slide layout 7')
    expect(design).toContain('29729fab2132fc120eba39371e4093a51beefa099ac978965d92dc9965b3c68e')
    expect(design).toContain('logo-free')
  })

  it('places the PPT action beside the agent preset and the catalog below the input', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const cluster = client.indexOf('className: ConversationRoot_module_css_default.heroModeCluster')
    const agentPreset = client.indexOf('renderSlot("conversation.hero.agentPreset", {})', cluster)
    const modeActions = client.indexOf(
      'zone !== void 0 && renderSlot("conversation.hero.modeActions", zone)',
      agentPreset
    )
    const owner = client.indexOf('extensionZone: zone')
    const input = client.indexOf('className: clsx(InputBar_module_css_default.card', owner)
    const catalog = client.indexOf(
      'extensionZone !== void 0 ? renderSlot("conversation.composer.dock", extensionZone) : null',
      input
    )

    expect(cluster).toBeGreaterThan(-1)
    expect(modeActions).toBeGreaterThan(agentPreset)
    expect(owner).toBeGreaterThan(-1)
    expect(input).toBeGreaterThan(owner)
    expect(catalog).toBeGreaterThan(input)
  })

  it('renders the selected template before editable prompt text', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const promptRow = client.indexOf('className: InputBar_module_css_default.promptRow')
    const accessory = client.indexOf('className: InputBar_module_css_default.accessory', promptRow)
    const scroll = client.indexOf('ref: scrollRef', promptRow)

    expect(promptRow).toBeGreaterThan(-1)
    expect(accessory).toBeGreaterThan(promptRow)
    expect(scroll).toBeGreaterThan(accessory)
    expect(client).toContain('children: accessory ?? renderSlot("conversation.input.accessory", extensionZone)')
  })

  it('declares both local artifacts and mounts only the Kimi adapter', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const profilePatch = await readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')

    expect(manifest.dependencies['dsh-kimi-ppt']).toBe(
      `file:packages/kimi-ppt/${artifacts.core.file}`
    )
    expect(manifest.dependencies['@deepseek-ai/dsh-experimental-kimi-ppt-standard-adapter']).toBe(
      `file:packages/kimi-ppt/${artifacts.adapter.file}`
    )
    expect(profilePatch).toContain("name: '@deepseek-ai/dsh-experimental-kimi-ppt-standard-adapter'")
    expect(profilePatch).not.toContain('office-ppt-standard-adapter')
    expect(profilePatch).not.toContain('name: dsh-kimi-ppt')
    expect(profilePatch).not.toContain('workbuddy')
  })
})
