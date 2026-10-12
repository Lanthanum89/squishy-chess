import { useCallback, useEffect, useRef, useState } from 'react'
import { requestOrientation, type OrientationPref, type RotationController, type RotationResult } from '../deviceRotation'
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
  const [preference, storePreference] = useStored<OrientationPref>('squishy-screen-mode', 'auto', ORIENTATION_IDS)
  const [request, setRequest] = useState<(RotationResult & { preference: OrientationPref }) | null>(null)
  const [landscape, setLandscape] = useState(() => matchMedia(LANDSCAPE_QUERY).matches)
  const currentPreference = useRef(preference)
  const requestId = useRef(0)
  const ownsFullscreen = useRef(false)
  const attemptRotation = useCallback(async (next: OrientationPref, userInitiated = false): Promise<void> => {
    const id = ++requestId.current
    const isCurrent = () => id === requestId.current
    if (next === 'auto' && ownsFullscreen.current && document.fullscreenElement) {
      try { await document.exitFullscreen(); ownsFullscreen.current = false } catch { /* Keep rotation usable. */ }
      if (!isCurrent()) return
    }
    const result = await requestOrientation(
      screen.orientation as RotationController | undefined,
      next,
      isCurrent,
      userInitiated && document.documentElement.requestFullscreen ? {
        active: () => !!document.fullscreenElement,
        enter: () => document.documentElement.requestFullscreen(),
      } : undefined,
    )
    if (result.enteredFullscreen) ownsFullscreen.current = true
    if (!isCurrent()) {
      // Fullscreen can finish opening after another choice was tapped. Reapply
      // that latest choice; Auto also closes fullscreen that this app opened.
      if (result.enteredFullscreen) void attemptRotation(currentPreference.current)
      return
    }
    if (!result.allowed && result.enteredFullscreen && document.fullscreenElement) {
      try { await document.exitFullscreen(); ownsFullscreen.current = false } catch { /* Exit can be refused. */ }
      if (!isCurrent()) return
    }
    setRequest({ ...result, preference: next })
  }, [])
  const setPreference = (next: OrientationPref) => {
    currentPreference.current = next
    storePreference(next)
    // Start inside the tap handler so fullscreen retains browser user activation.
    void attemptRotation(next, true)
  }
  useEffect(() => {
    const allowRotation = () => {
      if (document.visibilityState === 'visible') void attemptRotation(currentPreference.current)
    }
    allowRotation()
    document.addEventListener('visibilitychange', allowRotation)
    return () => {
      requestId.current++
      document.removeEventListener('visibilitychange', allowRotation)
    }
  }, [attemptRotation])
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
  const blocked = request?.preference === preference && !request.allowed && preference !== 'auto'
  return [preference, setPreference, blocked, request?.preference === preference ? request.error : undefined] as const
}
