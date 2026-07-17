import { describe, expect, it } from 'vitest'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { exportFleet, sanitizeName } from './folderExporter'
import { createDevice, createFleet } from '../../shared/config'

describe('sanitizeName', () => {
  it('strips path-hostile characters', () => {
    expect(sanitizeName('Studio A / Cam?')).toBe('Studio_A___Cam_')
    expect(sanitizeName('   ')).toBe('Untitled')
  })
})

describe('exportFleet', () => {
  it('writes a config.xml per device under a fleet folder', async () => {
    const base = await fs.mkdtemp(join(tmpdir(), 'afa-'))
    const fleet = createFleet('Roadshow')
    fleet.devices.push(createDevice('atem-mini-extreme-iso', 'Flypack 1'))
    fleet.devices.push(createDevice('atem-4me-broadcast-studio-4k', 'Studio A'))

    const result = await exportFleet(fleet, base)

    expect(result.devices.length).toBe(2)
    for (const d of result.devices) {
      const xml = await fs.readFile(d.xmlPath, 'utf8')
      expect(xml).toContain('<Profile')
      expect(d.xmlPath).toContain('Roadshow')
    }
    // second device folder is named from the device, sanitized
    expect(result.devices[1].dir.endsWith('Studio_A')).toBe(true)
  })

  it('reports missing media files instead of throwing', async () => {
    const base = await fs.mkdtemp(join(tmpdir(), 'afa-'))
    const fleet = createFleet('Fleet')
    const device = createDevice('atem-mini-extreme-iso', 'Cam Unit')
    device.mediaPool.push({
      index: 0,
      kind: 'still',
      name: 'Lower Third',
      filePath: '/nonexistent/does-not-exist.png'
    })
    fleet.devices.push(device)

    const result = await exportFleet(fleet, base)
    expect(result.devices[0].mediaMissing).toContain('Lower Third')
    expect(result.devices[0].mediaCopied).toBe(0)
  })
})
