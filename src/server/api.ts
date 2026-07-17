import express, { type Express } from 'express'
import { existsSync } from 'fs'
import type { DeviceConfig, FleetProject } from '../shared/config'
import { generateDeviceXml } from '../main/services/xmlGenerator'
import { exportFleet } from '../main/services/folderExporter'
import { applyToDevice } from '../main/services/networkApply'
import type { ServerConfig } from './config'

/**
 * Build the Express app: the REST API plus the static web UI.
 *
 * The endpoints mirror the Electron IPC surface (see src/shared/protocol.ts) so
 * the same React UI works against either backend. Fleet open/save happen
 * client-side in the browser (download/upload), so they need no route here.
 */
export function createApi(cfg: ServerConfig, webDist: string): Express {
  const app = express()
  app.use(express.json({ limit: '25mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, exportDir: cfg.exportDir })
  })

  // Generate loadable folders under the server's configured export directory.
  app.post('/api/export/folders', async (req, res) => {
    try {
      const fleet = req.body as FleetProject
      const result = await exportFleet(fleet, cfg.exportDir)
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.post('/api/export/preview-xml', (req, res) => {
    try {
      const device = req.body as DeviceConfig
      res.type('application/xml').send(generateDeviceXml(device))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  app.post('/api/network/apply', async (req, res) => {
    try {
      const device = req.body as DeviceConfig
      res.json(await applyToDevice(device))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  if (existsSync(webDist)) {
    app.use(express.static(webDist))
    // SPA fallback for any non-API route.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile('index.html', { root: webDist })
    })
  }

  return app
}
