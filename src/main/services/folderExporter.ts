/**
 * Write per-device folders for manual loading into ATEM Software Control.
 *
 * Layout:
 *   <outputDir>/<FleetName>/<DeviceName>/config.xml   (the generated Profile)
 *   <outputDir>/<FleetName>/<DeviceName>/Media/...     (copied media-pool files)
 *
 * The operator drags the Media files into the switcher's media pool and uses
 * ATEM Software Control's "Load" to apply config.xml.
 */

import { promises as fs } from 'fs'
import { basename, join } from 'path'
import type { DeviceConfig, FleetProject } from '../../shared/config'
import type { ExportResult } from '../../shared/protocol'
import { generateDeviceXml } from './xmlGenerator'

/** Make a string safe to use as a folder name across platforms. */
export function sanitizeName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s/g, '_')
    .replace(/\.+$/, '')
  return cleaned || 'Untitled'
}

async function exportDevice(
  device: DeviceConfig,
  fleetDir: string
): Promise<ExportResult['devices'][number]> {
  const dir = join(fleetDir, sanitizeName(device.name))
  await fs.mkdir(dir, { recursive: true })

  const xmlPath = join(dir, 'config.xml')
  await fs.writeFile(xmlPath, generateDeviceXml(device), 'utf8')

  let mediaCopied = 0
  const mediaMissing: string[] = []
  if (device.mediaPool.length > 0) {
    const mediaDir = join(dir, 'Media')
    await fs.mkdir(mediaDir, { recursive: true })
    for (const item of device.mediaPool) {
      if (!item.filePath) {
        mediaMissing.push(item.name)
        continue
      }
      try {
        await fs.copyFile(item.filePath, join(mediaDir, basename(item.filePath)))
        mediaCopied += 1
      } catch {
        mediaMissing.push(item.name)
      }
    }
  }

  return { name: device.name, dir, xmlPath, mediaCopied, mediaMissing }
}

/** Write every device in the fleet under `outputDir`. */
export async function exportFleet(fleet: FleetProject, outputDir: string): Promise<ExportResult> {
  const fleetDir = join(outputDir, sanitizeName(fleet.name))
  await fs.mkdir(fleetDir, { recursive: true })

  const devices: ExportResult['devices'] = []
  for (const device of fleet.devices) {
    devices.push(await exportDevice(device, fleetDir))
  }

  return { outputDir: fleetDir, devices }
}
