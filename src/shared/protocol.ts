/**
 * IPC message contracts shared between the main and renderer processes.
 * Mirrors the pattern in animATEM/src/shared/protocol.ts.
 */

import type { DeviceConfig, FleetProject } from './config'

export interface ExportResult {
  /** Root directory the fleet folders were written under. */
  outputDir: string
  devices: {
    name: string
    /** Directory written for this device. */
    dir: string
    /** Absolute path to the generated config XML. */
    xmlPath: string
    /** Number of media pool files copied. */
    mediaCopied: number
    /** Media pool items whose source file was missing on disk. */
    mediaMissing: string[]
  }[]
}

export type ApplyStepStatus = 'ok' | 'skipped' | 'error'

export interface ApplyStep {
  /** Human label for the setting group, e.g. "Input names" or "Streaming service". */
  label: string
  status: ApplyStepStatus
  /** Detail on skip/error, or which fields are folder-export only. */
  detail?: string
}

export interface ApplyResult {
  deviceName: string
  connected: boolean
  steps: ApplyStep[]
}

/** Fleet-project persistence result. */
export interface SaveResult {
  filePath: string
}

export interface OpenResult {
  filePath: string
  fleet: FleetProject
}

/** The typed bridge exposed to the renderer as `window.api`. */
export interface FleetAdminApi {
  fleet: {
    open: () => Promise<OpenResult | null>
    save: (fleet: FleetProject) => Promise<SaveResult | null>
  }
  export: {
    /** Prompt for a directory and write per-device folders + media. */
    toFolders: (fleet: FleetProject) => Promise<ExportResult | null>
    /** Generate the XML for one device without writing anything (for preview). */
    previewXml: (device: DeviceConfig) => Promise<string>
  }
  network: {
    /** Connect to a device and apply the settable subset of its config. */
    apply: (device: DeviceConfig) => Promise<ApplyResult>
  }
}
