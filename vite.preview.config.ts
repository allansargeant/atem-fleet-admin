import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Browser-only preview of the renderer (no Electron). window.api is absent, so
// disk/network actions are inert, but the full UI + capability gating render.
// Used for visual verification; the real app runs via `npm run dev`.
export default defineConfig({
  root: 'src/renderer',
  resolve: {
    alias: { '@renderer': resolve('src/renderer/src') }
  },
  plugins: [react()]
})
