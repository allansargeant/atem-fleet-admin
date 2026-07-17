import type { ElectronAPI } from '@electron-toolkit/preload'
import type { FleetAdminApi } from '../shared/protocol'

declare global {
  interface Window {
    electron: ElectronAPI
    api: FleetAdminApi
  }
}
