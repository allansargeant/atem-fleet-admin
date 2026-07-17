/**
 * Config model -> ATEM Software Control `<Profile>` XML.
 *
 * Element names, attribute names, nesting and 4-space indentation are matched
 * against real ATEM autosave files (see src/main/services/xmlGenerator.spec.ts,
 * which asserts against fixtures taken from ~/Documents/ATEM Autosave). The
 * `<Profile>` child order is: MixEffectBlocks, Auxiliaries, VideoMode, Settings
 * (which wraps Inputs / MediaPool), MediaPlayers, SuperSources — followed by the
 * Mini-class Streaming/Recording sections, which are reconstructed from the
 * atem-connection protocol and verified on hardware later.
 *
 * No XML dependency: the emitter is a few tiny string helpers so we control the
 * exact formatting ATEM Software Control writes.
 */

import type { DeviceConfig, OutputRoute } from '../../shared/config'
import { getModelProfile, type TransitionStyle } from '../../shared/models'

const INDENT = '    '

function bool(value: boolean): string {
  return value ? 'True' : 'False'
}

/** Escape the five XML attribute-sensitive characters. */
function attr(value: string | number | boolean): string {
  if (typeof value === 'boolean') return bool(value)
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Serialise an ordered attribute list, skipping undefined values. */
function attrs(pairs: [string, string | number | boolean | undefined][]): string {
  return pairs
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${attr(v as string | number | boolean)}"`)
    .join(' ')
}

/** A minimal element/line builder that tracks indentation depth. */
class XmlWriter {
  private lines: string[] = []
  private depth = 0

  private pad(): string {
    return INDENT.repeat(this.depth)
  }

  /** Self-closing leaf element: `<Tag a="1"/>`. */
  leaf(tag: string, pairs: [string, string | number | boolean | undefined][] = []): void {
    const a = attrs(pairs)
    this.lines.push(`${this.pad()}<${tag}${a ? ' ' + a : ''}/>`)
  }

  /** Open a container element and increase depth. */
  open(tag: string, pairs: [string, string | number | boolean | undefined][] = []): void {
    const a = attrs(pairs)
    this.lines.push(`${this.pad()}<${tag}${a ? ' ' + a : ''}>`)
    this.depth += 1
  }

  close(tag: string): void {
    this.depth -= 1
    this.lines.push(`${this.pad()}</${tag}>`)
  }

  raw(line: string): void {
    this.lines.push(`${this.pad()}${line}`)
  }

  toString(): string {
    return this.lines.join('\n')
  }
}

/** Map a recording quality tier to its H.264 target bitrate in kbps (1080p). */
export function recordingBitrateKbps(quality: DeviceConfig['recording']['quality']): number {
  switch (quality) {
    case 'HQ':
      return 45000
    case 'Standard':
      return 20000
    case 'Low':
      return 8000
  }
}

function writeMixEffectBlock(w: XmlWriter, device: DeviceConfig, index: number): void {
  const { transition, fadeToBlack } = device
  w.open('MixEffectBlock', [['index', index]])
  w.leaf('Program', [['input', device.inputs[0]?.id ?? 0]])
  w.leaf('Preview', [['input', device.inputs[1]?.id ?? device.inputs[0]?.id ?? 0]])
  w.leaf('NextTransition', [
    ['selection', 'Background'],
    ['nextSelection', 'Background']
  ])
  w.open('TransitionStyle', [
    ['style', transition.style],
    ['nextStyle', transition.style],
    ['previewTransition', false],
    ['transitionPosition', 0]
  ])
  writeTransitionParams(w, transition.style, transition.rate)
  w.close('TransitionStyle')
  w.leaf('FadeToBlack', [
    ['rate', fadeToBlack.rate],
    ['isFullyBlack', false]
  ])
  w.close('MixEffectBlock')
}

/**
 * Emit the parameter block(s) for the selected default transition. ATEM writes a
 * full set in the wild, but the loader honours the one named by `style`; we emit
 * the selected style's params (plus a Mix baseline, which ATEM always carries).
 */
function writeTransitionParams(w: XmlWriter, style: TransitionStyle, rate: number): void {
  w.leaf('MixParameters', [['rate', rate]])
  switch (style) {
    case 'Dip':
      w.leaf('DipParameters', [
        ['rate', rate],
        ['input', 0]
      ])
      break
    case 'Wipe':
      w.leaf('WipeParameters', [
        ['rate', rate],
        ['pattern', 'LeftToRightBar'],
        ['symmetry', 50],
        ['xPosition', 0.5],
        ['yPosition', 0.5],
        ['reverseDirection', false],
        ['flipFlip', false],
        ['borderInput', 1],
        ['borderWidth', 0],
        ['borderSoftness', 0]
      ])
      break
    case 'DVE':
      w.leaf('DVEParameters', [
        ['rate', rate],
        ['logoRate', rate],
        ['reverseDirection', false],
        ['flipFlop', false],
        ['effect', 'PushRight'],
        ['fillSource', 0],
        ['keySource', 0],
        ['enableKey', false],
        ['preMultipliedKey', true],
        ['clip', 50],
        ['gain', 70],
        ['invertKey', false]
      ])
      break
    case 'Stinger':
      w.leaf('StingerParameters', [
        ['source', 'MediaPlayer1'],
        ['preMultipliedKey', true],
        ['clip', 50],
        ['gain', 70],
        ['invert', false],
        ['clipDuration', 65],
        ['triggerPoint', 45],
        ['mixRate', 1],
        ['preroll', 0]
      ])
      break
    case 'Mix':
      break
  }
}

function writeAuxiliaries(w: XmlWriter, outputs: OutputRoute[]): void {
  if (outputs.length === 0) return
  w.open('Auxiliaries')
  outputs.forEach((out, i) => {
    // Real ATEM aux ids start at 8001; the reconstructed UVC route keeps its own
    // documented id so hardware/network-apply can target it distinctly.
    const id = out.uvc ? 10010 : 8001 + i
    w.leaf('Auxiliary', [
      ['id', id],
      ['input', out.source]
    ])
  })
  w.close('Auxiliaries')
}

function writeSettings(w: XmlWriter, device: DeviceConfig): void {
  w.open('Settings', [
    ['abDirect', false],
    ['cameraAux', -1],
    ['ftbEnabled', device.fadeToBlack.enabled]
  ])

  w.open('Inputs')
  for (const input of device.inputs) {
    w.leaf('Input', [
      ['id', input.id],
      ['shortName', input.shortName.slice(0, 4)],
      ['longName', input.longName],
      ['externalPortType', 'SDI']
    ])
  }
  w.close('Inputs')

  const stills = device.mediaPool.filter((m) => m.kind === 'still')
  const clips = device.mediaPool.filter((m) => m.kind === 'clip')
  if (stills.length === 0 && clips.length === 0) {
    w.leaf('MediaPool')
    w.close('Settings')
    return
  }
  w.open('MediaPool')
  if (clips.length > 0) {
    w.open('Clips')
    for (const clip of clips) {
      w.leaf('Clip', [
        ['index', clip.index],
        ['maxFrameCount', clip.maxFrameCount ?? 720]
      ])
    }
    w.close('Clips')
  }
  if (stills.length > 0) {
    w.open('Stills')
    for (const still of stills) {
      w.leaf('Still', [
        ['index', still.index],
        ['name', still.name]
      ])
    }
    w.close('Stills')
  }
  w.close('MediaPool')

  w.close('Settings')
}

function writeMediaPlayers(w: XmlWriter, device: DeviceConfig): void {
  if (device.mediaPlayers.length === 0) return
  w.open('MediaPlayers')
  for (const mp of device.mediaPlayers) {
    w.leaf('MediaPlayer', [
      ['index', mp.index],
      ['sourceType', mp.sourceType],
      ['sourceIndex', mp.sourceIndex]
    ])
  }
  w.close('MediaPlayers')
}

function writeSuperSources(w: XmlWriter, device: DeviceConfig): void {
  const ss = device.superSource
  w.open('SuperSources')
  w.open('SuperSource', [
    ['index', 0],
    ['artFillInput', ss.artFillInput],
    ['artOption', 'Background'],
    ['borderEnabled', false]
  ])
  w.open('Boxes')
  for (const box of ss.boxes) {
    w.leaf('Box', [
      ['index', box.index],
      ['enabled', box.enabled],
      ['inputSource', box.inputSource],
      ['xPosition', box.xPosition],
      ['yPosition', box.yPosition],
      ['size', box.size],
      ['cropped', box.cropped],
      ['cropTop', box.cropTop],
      ['cropBottom', box.cropBottom],
      ['cropLeft', box.cropLeft],
      ['cropRight', box.cropRight]
    ])
  }
  w.close('Boxes')
  w.close('SuperSource')
  w.close('SuperSources')
}

/**
 * Mini-class Streaming/Recording. Reconstructed from the atem-connection protocol
 * (no autosave sample available for this hardware class); the network-apply path
 * is the authoritative route for these until validated on a real Mini.
 */
function writeStreamingRecording(w: XmlWriter, device: DeviceConfig): void {
  const profile = getModelProfile(device.model)
  if (profile.capabilities.streaming) {
    const s = device.streaming
    w.leaf('Streaming', [
      ['serviceName', s.serviceType],
      ['url', s.destination],
      ['key', s.streamKey],
      ['videoBitrate', s.bandwidthKbps * 1000]
    ])
  }
  if (profile.capabilities.recording) {
    const r = device.recording
    w.leaf('Recording', [
      ['filename', device.show],
      ['mode', r.mode === 'iso' ? 'ISORecordAllInputs' : 'ProgramOnly'],
      ['quality', r.quality],
      ['videoBitrate', recordingBitrateKbps(r.quality) * 1000]
    ])
  }
}

/** Build the full `<Profile>` XML document for one device. */
export function generateDeviceXml(device: DeviceConfig): string {
  const profile = getModelProfile(device.model)
  const w = new XmlWriter()

  w.raw('<?xml version="1.0" encoding="UTF-8"?>')
  w.open('Profile', [
    ['majorVersion', profile.profileMajorVersion],
    ['minorVersion', profile.profileMinorVersion],
    ['product', profile.product]
  ])

  w.open('MixEffectBlocks')
  for (let i = 0; i < profile.mixEffects; i++) writeMixEffectBlock(w, device, i)
  w.close('MixEffectBlocks')

  writeAuxiliaries(w, device.outputs)
  w.leaf('VideoMode', [['videoMode', '1080p5994']])
  writeSettings(w, device)
  writeMediaPlayers(w, device)
  if (profile.capabilities.superSource) writeSuperSources(w, device)
  writeStreamingRecording(w, device)

  w.close('Profile')
  return w.toString() + '\n'
}
