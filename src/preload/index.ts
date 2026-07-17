import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DeviceConfig, FleetProject } from '../shared/config'
import type {
  ApplyResult,
  ExportResult,
  FleetAdminApi,
  OpenResult,
  SaveResult
} from '../shared/protocol'

const api: FleetAdminApi = {
  fleet: {
    open: (): Promise<OpenResult | null> => ipcRenderer.invoke('fleet:open'),
    save: (fleet: FleetProject): Promise<SaveResult | null> =>
      ipcRenderer.invoke('fleet:save', fleet)
  },
  export: {
    toFolders: (fleet: FleetProject): Promise<ExportResult | null> =>
      ipcRenderer.invoke('export:folders', fleet),
    previewXml: (device: DeviceConfig): Promise<string> =>
      ipcRenderer.invoke('export:preview-xml', device)
  },
  network: {
    apply: (device: DeviceConfig): Promise<ApplyResult> =>
      ipcRenderer.invoke('network:apply', device)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
