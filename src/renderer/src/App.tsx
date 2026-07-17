import { DeviceEditor } from './components/DeviceEditor'
import { ExportBar } from './components/ExportBar'
import { FleetSidebar } from './components/FleetSidebar'
import { useFleet } from './store'

function App(): React.JSX.Element {
  const fleet = useFleet((s) => s.fleet)
  const selectedId = useFleet((s) => s.selectedId)
  const setFleet = useFleet((s) => s.setFleet)
  const setFleetName = useFleet((s) => s.setFleetName)

  const device = fleet.devices.find((d) => d.id === selectedId) ?? null

  const open = async (): Promise<void> => {
    const result = await window.api.fleet.open()
    if (result) setFleet(result.fleet, result.filePath)
  }

  const save = async (): Promise<void> => {
    await window.api.fleet.save(fleet)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">▦</span>
          <span className="brand-name">ATEM Fleet Admin</span>
        </div>
        <input
          className="fleet-name"
          value={fleet.name}
          onChange={(e) => setFleetName(e.target.value)}
          aria-label="Fleet name"
        />
        <div className="header-actions">
          <button onClick={open}>Open…</button>
          <button onClick={save}>Save…</button>
        </div>
      </header>

      <div className="body">
        <FleetSidebar />
        <main className="main">
          {device ? (
            <>
              <DeviceEditor device={device} />
              <ExportBar device={device} />
            </>
          ) : (
            <div className="empty-state">
              <h2>No device selected</h2>
              <p>Add an ATEM from the sidebar, then build its config through the tabs.</p>
              <p className="muted">
                Generate loadable XML + media folders, or connect and apply over the network.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
