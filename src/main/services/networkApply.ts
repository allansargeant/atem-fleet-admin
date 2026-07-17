/**
 * Config model -> live `atem-connection` setter sequence.
 *
 * Only the subset of settings the ATEM Ethernet protocol can set live is applied
 * here; anything the protocol can't reach (media-pool item definitions, UVC
 * routing, recording bitrate) is reported as a "folder-export only" step so the
 * operator knows to use the generated XML for those.
 *
 * The step list is built independently of any live connection
 * ({@link buildApplySteps}) so it can be unit-tested against a mock switcher
 * without touching hardware (see networkApply.spec.ts).
 */

import type { DeviceConfig } from '../../shared/config'
import type { ApplyResult, ApplyStep } from '../../shared/protocol'
import { getModelProfile } from '../../shared/models'

/** Structural subset of the atem-connection `Atem` we call — keeps this testable. */
export interface AtemLike {
  setInputSettings(props: { shortName?: string; longName?: string }, id: number): Promise<unknown>
  setAuxSource(source: number, bus: number): Promise<unknown>
  setSuperSourceBoxSettings(
    props: Record<string, unknown>,
    index: number,
    ssrcId?: number
  ): Promise<unknown>
  setMediaPlayerSource(props: Record<string, unknown>, player: number): Promise<unknown>
  setMixTransitionSettings(props: { rate: number }, me: number): Promise<unknown>
  setFadeToBlackRate(rate: number, me: number): Promise<unknown>
  setEnableISORecording(enable: boolean): Promise<unknown>
  setStreamingService(props: {
    serviceName: string
    url: string
    key: string
    bitrates: [number, number]
  }): Promise<unknown>
}

export interface ApplyStepDef {
  label: string
  /** Executor for settings the protocol can apply live. */
  run?: (atem: AtemLike) => Promise<void>
  /** If set, the step is folder-export only; this explains why. */
  skip?: string
}

/**
 * Build the ordered list of apply steps for a device. Pure: no I/O, no
 * connection — just describes what would be sent.
 */
export function buildApplySteps(device: DeviceConfig): ApplyStepDef[] {
  const profile = getModelProfile(device.model)
  const steps: ApplyStepDef[] = []

  steps.push({
    label: 'Input names',
    run: async (atem) => {
      for (const input of device.inputs) {
        await atem.setInputSettings(
          { shortName: input.shortName.slice(0, 4), longName: input.longName },
          input.id
        )
      }
    }
  })

  const auxRoutes = device.outputs.filter((o) => !o.uvc)
  steps.push({
    label: 'Output routing (AUX)',
    run: async (atem) => {
      for (let i = 0; i < auxRoutes.length; i++) {
        await atem.setAuxSource(auxRoutes[i].source, i)
      }
    }
  })

  const uvc = device.outputs.find((o) => o.uvc)
  if (uvc) {
    steps.push({
      label: 'UVC / USB-C output routing',
      skip: 'The USB webcam output is not settable over the Ethernet protocol — use folder export.'
    })
  }

  if (profile.capabilities.superSource) {
    steps.push({
      label: 'SuperSource boxes',
      run: async (atem) => {
        for (const box of device.superSource.boxes) {
          await atem.setSuperSourceBoxSettings(
            {
              enabled: box.enabled,
              source: box.inputSource,
              x: box.xPosition,
              y: box.yPosition,
              size: box.size,
              cropped: box.cropped,
              cropTop: box.cropTop,
              cropBottom: box.cropBottom,
              cropLeft: box.cropLeft,
              cropRight: box.cropRight
            },
            box.index,
            0
          )
        }
      }
    })
  }

  if (device.mediaPlayers.length > 0) {
    steps.push({
      label: 'Media player assignments',
      run: async (atem) => {
        for (const mp of device.mediaPlayers) {
          await atem.setMediaPlayerSource(
            mp.sourceType === 'Still'
              ? { sourceType: 1, stillIndex: mp.sourceIndex }
              : { sourceType: 2, clipIndex: mp.sourceIndex },
            mp.index
          )
        }
      }
    })
  }

  steps.push({
    label: 'Default transition rate',
    run: async (atem) => {
      for (let me = 0; me < profile.mixEffects; me++) {
        await atem.setMixTransitionSettings({ rate: device.transition.rate }, me)
      }
    }
  })

  if (profile.capabilities.fadeToBlack) {
    steps.push({
      label: 'Fade to black rate',
      run: async (atem) => {
        for (let me = 0; me < profile.mixEffects; me++) {
          await atem.setFadeToBlackRate(device.fadeToBlack.rate, me)
        }
      }
    })
  }

  if (profile.capabilities.streaming) {
    steps.push({
      label: 'Streaming service',
      run: async (atem) => {
        const bitrate = device.streaming.bandwidthKbps * 1000
        await atem.setStreamingService({
          serviceName: device.streaming.serviceType,
          url: device.streaming.destination,
          key: device.streaming.streamKey,
          bitrates: [bitrate, bitrate]
        })
      }
    })
  }

  if (profile.capabilities.recording) {
    if (profile.capabilities.recordingIso) {
      steps.push({
        label: 'Recording ISO mode',
        run: async (atem) => {
          await atem.setEnableISORecording(device.recording.mode === 'iso')
        }
      })
    }
    steps.push({
      label: 'Recording bitrate / quality',
      skip: 'Recording quality is not exposed as a live protocol setter — use folder export.'
    })
  }

  if (device.mediaPool.length > 0) {
    steps.push({
      label: 'Media pool items',
      skip: 'Media uploads require frame conversion; use folder export to stage the Media folder.'
    })
  }

  return steps
}

/** Run pre-built steps against a connected switcher, collecting per-step status. */
export async function runApplySteps(atem: AtemLike, steps: ApplyStepDef[]): Promise<ApplyStep[]> {
  const results: ApplyStep[] = []
  for (const step of steps) {
    if (step.skip) {
      results.push({ label: step.label, status: 'skipped', detail: step.skip })
      continue
    }
    try {
      await step.run!(atem)
      results.push({ label: step.label, status: 'ok' })
    } catch (err) {
      results.push({
        label: step.label,
        status: 'error',
        detail: err instanceof Error ? err.message : String(err)
      })
    }
  }
  return results
}

/**
 * Connect to the device's address and apply the settable subset. Imports
 * atem-connection lazily so unit tests (and the pure step builder) don't pull in
 * the native transport.
 */
export async function applyToDevice(device: DeviceConfig): Promise<ApplyResult> {
  if (!device.address) {
    return { deviceName: device.name, connected: false, steps: [] }
  }

  const { Atem } = await import('atem-connection')
  const atem = new Atem()
  const steps = buildApplySteps(device)

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('connection timed out')), 8000)
      atem.once('connected', () => {
        clearTimeout(timeout)
        resolve()
      })
      atem.on('error', () => {})
      atem.connect(device.address).catch(reject)
    })

    const results = await runApplySteps(atem as unknown as AtemLike, steps)
    return { deviceName: device.name, connected: true, steps: results }
  } catch (err) {
    return {
      deviceName: device.name,
      connected: false,
      steps: [
        {
          label: 'Connect',
          status: 'error',
          detail: err instanceof Error ? err.message : String(err)
        }
      ]
    }
  } finally {
    atem.disconnect().catch(() => {})
    atem.removeAllListeners()
  }
}
