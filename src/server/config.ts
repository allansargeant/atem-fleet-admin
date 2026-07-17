import { resolve } from 'path'

/**
 * Web-server configuration. The av-launcher injects host/port via environment
 * variables (`env` mode in launcher.toml), mirroring the fleet convention used
 * by atem-overseer.
 */
export interface ServerConfig {
  host: string
  port: number
  /** Directory the "Generate folders" action writes fleet folders into. */
  exportDir: string
}

const DEFAULTS: ServerConfig = {
  host: 'localhost',
  port: 4720,
  exportDir: resolve('exports')
}

export function loadServerConfig(): ServerConfig {
  const cfg = { ...DEFAULTS }
  const port = process.env.ATEM_FLEET_ADMIN_PORT
  const host = process.env.ATEM_FLEET_ADMIN_HOST
  const exportDir = process.env.ATEM_FLEET_ADMIN_EXPORT_DIR
  if (port && Number.isFinite(Number(port))) cfg.port = Number(port)
  if (host) cfg.host = host
  if (exportDir) cfg.exportDir = resolve(exportDir)
  return cfg
}
