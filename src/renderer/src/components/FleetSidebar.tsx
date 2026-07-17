import { useState } from 'react'
import { MODEL_IDS, MODEL_PROFILES, type ModelId } from '../../../shared/models'
import { useFleet } from '../store'

export function FleetSidebar(): React.JSX.Element {
  const fleet = useFleet((s) => s.fleet)
  const selectedId = useFleet((s) => s.selectedId)
  const selectDevice = useFleet((s) => s.selectDevice)
  const addDevice = useFleet((s) => s.addDevice)
  const duplicateDevice = useFleet((s) => s.duplicateDevice)
  const removeDevice = useFleet((s) => s.removeDevice)

  const [model, setModel] = useState<ModelId>(MODEL_IDS[0])

  return (
    <aside className="sidebar">
      <div className="sidebar-add">
        <select value={model} onChange={(e) => setModel(e.target.value as ModelId)}>
          {MODEL_IDS.map((id) => (
            <option key={id} value={id}>
              {MODEL_PROFILES[id].label}
            </option>
          ))}
        </select>
        <button className="primary" onClick={() => addDevice(model)}>
          + Add ATEM
        </button>
      </div>

      <div className="device-list">
        {fleet.devices.length === 0 && (
          <p className="muted sidebar-empty">No devices yet. Add an ATEM to begin.</p>
        )}
        {fleet.devices.map((device) => (
          <div
            key={device.id}
            className={device.id === selectedId ? 'device-item selected' : 'device-item'}
            onClick={() => selectDevice(device.id)}
          >
            <div className="device-item-main">
              <span className="device-item-name">{device.name}</span>
              <span className="device-item-model">{MODEL_PROFILES[device.model].label}</span>
            </div>
            <div className="device-item-actions">
              <button
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation()
                  duplicateDevice(device.id)
                }}
              >
                ⧉
              </button>
              <button
                title="Remove"
                className="danger"
                onClick={(e) => {
                  e.stopPropagation()
                  removeDevice(device.id)
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
