/**
 * Browser implementation of {@link FleetAdminApi}.
 *
 * The React UI talks to `window.api` regardless of backend. In Electron that's
 * the preload IPC bridge; here it's HTTP to the local server, with fleet
 * open/save handled entirely client-side (file upload / download) since a
 * browser has no native save dialog.
 */

import type { DeviceConfig, FleetProject } from '../shared/config'
import type {
  ApplyResult,
  ExportResult,
  FleetAdminApi,
  OpenResult,
  SaveResult
} from '../shared/protocol'

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error((detail as { error?: string }).error || `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

/** Prompt the browser to download `data` as a file. */
function download(filename: string, data: string, type: string): void {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Open a browser file picker and resolve the chosen file's text (or null). */
function pickFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async (): Promise<void> => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      resolve({ name: file.name, text: await file.text() })
    }
    // If the dialog is cancelled no change fires; that simply leaves the promise
    // pending, which is harmless for this one-shot UI action.
    input.click()
  })
}

export const webApi: FleetAdminApi = {
  fleet: {
    open: async (): Promise<OpenResult | null> => {
      const picked = await pickFile('.json,.afa.json,application/json')
      if (!picked) return null
      return { filePath: picked.name, fleet: JSON.parse(picked.text) as FleetProject }
    },
    save: async (fleet: FleetProject): Promise<SaveResult | null> => {
      const filename = `${fleet.name || 'fleet'}.afa.json`
      download(filename, JSON.stringify(fleet, null, 2), 'application/json')
      return { filePath: filename }
    }
  },
  export: {
    toFolders: (fleet: FleetProject): Promise<ExportResult | null> =>
      postJson<ExportResult>('/api/export/folders', fleet),
    previewXml: async (device: DeviceConfig): Promise<string> => {
      const res = await fetch('/api/export/preview-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(device)
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return res.text()
    }
  },
  network: {
    apply: (device: DeviceConfig): Promise<ApplyResult> =>
      postJson<ApplyResult>('/api/network/apply', device)
  }
}
