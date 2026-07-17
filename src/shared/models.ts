/**
 * Model capability profiles — the heart of the "model-aware" design.
 *
 * Each ATEM model declares what it can do. The editor UI shows only the tabs
 * and options a model supports, and the XML generator only emits the sections a
 * model has. Adding a new model is a single new entry in {@link MODEL_PROFILES}.
 *
 * Phase 1 ships two profiles spanning the two hardware classes in the fleet:
 *  - a Mini-class device (streaming, recording, ISO, UVC out) and
 *  - a big-switcher (SuperSource, multi-M/E, HyperDeck) matching the real
 *    autosave XML the generator is validated against.
 */

export type ModelId = 'atem-mini-extreme-iso' | 'atem-4me-broadcast-studio-4k'

/** Transition styles ATEM Software Control writes in the `<TransitionStyle>` `style` attribute. */
export type TransitionStyle = 'Mix' | 'Dip' | 'Wipe' | 'DVE' | 'Stinger'

/** Recording quality presets exposed by ATEM Mini Pro/Extreme (H.264 bitrate tiers). */
export type RecordingQuality = 'HQ' | 'Standard' | 'Low'

/** Streaming platform families ATEM Software Control ships in its RTMP list. */
export type StreamServiceType = 'YouTube' | 'Twitch' | 'Facebook' | 'Custom RTMP'

export interface ModelProfile {
  id: ModelId
  /** Human label shown in the model dropdown. */
  label: string
  /** Exact string ATEM Software Control writes in the `<Profile product="...">` attribute. */
  product: string
  profileMajorVersion: number
  profileMinorVersion: number
  /** Number of physical/external video inputs the model exposes. */
  inputCount: number
  /** Number of mix-effect blocks (1 for Mini class, more for larger switchers). */
  mixEffects: number
  /** Number of AUX output buses available for source routing. */
  auxOutputs: number
  /** Number of media players available for pool assignment. */
  mediaPlayers: number
  /** Media pool capacity. */
  mediaPoolStills: number
  mediaPoolClips: number
  /** Capability flags gating the editor tabs + XML sections. */
  capabilities: {
    superSource: boolean
    streaming: boolean
    recording: boolean
    /** Whether recording supports ISO (multi-track) capture in addition to program-only. */
    recordingIso: boolean
    /** Whether the model has a USB-C UVC ("webcam") output that can be source-routed. */
    uvcOutput: boolean
    hyperDeck: boolean
    dve: boolean
    fadeToBlack: boolean
  }
  /** Transition styles selectable as the default transition for this model. */
  transitionStyles: TransitionStyle[]
}

export const MODEL_PROFILES: Record<ModelId, ModelProfile> = {
  'atem-mini-extreme-iso': {
    id: 'atem-mini-extreme-iso',
    label: 'ATEM Mini Extreme ISO',
    product: 'ATEM Mini Extreme ISO',
    profileMajorVersion: 2,
    profileMinorVersion: 1,
    inputCount: 8,
    mixEffects: 1,
    auxOutputs: 2,
    mediaPlayers: 2,
    mediaPoolStills: 20,
    mediaPoolClips: 0,
    capabilities: {
      superSource: false,
      streaming: true,
      recording: true,
      recordingIso: true,
      uvcOutput: true,
      hyperDeck: false,
      dve: true,
      fadeToBlack: true
    },
    transitionStyles: ['Mix', 'Dip', 'Wipe', 'DVE']
  },
  'atem-4me-broadcast-studio-4k': {
    id: 'atem-4me-broadcast-studio-4k',
    label: 'ATEM 4 M/E Broadcast Studio 4K',
    product: 'ATEM 4 M/E Broadcast Studio 4K',
    profileMajorVersion: 2,
    profileMinorVersion: 1,
    inputCount: 20,
    mixEffects: 4,
    auxOutputs: 24,
    mediaPlayers: 4,
    mediaPoolStills: 240,
    mediaPoolClips: 2,
    capabilities: {
      superSource: true,
      streaming: false,
      recording: false,
      recordingIso: false,
      uvcOutput: false,
      hyperDeck: true,
      dve: true,
      fadeToBlack: true
    },
    transitionStyles: ['Mix', 'Dip', 'Wipe', 'DVE', 'Stinger']
  }
}

export const MODEL_IDS = Object.keys(MODEL_PROFILES) as ModelId[]

export function getModelProfile(id: ModelId): ModelProfile {
  const profile = MODEL_PROFILES[id]
  if (!profile) throw new Error(`unknown ATEM model: ${id}`)
  return profile
}
