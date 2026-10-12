import { useSyncExternalStore } from 'react'

// Chrome's own install prompt, used directly. The browser menu can wrongly report "already installed"
// when another app on the same github.io origin is installed.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Held at module level because the event can fire before React has mounted
let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  emit()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  emit()
})

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useInstall() {
  const available = useSyncExternalStore(subscribe, () => deferred !== null)

  async function install() {
    const event = deferred
    if (!event) return
    // An event can only be prompted once, whatever the answer
    deferred = null
    emit()
    try {
      await event.prompt()
      await event.userChoice
    } catch {
      /* the browser refused or the user dismissed it */
    }
  }

  return { canInstall: available && !matchMedia('(display-mode: standalone)').matches, install }
}
