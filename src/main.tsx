import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    let checking = false
    const checkForUpdate = async () => {
      if (checking || document.visibilityState !== 'visible' || !navigator.onLine) return
      checking = true
      try { await registration.update() } catch { /* Keep offline play available. */ }
      finally { checking = false }
    }
    // Installed apps can stay open for days without another navigation. Recheck
    // when returning to the app instead of waiting for the next full launch.
    document.addEventListener('visibilitychange', checkForUpdate)
    window.addEventListener('online', checkForUpdate)
    window.setInterval(checkForUpdate, 60 * 60 * 1000)
    void checkForUpdate()
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
