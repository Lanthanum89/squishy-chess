import { useEffect, useState } from 'react'
import { allowDeviceRotation, type RotationController } from '../deviceRotation'

const LANDSCAPE_QUERY = '(orientation: landscape)'

// Layout follows the available window, independently of old saved screen preferences.
// The live manifest allows either orientation. Override a stale installed manifest
// with 'any' rather than locking the device to portrait or landscape.
export function useOrientation() {
  const [landscape, setLandscape] = useState(() => matchMedia(LANDSCAPE_QUERY).matches)
  useEffect(() => {
    const allowRotation = () => {
      if (document.visibilityState === 'visible') {
        void allowDeviceRotation(screen.orientation as RotationController | undefined)
      }
    }
    allowRotation()
    document.addEventListener('visibilitychange', allowRotation)
    return () => document.removeEventListener('visibilitychange', allowRotation)
  }, [])
  useEffect(() => {
    const query = matchMedia(LANDSCAPE_QUERY)
    const update = () => setLandscape(query.matches)
    query.addEventListener('change', update)
    update()
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.layout = landscape ? 'landscape' : 'portrait'
  }, [landscape])
}
