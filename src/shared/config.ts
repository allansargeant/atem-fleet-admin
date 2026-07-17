/**
 * Fleet + per-device configuration data model.
 *
 * This is the single source of truth. Everything the UI edits lives here as
 * plain serialisable data, and both output paths consume it unchanged:
 *  - {@link ../main/services/xmlGenerator} turns a {@link DeviceConfig} into an
 *    ATEM Software Control `<Profile>` XML document, and
 *  - {@link ../main/services/networkApply} turns it into an `atem-connection`
 *    setter sequence for the fields the protocol can set live.
 *
 * Numeric `source` fields use ATEM video-source IDs (input id for cameras, plus
 * the well-known specials in {@link SPECIAL_SOURCES}); see {@link listSources}.
 */

import {
  getModelProfile,
  type ModelId,
  type RecordingQuality,
  type StreamServiceType,
  type TransitionStyle
} from './models'

export interface InputConfig {
  /** ATEM input id (1-based, matches the physical connector). */
  id: number
  /** Short name — ATEM Software Control caps this at 4 characters. */
  shortName: string
  longName: string
}

/** One routable output bus (an AUX, or the Mini's UVC/webcam output). */
export interface OutputRoute {
  /** Stable key for the bus, e.g. `aux1` or `usbc`. */
  busId: string
  label: string
  /** Video source id currently routed to this bus. */
  source: number
  /** True for the USB-C UVC ("webcam") output on Mini-class models. */
  uvc?: boolean
}

export interface SuperSourceBox {
  index: number
  enabled: boolean
  inputSource: number
  xPosition: number
  yPosition: number
  size: number
  cropped: boolean
  cropTop: number
  cropBottom: number
  cropLeft: number
  cropRight: number
}

export interface SuperSourceConfig {
  /** Art fill source shown behind the boxes. */
  artFillInput: number
  boxes: SuperSourceBox[]
}

export interface MediaPoolItem {
  /** Slot index within the pool. */
  index: number
  kind: 'still' | 'clip'
  /** Display name written into the pool slot. */
  name: string
  /** Absolute path to the source image/clip on disk, copied on folder export. */
  filePath: string
  /** Clips only: length in frames (stills ignore this). */
  maxFrameCount?: number
}

export interface MediaPlayerAssignment {
  index: number
  sourceType: 'Still' | 'Clip'
  /** Pool slot index this player is pointed at. */
  sourceIndex: number
}

export interface StreamingConfig {
  serviceType: StreamServiceType
  /** RTMP server / ingest URL (the "destination"). */
  destination: string
  streamKey: string
  /** Target bitrate in kbps. */
  bandwidthKbps: number
}

export interface RecordingConfig {
  /** Program-only (single file) vs ISO (per-input record). */
  mode: 'program' | 'iso'
  quality: RecordingQuality
}

export interface DveConfig {
  /** DVE picture-in-picture position, normalised to the ATEM -16..16 / -9..9 field. */
  positionX: number
  positionY: number
  sizeX: number
  sizeY: number
  fillSource: number
  maskEnabled: boolean
  maskTop: number
  maskBottom: number
  maskLeft: number
  maskRight: number
}

export interface TransitionConfig {
  style: TransitionStyle
  /** Default transition length in frames (ATEM stores transition rate in frames). */
  rate: number
}

export interface FadeToBlackConfig {
  /** The FTB button on/off — maps to `<Settings ftbEnabled>`. */
  enabled: boolean
  /** FTB fade length in frames. */
  rate: number
  /** Whether the program audio follows the fade to black. */
  audioFollow: boolean
}

export interface DeviceConfig {
  /** Stable id used as React key and folder-name seed. */
  id: string
  name: string
  model: ModelId
  /** Show / project name — used as the recording filename prefix. */
  show: string
  /** Network address for the "connect & apply" path (optional). */
  address: string
  inputs: InputConfig[]
  outputs: OutputRoute[]
  superSource: SuperSourceConfig
  mediaPool: MediaPoolItem[]
  mediaPlayers: MediaPlayerAssignment[]
  streaming: StreamingConfig
  recording: RecordingConfig
  transition: TransitionConfig
  fadeToBlack: FadeToBlackConfig
  dve: DveConfig
}

export interface FleetProject {
  /** Schema version so we can migrate older saved project files. */
  version: 1
  name: string
  devices: DeviceConfig[]
}

/** Well-known ATEM video sources that are always available regardless of inputs. */
export const SPECIAL_SOURCES: { id: number; label: string }[] = [
  { id: 0, label: 'Black' },
  { id: 1000, label: 'Color Bars' },
  { id: 2001, label: 'Color 1' },
  { id: 2002, label: 'Color 2' },
  { id: 3010, label: 'Media Player 1' },
  { id: 4010, label: 'Media Player 2' }
]

/** Video sources selectable for routing/boxes on a given device (inputs + specials). */
export function listSources(device: DeviceConfig): { id: number; label: string }[] {
  const inputs = device.inputs.map((i) => ({ id: i.id, label: i.longName || i.shortName }))
  return [...inputs, ...SPECIAL_SOURCES]
}

let seq = 0
/** Deterministic-enough unique id without relying on Date.now/Math.random. */
export function newId(prefix = 'dev'): string {
  seq += 1
  return `${prefix}-${seq.toString(36)}-${(seq * 2654435761) % 0xffffffff}`
}

/** Build a fresh device pre-populated with sensible, model-appropriate defaults. */
export function createDevice(model: ModelId, name: string): DeviceConfig {
  const profile = getModelProfile(model)

  const inputs: InputConfig[] = Array.from({ length: profile.inputCount }, (_, i) => ({
    id: i + 1,
    shortName: `CAM${i + 1}`,
    longName: `Camera ${i + 1}`
  }))

  const outputs: OutputRoute[] = []
  for (let i = 0; i < profile.auxOutputs; i++) {
    outputs.push({ busId: `aux${i + 1}`, label: `AUX ${i + 1}`, source: 1 })
  }
  if (profile.capabilities.uvcOutput) {
    outputs.push({ busId: 'usbc', label: 'USB-C (UVC/Webcam)', source: 10010, uvc: true })
  }

  const boxes: SuperSourceBox[] = Array.from({ length: 4 }, (_, i) => ({
    index: i,
    enabled: i === 0,
    inputSource: inputs[Math.min(i, inputs.length - 1)]?.id ?? 1,
    xPosition: 0,
    yPosition: 0,
    size: i === 0 ? 0.5 : 0.25,
    cropped: false,
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0
  }))

  const mediaPlayers: MediaPlayerAssignment[] = Array.from(
    { length: profile.mediaPlayers },
    (_, i) => ({ index: i, sourceType: 'Still', sourceIndex: i })
  )

  return {
    id: newId(),
    name,
    model,
    show: name,
    address: '',
    inputs,
    outputs,
    superSource: { artFillInput: 1, boxes },
    mediaPool: [],
    mediaPlayers,
    streaming: {
      serviceType: 'YouTube',
      destination: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: '',
      bandwidthKbps: 6000
    },
    recording: { mode: 'program', quality: 'HQ' },
    transition: { style: 'Mix', rate: 30 },
    fadeToBlack: { enabled: true, rate: 30, audioFollow: false },
    dve: {
      positionX: 8,
      positionY: -4.5,
      sizeX: 0.5,
      sizeY: 0.5,
      fillSource: 1,
      maskEnabled: false,
      maskTop: 9,
      maskBottom: -9,
      maskLeft: -16,
      maskRight: 16
    }
  }
}

export function createFleet(name = 'New Fleet'): FleetProject {
  return { version: 1, name, devices: [] }
}
