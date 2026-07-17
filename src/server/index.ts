import { createServer } from 'http'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { createApi } from './api'
import { loadServerConfig } from './config'

/**
 * ATEM Fleet Admin — web server entry.
 *
 * The same provisioning tool as the Electron app, served as a local web app so
 * it can ship inside the av-launcher tray shell (see launcher/). The React UI is
 * identical; only the backend differs (HTTP here, IPC in Electron).
 */

function main(): void {
  const cfg = loadServerConfig()

  // Web build lives next to the compiled server in the packaged app; fall back
  // to the dev build output when running from source (out-server/server → repo).
  const webDist = resolve(__dirname, '../web')
  const devWebDist = resolve(__dirname, '../../out-web')

  mkdirSync(cfg.exportDir, { recursive: true })

  const app = createApi(cfg, existsSync(webDist) ? webDist : devWebDist)
  const server = createServer(app)

  server.listen(cfg.port, cfg.host === 'localhost' ? undefined : cfg.host, () => {
    console.log('\n  ATEM Fleet Admin')
    console.log(`  ├─ web UI     http://${cfg.host}:${cfg.port}`)
    console.log(`  └─ exports    ${cfg.exportDir}\n`)
  })

  const shutdown = (): void => {
    server.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
