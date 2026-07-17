/** Editor tab bodies. Each takes the active device and writes through the store. */

import { listSources, type DeviceConfig } from '../../../shared/config'
import { getModelProfile } from '../../../shared/models'
import { useFleet } from '../store'
import { Field, NumberInput, Select, TextInput, Toggle } from './controls'

type TabProps = { device: DeviceConfig }

function useUpdate(device: DeviceConfig): (patch: Partial<DeviceConfig>) => void {
  const updateDevice = useFleet((s) => s.updateDevice)
  return (patch) => updateDevice(device.id, patch)
}

function sourceOptions(device: DeviceConfig): { value: number; label: string }[] {
  return listSources(device).map((s) => ({ value: s.id, label: `${s.label} (${s.id})` }))
}

/* ---------------------------------------------------------------- Project */

export function ProjectTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const profile = getModelProfile(device.model)
  return (
    <div className="tab-grid">
      <Field label="Model">
        <div className="readonly">{profile.label}</div>
      </Field>
      <Field label="Show / Project name" hint="Used as the recording filename prefix.">
        <TextInput value={device.show} onChange={(show) => update({ show })} />
      </Field>
      <Field label="Network address" hint="IP or hostname for Connect & Apply (optional).">
        <TextInput
          value={device.address}
          placeholder="192.168.10.240"
          onChange={(address) => update({ address })}
        />
      </Field>
    </div>
  )
}

/* ------------------------------------------------------------ Inputs/Outputs */

export function InputsOutputsTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const sources = sourceOptions(device)

  return (
    <div className="tab-columns">
      <section>
        <h3>Inputs</h3>
        <div className="row-head">
          <span>ID</span>
          <span>Short (4)</span>
          <span>Long name</span>
        </div>
        {device.inputs.map((input, i) => (
          <div className="row" key={input.id}>
            <span className="pill">{input.id}</span>
            <TextInput
              value={input.shortName}
              maxLength={4}
              onChange={(shortName) => {
                const inputs = [...device.inputs]
                inputs[i] = { ...input, shortName }
                update({ inputs })
              }}
            />
            <TextInput
              value={input.longName}
              onChange={(longName) => {
                const inputs = [...device.inputs]
                inputs[i] = { ...input, longName }
                update({ inputs })
              }}
            />
          </div>
        ))}
      </section>

      <section>
        <h3>Output routing</h3>
        {device.outputs.map((out, i) => (
          <div className="row" key={out.busId}>
            <span className={out.uvc ? 'pill pill-accent' : 'pill'}>{out.label}</span>
            <Select
              value={out.source}
              options={sources}
              onChange={(source) => {
                const outputs = [...device.outputs]
                outputs[i] = { ...out, source }
                update({ outputs })
              }}
            />
          </div>
        ))}
      </section>
    </div>
  )
}

/* --------------------------------------------------------------- Transitions */

