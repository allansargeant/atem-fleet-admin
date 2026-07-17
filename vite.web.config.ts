import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Web build: the same React UI as the Electron renderer, but with an HTTP-backed
// window.api (src/web/main.tsx). Serves as the front-end for the local server
// (src/server) that ships inside the av-launcher tray shell.
export default defineConfig({
  root: 'src/web',
  base: './',
  resolve: {
    alias: { '@renderer': resolve('src/renderer/src') }
  },
  build: {
    outDir: resolve('out-web'),
    emptyOutDir: true
  },
  server: {
    // Dev proxy so `npm run preview:web` can reach a server started separately.
    proxy: {
      '/api': 'http://localhost:4720'
    }
  },
  plugins: [react()]
})
