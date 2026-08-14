import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop sidebar branding', () => {
  it('uses a compact brand lockup in the expanded and collapsed sidebar states', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches', '@deepseek-ai+dsh-client-ui-sidebar+0.1.0-rc.6.patch'),
      'utf8'
    )

    expect(patch).toContain('DshDesktopLogo')
    expect(patch).toContain('DshDesktopBrand')
    expect(patch).toContain('/dsh-desktop-logo.png')
    expect(patch).toContain('/dsh-desktop-logo-dark.png')
    expect(patch).toContain('children: "DSH Desktop"')
    expect(patch).toContain('height = 20')
    expect(patch).toContain('height: 18')
    expect(patch).toContain('.hHd-Xa_brand:hover')
    expect(patch).toContain('dsh-desktop-logo-knockout')
    expect(patch).toContain('@media (prefers-color-scheme: dark)')
  })

  it('installs the source logo into the Harness static frontend', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: { postinstall: string } }
    const installer = await readFile(
      path.join(projectRoot, 'scripts', 'install-brand-assets.mjs'),
      'utf8'
    )

    expect(packageJson.scripts.postinstall).toContain('node scripts/install-brand-assets.mjs')
    expect(installer).toContain("'build', 'icon.png'")
    expect(installer).toContain("'dsh-desktop-logo.png'")
    expect(installer).toContain("'build', 'logo-dark.png'")
    expect(installer).toContain("'dsh-desktop-logo-dark.png'")
    expect(installer).toContain('<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />')
    expect(installer).toContain('"src": "/dsh-desktop-logo.png"')
  })

  it('uses the desktop logo in the new-conversation hero', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.6.patch'
      ),
      'utf8'
    )

    expect(patch).toContain('/dsh-desktop-logo.png')
    expect(patch).toContain('src: "/dsh-desktop-logo.png"')
  })
})