export function TransitionsTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const profile = getModelProfile(device.model)
  return (
    <div className="tab-grid">
      <Field label="Default transition type">
        <Select
          value={device.transition.style}
          options={profile.transitionStyles.map((s) => ({ value: s, label: s }))}
          onChange={(style) => update({ transition: { ...device.transition, style } })}
        />
      </Field>
      <Field label="Default transition time (frames)">
        <NumberInput
          value={device.transition.rate}
          min={1}
          max={250}
          onChange={(rate) => update({ transition: { ...device.transition, rate } })}
        />
      </Field>
      {profile.capabilities.fadeToBlack && (
        <>
          <Field label="Fade to black button">
            <Toggle
              label="Enabled"
              checked={device.fadeToBlack.enabled}
              onChange={(enabled) => update({ fadeToBlack: { ...device.fadeToBlack, enabled } })}
            />
          </Field>
          <Field label="FTB rate (frames)">
            <NumberInput
              value={device.fadeToBlack.rate}
              min={1}
              max={250}
              onChange={(rate) => update({ fadeToBlack: { ...device.fadeToBlack, rate } })}
            />
          </Field>
          <Field label="Audio follows FTB">
            <Toggle
              label="Program audio fades with FTB"
              checked={device.fadeToBlack.audioFollow}
              onChange={(audioFollow) =>
                update({ fadeToBlack: { ...device.fadeToBlack, audioFollow } })
              }
            />
          </Field>
        </>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- SuperSource */

export function SuperSourceTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const sources = sourceOptions(device)
  const ss = device.superSource
  return (
    <div>
      <div className="tab-grid">
        <Field label="Art fill (background) source">
          <Select
            value={ss.artFillInput}
            options={sources}
            onChange={(artFillInput) => update({ superSource: { ...ss, artFillInput } })}
          />
        </Field>
      </div>
      <h3>Boxes</h3>
      {ss.boxes.map((box, i) => (
        <div className="ss-box" key={box.index}>
          <div className="row">
            <span className="pill">Box {box.index + 1}</span>
            <Toggle
              label="Enabled"
              checked={box.enabled}
              onChange={(enabled) => {
                const boxes = [...ss.boxes]
                boxes[i] = { ...box, enabled }
                update({ superSource: { ...ss, boxes } })
              }}
            />
            <Select
              value={box.inputSource}
              options={sources}
              onChange={(inputSource) => {
                const boxes = [...ss.boxes]
                boxes[i] = { ...box, inputSource }
                update({ superSource: { ...ss, boxes } })
              }}
            />
          </div>
          <div className="ss-fields">
            <Field label="X">
              <NumberInput
                value={box.xPosition}
                step={0.01}
                onChange={(xPosition) => {
                  const boxes = [...ss.boxes]
                  boxes[i] = { ...box, xPosition }
                  update({ superSource: { ...ss, boxes } })
                }}
              />
            </Field>
            <Field label="Y">
              <NumberInput
                value={box.yPosition}
                step={0.01}
                onChange={(yPosition) => {
                  const boxes = [...ss.boxes]
                  boxes[i] = { ...box, yPosition }
                  update({ superSource: { ...ss, boxes } })
                }}
              />
            </Field>
            <Field label="Size">
              <NumberInput
                value={box.size}
                min={0}
                max={1}
                step={0.01}
                onChange={(size) => {
                  const boxes = [...ss.boxes]
                  boxes[i] = { ...box, size }
                  update({ superSource: { ...ss, boxes } })
                }}
              />
            </Field>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- Media Pool */

export function MediaPoolTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const profile = getModelProfile(device.model)

  const addItem = (kind: 'still' | 'clip'): void => {
    const index = device.mediaPool.filter((m) => m.kind === kind).length
    update({
      mediaPool: [
        ...device.mediaPool,
        {
          index,
          kind,
          name: `${kind === 'still' ? 'Still' : 'Clip'} ${index + 1}`,
          filePath: '',
          maxFrameCount: kind === 'clip' ? 720 : undefined
        }
      ]
    })
  }

  return (
    <div>
      <div className="btn-row">
        <button onClick={() => addItem('still')}>+ Add still</button>
        {profile.mediaPoolClips > 0 && <button onClick={() => addItem('clip')}>+ Add clip</button>}
      </div>
      {device.mediaPool.length === 0 && <p className="muted">No media pool items yet.</p>}
      {device.mediaPool.map((item, i) => (
        <div className="row" key={`${item.kind}-${item.index}`}>
          <span className="pill">
            {item.kind} {item.index}
          </span>
          <TextInput
            value={item.name}
            onChange={(name) => {
              const mediaPool = [...device.mediaPool]
              mediaPool[i] = { ...item, name }
              update({ mediaPool })
            }}
          />
          <TextInput
            value={item.filePath}
            placeholder="/path/to/file.png"
            onChange={(filePath) => {
              const mediaPool = [...device.mediaPool]
              mediaPool[i] = { ...item, filePath }
              update({ mediaPool })
            }}
          />
          <button
            className="danger"
            onClick={() => update({ mediaPool: device.mediaPool.filter((_, j) => j !== i) })}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- Media Players */

export function MediaPlayersTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const stillCount = device.mediaPool.filter((m) => m.kind === 'still').length
  const clipCount = device.mediaPool.filter((m) => m.kind === 'clip').length

  return (
    <div>
      {device.mediaPlayers.map((mp, i) => (
        <div className="row" key={mp.index}>
          <span className="pill">Player {mp.index + 1}</span>
          <Select
            value={mp.sourceType}
            options={[
              { value: 'Still', label: 'Still' },
              { value: 'Clip', label: 'Clip' }
            ]}
            onChange={(sourceType) => {
              const mediaPlayers = [...device.mediaPlayers]
              mediaPlayers[i] = { ...mp, sourceType }
              update({ mediaPlayers })
            }}
          />
          <NumberInput
            value={mp.sourceIndex}
            min={0}
            max={Math.max(0, (mp.sourceType === 'Still' ? stillCount : clipCount) - 1)}
            onChange={(sourceIndex) => {
              const mediaPlayers = [...device.mediaPlayers]
              mediaPlayers[i] = { ...mp, sourceIndex }
              update({ mediaPlayers })
            }}
          />
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- Streaming */

export function StreamingTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const s = device.streaming
  return (
    <div className="tab-grid">
      <Field label="Stream type">
        <Select
          value={s.serviceType}
          options={(['YouTube', 'Twitch', 'Facebook', 'Custom RTMP'] as const).map((v) => ({
            value: v,
            label: v
          }))}
          onChange={(serviceType) => update({ streaming: { ...s, serviceType } })}
        />
      </Field>
      <Field label="Destination (RTMP URL)">
        <TextInput
          value={s.destination}
          onChange={(destination) => update({ streaming: { ...s, destination } })}
        />
      </Field>
      <Field label="Stream key">
        <TextInput
          value={s.streamKey}
          onChange={(streamKey) => update({ streaming: { ...s, streamKey } })}
        />
      </Field>
      <Field label="Bandwidth (kbps)">
        <NumberInput
          value={s.bandwidthKbps}
          min={500}
          max={60000}
          step={500}
          onChange={(bandwidthKbps) => update({ streaming: { ...s, bandwidthKbps } })}
        />
      </Field>
    </div>
  )
}

/* ---------------------------------------------------------------- Recording */

export function RecordingTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const r = device.recording
  return (
    <div className="tab-grid">
      <Field label="Recording mode">
        <Select
          value={r.mode}
          options={[
            { value: 'program', label: 'Program only' },
            { value: 'iso', label: 'ISO (record all inputs)' }
          ]}
          onChange={(mode) => update({ recording: { ...r, mode } })}
        />
      </Field>
      <Field label="Recording bitrate / quality">
        <Select
          value={r.quality}
          options={[
            { value: 'HQ', label: 'HQ (45 Mbps)' },
            { value: 'Standard', label: 'Standard (20 Mbps)' },
            { value: 'Low', label: 'Low (8 Mbps)' }
          ]}
          onChange={(quality) => update({ recording: { ...r, quality } })}
        />
      </Field>
      <Field label="Filename" hint="Taken from the Show / Project name on the Project tab.">
        <div className="readonly">{device.show || '(unset)'}</div>
      </Field>
    </div>
  )
}

/* --------------------------------------------------------------------- DVE */

export function DveTab({ device }: TabProps): React.JSX.Element {
  const update = useUpdate(device)
  const sources = sourceOptions(device)
  const d = device.dve
  const set = (patch: Partial<typeof d>): void => update({ dve: { ...d, ...patch } })
  return (
    <div className="tab-grid">
      <Field label="Fill source">
        <Select value={d.fillSource} options={sources} onChange={(fillSource) => set({ fillSource })} />
      </Field>
      <Field label="Position X">
        <NumberInput value={d.positionX} step={0.1} onChange={(positionX) => set({ positionX })} />
      </Field>
      <Field label="Position Y">
        <NumberInput value={d.positionY} step={0.1} onChange={(positionY) => set({ positionY })} />
      </Field>
      <Field label="Size X">
        <NumberInput value={d.sizeX} min={0} max={1} step={0.01} onChange={(sizeX) => set({ sizeX })} />
      </Field>
      <Field label="Size Y">
        <NumberInput value={d.sizeY} min={0} max={1} step={0.01} onChange={(sizeY) => set({ sizeY })} />
      </Field>
      <Field label="Mask">
        <Toggle
          label="Enabled"
          checked={d.maskEnabled}
          onChange={(maskEnabled) => set({ maskEnabled })}
        />
      </Field>
    </div>
  )
}
