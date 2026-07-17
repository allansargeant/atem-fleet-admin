import { describe, expect, it } from 'vitest'
import { generateDeviceXml, recordingBitrateKbps } from './xmlGenerator'
import { createDevice } from '../../shared/config'

/**
 * These assertions pin the generator to the element/attribute conventions taken
 * from real ATEM autosave files:
 *   <Profile majorVersion="2" minorVersion="1" product="...">
 *     <MixEffectBlocks><MixEffectBlock index="0">
 *       <Program input="1"/> ... <FadeToBlack rate="30" isFullyBlack="False"/>
 *     <Auxiliaries><Auxiliary id="8001" input="1"/>
 *     <Settings ... ftbEnabled="True"><Inputs><Input id="1" shortName="CAM1" .../>
 *     <SuperSources><SuperSource><Boxes><Box .../>
 */

describe('generateDeviceXml — big switcher (ATEM 4 M/E)', () => {
  const device = createDevice('atem-4me-broadcast-studio-4k', 'Studio A')
  const xml = generateDeviceXml(device)

  it('emits the XML declaration and Profile with the exact product string', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true)
    expect(xml).toContain(
      '<Profile majorVersion="2" minorVersion="1" product="ATEM 4 M/E Broadcast Studio 4K">'
    )
  })

  it('names inputs with shortName capped at 4 chars and externalPortType', () => {
    expect(xml).toContain(
      '<Input id="1" shortName="CAM1" longName="Camera 1" externalPortType="SDI"/>'
    )
  })

  it('writes FadeToBlack using isFullyBlack (matching autosave) and ftbEnabled on Settings', () => {
    expect(xml).toContain('<FadeToBlack rate="30" isFullyBlack="False"/>')
    expect(xml).toMatch(/<Settings [^>]*ftbEnabled="True"/)
  })

  it('emits one MixEffectBlock per model M/E and routes aux ids from 8001', () => {
    expect((xml.match(/<MixEffectBlock index=/g) ?? []).length).toBe(4)
    expect(xml).toContain('<Auxiliary id="8001" input="1"/>')
  })

  it('includes SuperSources with Boxes for a supersource-capable model', () => {
    expect(xml).toContain('<SuperSources>')
    expect(xml).toMatch(/<Box index="0" enabled="True" inputSource="\d+"/)
  })

  it('does NOT emit Streaming/Recording for a non-streaming model', () => {
    expect(xml).not.toContain('<Streaming')
    expect(xml).not.toContain('<Recording')
  })

  it('is well-formed: every opened container tag is closed', () => {
    for (const tag of [
      'Profile',
      'MixEffectBlocks',
      'Auxiliaries',
      'Settings',
      'Inputs',
      'SuperSources',
      'Boxes'
    ]) {
      expect(xml).toContain(`<${tag}`)
      expect(xml).toContain(`</${tag}>`)
    }
  })
})

describe('generateDeviceXml — Mini class (ATEM Mini Extreme ISO)', () => {
  const device = createDevice('atem-mini-extreme-iso', 'Flypack')
  device.streaming = {
    serviceType: 'YouTube',
    destination: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: 'abcd-efgh',
    bandwidthKbps: 6000
  }
  device.recording = { mode: 'iso', quality: 'HQ' }
  const xml = generateDeviceXml(device)

  it('has a single MixEffectBlock and no SuperSources', () => {
    expect((xml.match(/<MixEffectBlock index=/g) ?? []).length).toBe(1)
    expect(xml).not.toContain('<SuperSources>')
  })

  it('emits reconstructed Streaming with url/key/bitrate', () => {
    expect(xml).toContain('url="rtmp://a.rtmp.youtube.com/live2"')
    expect(xml).toContain('key="abcd-efgh"')
    expect(xml).toContain('videoBitrate="6000000"')
  })

  it('emits Recording with ISO mode, show-name filename, and quality bitrate', () => {
    expect(xml).toContain('<Recording filename="Flypack" mode="ISORecordAllInputs" quality="HQ"')
    expect(xml).toContain(`videoBitrate="${recordingBitrateKbps('HQ') * 1000}"`)
  })

  it('routes the UVC output through a dedicated Auxiliary id', () => {
    expect(xml).toContain('<Auxiliary id="10010"')
  })

  it('escapes XML-sensitive characters in names', () => {
    const d = createDevice('atem-mini-extreme-iso', 'A & B <test>')
    d.inputs[0].longName = 'Cam "1" & <2>'
    const out = generateDeviceXml(d)
    expect(out).toContain('longName="Cam &quot;1&quot; &amp; &lt;2&gt;"')
    expect(out).not.toMatch(/longName="Cam "1"/)
  })
})
