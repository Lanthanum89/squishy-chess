import { useEffect, useState } from 'react'
import { applyOrientation, type OrientationPref, type RotationController } from '../deviceRotation'
import { useStored } from './useStored'

const LANDSCAPE_QUERY = '(orientation: landscape)'
export const ORIENTATIONS: { id: OrientationPref; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
]
const ORIENTATION_IDS = ORIENTATIONS.map(({ id }) => id)

// Layout follows the available window, independently of old saved screen preferences.
// The live manifest allows either orientation. Override a stale installed manifest
// with 'any' rather than locking the device to portrait or landscape.
export function useOrientation() {
  // Start in Auto rather than reviving a legacy preference from the old Screen control.
  const [preference, setPreference] = useStored<OrientationPref>('squishy-screen-mode', 'auto', ORIENTATION_IDS)
  const [request, setRequest] = useState<{ preference: OrientationPref; blocked: boolean } | null>(null)
  const [landscape, setLandscape] = useState(() => matchMedia(LANDSCAPE_QUERY).matches)
  useEffect(() => {
    let active = true
    const allowRotation = () => {
      if (document.visibilityState === 'visible') {
        void applyOrientation(screen.orientation as RotationController | undefined, preference, () => active)
          .then((allowed) => { if (active) setRequest({ preference, blocked: !allowed }) })
      }
    }
    allowRotation()
    document.addEventListener('visibilitychange', allowRotation)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', allowRotation)
    }
  }, [preference])
  useEffect(() => {
    const query = matchMedia(LANDSCAPE_QUERY)
    const update = () => setLandscape(query.matches)
    query.addEventListener('change', update)
    update()
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    // Portrait can also stack the controls in browsers that cannot lock the screen.
    // Never squeeze a landscape board beside a sidebar in a narrow portrait window.
    document.documentElement.dataset.layout = landscape && preference !== 'portrait' ? 'landscape' : 'portrait'
  }, [landscape, preference])
  const blocked = request?.preference === preference && request.blocked && preference !== 'auto'
  return [preference, setPreference, blocked] as const
}
