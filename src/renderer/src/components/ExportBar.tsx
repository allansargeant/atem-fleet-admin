import { useState } from 'react'
import type { ApplyResult, ExportResult } from '../../../shared/protocol'
import type { DeviceConfig } from '../../../shared/config'
import { useFleet } from '../store'

export function ExportBar({ device }: { device: DeviceConfig | null }): React.JSX.Element {
  const fleet = useFleet((s) => s.fleet)
  const [busy, setBusy] = useState<string | null>(null)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const generate = async (): Promise<void> => {
    setBusy('export')
    setMessage(null)
    setApplyResult(null)
    try {
      const result = await window.api.export.toFolders(fleet)
      setExportResult(result)
      if (result) setMessage(`Wrote ${result.devices.length} device folder(s) to ${result.outputDir}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const apply = async (): Promise<void> => {
    if (!device) return
    setBusy('apply')
    setMessage(null)
    setExportResult(null)
    try {
      const result = await window.api.network.apply(device)
      setApplyResult(result)
      if (!result.connected) setMessage(`Could not connect to ${device.name}.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="export-bar">
      <div className="export-actions">
        <button className="primary" disabled={!!busy || fleet.devices.length === 0} onClick={generate}>
          {busy === 'export' ? 'Generating…' : 'Generate folders'}
        </button>
        <button disabled={!!busy || !device || !device.address} onClick={apply}>
          {busy === 'apply' ? 'Applying…' : 'Connect & apply selected'}
        </button>
        {device && !device.address && (
          <span className="muted">Set a network address on the Project tab to apply live.</span>
        )}
      </div>

      {message && <div className="export-message">{message}</div>}

      {exportResult && (
        <ul className="result-list">
          {exportResult.devices.map((d) => (
            <li key={d.dir}>
              <strong>{d.name}</strong> → {d.xmlPath}
              {d.mediaCopied > 0 && ` · ${d.mediaCopied} media copied`}
              {d.mediaMissing.length > 0 && (
                <span className="warn"> · missing: {d.mediaMissing.join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {applyResult && (
        <ul className="result-list">
          {applyResult.steps.map((s, i) => (
            <li key={i} className={`step step-${s.status}`}>
              <span className="step-status">{s.status}</span> {s.label}
              {s.detail && <span className="muted"> — {s.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
