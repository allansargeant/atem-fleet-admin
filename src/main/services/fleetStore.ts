/**
 * Load / save fleet project files (`.afa.json`) to disk via native dialogs.
 */

import { dialog } from 'electron'
import { promises as fs } from 'fs'
import type { FleetProject } from '../../shared/config'
import type { OpenResult, SaveResult } from '../../shared/protocol'

const FILTERS = [{ name: 'ATEM Fleet', extensions: ['afa.json', 'json'] }]

/** Validate that a parsed object looks like a fleet project we can load. */
export function parseFleet(raw: unknown): FleetProject {
  if (!raw || typeof raw !== 'object') throw new Error('not a fleet file')
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.devices)) throw new Error('fleet file has no devices array')
  return {
    version: 1,
    name: typeof obj.name === 'string' ? obj.name : 'Imported Fleet',
    devices: obj.devices as FleetProject['devices']
  }
}

export async function openFleet(): Promise<OpenResult | null> {
  const res = await dialog.showOpenDialog({
    title: 'Open Fleet',
    properties: ['openFile'],
    filters: FILTERS
  })
  if (res.canceled || res.filePaths.length === 0) return null
  const filePath = res.filePaths[0]
  const text = await fs.readFile(filePath, 'utf8')
  return { filePath, fleet: parseFleet(JSON.parse(text)) }
}

export async function saveFleet(fleet: FleetProject): Promise<SaveResult | null> {
  const res = await dialog.showSaveDialog({
    title: 'Save Fleet',
    defaultPath: `${fleet.name || 'fleet'}.afa.json`,
    filters: FILTERS
  })
  if (res.canceled || !res.filePath) return null
  await fs.writeFile(res.filePath, JSON.stringify(fleet, null, 2), 'utf8')
  return { filePath: res.filePath }
}

/** Prompt for an output directory for folder export. */
export async function pickExportDir(): Promise<string | null> {
  const res = await dialog.showOpenDialog({
    title: 'Choose export location',
    properties: ['openDirectory', 'createDirectory']
  })
  if (res.canceled || res.filePaths.length === 0) return null
  return res.filePaths[0]
}
