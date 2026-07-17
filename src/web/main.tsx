import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../renderer/src/App'
import '../renderer/src/App.css'
import { webApi } from './webApi'

// Install the HTTP-backed bridge before the app mounts, so the shared React
// components find the same `window.api` they use under Electron.
;(window as unknown as { api: typeof webApi }).api = webApi

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
