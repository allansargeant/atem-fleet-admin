import { useState } from 'react'
import type { DeviceConfig } from '../../../shared/config'
import { getModelProfile } from '../../../shared/models'
import { useFleet } from '../store'
import {
  DveTab,
  InputsOutputsTab,
  MediaPlayersTab,
  MediaPoolTab,
  ProjectTab,
  RecordingTab,
  StreamingTab,
  SuperSourceTab,
  TransitionsTab
} from './tabs'

type TabDef = {
  id: string
  label: string
  render: (device: DeviceConfig) => React.JSX.Element
  /** When false the tab is hidden for the device's model. */
  enabled: (device: DeviceConfig) => boolean
}

const always = (): boolean => true

const TABS: TabDef[] = [
  { id: 'project', label: 'Project', render: (d) => <ProjectTab device={d} />, enabled: always },
  {
    id: 'io',
    label: 'Inputs / Outputs',
    render: (d) => <InputsOutputsTab device={d} />,
    enabled: always
  },
  {
    id: 'transitions',
    label: 'Transitions / FTB',
    render: (d) => <TransitionsTab device={d} />,
    enabled: always
  },
  {
    id: 'dve',
    label: 'DVE',
    render: (d) => <DveTab device={d} />,
    enabled: (d) => getModelProfile(d.model).capabilities.dve
  },
  {
    id: 'supersource',
    label: 'SuperSource',
    render: (d) => <SuperSourceTab device={d} />,
    enabled: (d) => getModelProfile(d.model).capabilities.superSource
  },
  {
    id: 'mediapool',
    label: 'Media Pool',
    render: (d) => <MediaPoolTab device={d} />,
    enabled: always
  },
  {
    id: 'mediaplayers',
    label: 'Media Players',
    render: (d) => <MediaPlayersTab device={d} />,
    enabled: (d) => getModelProfile(d.model).mediaPlayers > 0
  },
  {
    id: 'streaming',
    label: 'Streaming',
    render: (d) => <StreamingTab device={d} />,
    enabled: (d) => getModelProfile(d.model).capabilities.streaming
  },
  {
    id: 'recording',
    label: 'Recording',
    render: (d) => <RecordingTab device={d} />,
    enabled: (d) => getModelProfile(d.model).capabilities.recording
  }
]

export function DeviceEditor({ device }: { device: DeviceConfig }): React.JSX.Element {
  const renameDevice = useFleet((s) => s.renameDevice)
  const [activeTab, setActiveTab] = useState('project')

  const tabs = TABS.filter((t) => t.enabled(device))
  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0]

  return (
    <div className="editor">
      <div className="editor-header">
        <input
          className="device-name"
          value={device.name}
          onChange={(e) => renameDevice(device.id, e.target.value)}
        />
        <span className="model-tag">{getModelProfile(device.model).label}</span>
      </div>

      <div className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={current.id === t.id}
            className={current.id === t.id ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-body">{current.render(device)}</div>
    </div>
  )
}
