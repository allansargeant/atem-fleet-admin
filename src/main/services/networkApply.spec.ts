import { describe, expect, it, vi } from 'vitest'
import { buildApplySteps, runApplySteps, type AtemLike } from './networkApply'
import { createDevice } from '../../shared/config'

/** A recording mock switcher that satisfies AtemLike and logs every call. */
function mockAtem(): { atem: AtemLike; calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {}
  const record =
    (name: string) =>
    async (...args: unknown[]) => {
      ;(calls[name] ??= []).push(args)
    }
  const atem: AtemLike = {
    setInputSettings: record('setInputSettings'),
    setAuxSource: record('setAuxSource'),
    setSuperSourceBoxSettings: record('setSuperSourceBoxSettings'),
    setMediaPlayerSource: record('setMediaPlayerSource'),
    setMixTransitionSettings: record('setMixTransitionSettings'),
    setFadeToBlackRate: record('setFadeToBlackRate'),
    setEnableISORecording: record('setEnableISORecording'),
    setStreamingService: record('setStreamingService')
  }
  return { atem, calls }
}

describe('buildApplySteps + runApplySteps — Mini class', () => {
  const device = createDevice('atem-mini-extreme-iso', 'Flypack')
  device.recording = { mode: 'iso', quality: 'HQ' }

  it('sends input names, aux routing, media players, transition, FTB, streaming, ISO', async () => {
    const { atem, calls } = mockAtem()
    const steps = buildApplySteps(device)
    const results = await runApplySteps(atem, steps)

    expect(calls.setInputSettings.length).toBe(device.inputs.length)
    expect(calls.setInputSettings[0]).toEqual([{ shortName: 'CAM1', longName: 'Camera 1' }, 1])
    // aux buses only (UVC excluded), routed to bus indexes 0..n-1
    const auxRoutes = device.outputs.filter((o) => !o.uvc)
    expect(calls.setAuxSource.length).toBe(auxRoutes.length)
    expect(calls.setStreamingService[0][0]).toMatchObject({ serviceName: 'YouTube' })
    expect(calls.setEnableISORecording[0]).toEqual([true])

    const ok = results.filter((r) => r.status === 'ok').map((r) => r.label)
    expect(ok).toContain('Streaming service')
    expect(ok).toContain('Default transition rate')
  })

  it('marks UVC routing and recording bitrate as folder-export-only (skipped)', () => {
    const labels = buildApplySteps(device)
      .filter((s) => s.skip)
      .map((s) => s.label)
    expect(labels).toContain('UVC / USB-C output routing')
    expect(labels).toContain('Recording bitrate / quality')
  })

  it('does not emit SuperSource steps for a model without it', () => {
    expect(buildApplySteps(device).some((s) => s.label === 'SuperSource boxes')).toBe(false)
  })
})

describe('buildApplySteps — big switcher', () => {
  const device = createDevice('atem-4me-broadcast-studio-4k', 'Studio A')

  it('includes SuperSource boxes and one transition-rate call per M/E, no streaming', async () => {
    const { atem, calls } = mockAtem()
    await runApplySteps(atem, buildApplySteps(device))
    expect(calls.setSuperSourceBoxSettings.length).toBe(device.superSource.boxes.length)
    expect(calls.setMixTransitionSettings.length).toBe(4) // 4 M/E
    expect(calls.setStreamingService).toBeUndefined()
  })

  it('records an error status when a setter throws, without aborting the run', async () => {
    const { atem } = mockAtem()
    atem.setAuxSource = vi.fn().mockRejectedValue(new Error('boom'))
    const results = await runApplySteps(atem, buildApplySteps(device))
    const aux = results.find((r) => r.label === 'Output routing (AUX)')
    expect(aux?.status).toBe('error')
    expect(aux?.detail).toBe('boom')
    // later steps still ran
    expect(results.find((r) => r.label === 'Fade to black rate')?.status).toBe('ok')
  })
})
