import { useEffect, useState } from 'react'
import { useStored } from './useStored'

export type OrientationPref = 'auto' | 'portrait' | 'landscape'
export const ORIENTATIONS: { id: OrientationPref; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
]

const LANDSCAPE_QUERY = '(orientation: landscape)'

// Two layers, because browsers differ:
// 1. Apply the chosen orientation via the Screen Orientation API where supported. Auto requests
//    'any': unlock() alone restores the installed manifest's default, which may still be landscape
//    in an older Android installation even after the live manifest changes. Other browsers may
//    refuse locking, so layout changes remain available independently.
// 2. If the device stays landscape, Portrait still stacks the layout. Landscape on a portrait
//    device cannot be faked, so it simply follows the device.
export function useOrientation() {
  const [pref, setPref] = useStored<OrientationPref>('squishy-orientation', 'auto', [
    'auto',
    'portrait',
    'landscape',
  ])
  const [deviceLandscape, setDeviceLandscape] = useState(() => matchMedia(LANDSCAPE_QUERY).matches)

  useEffect(() => {
    const mq = matchMedia(LANDSCAPE_QUERY)
    const onChange = () => setDeviceLandscape(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    // lock and unlock are missing from some TypeScript DOM typings, and from some browsers
    const o = screen.orientation as (ScreenOrientation & {
      lock?: (type: 'any' | 'portrait' | 'landscape') => Promise<void>
    }) | undefined
    if (!o) return
    let cancelled = false
    const apply = async () => {
      try {
        if (o.lock) await o.lock(pref === 'auto' ? 'any' : pref)
        else if (pref === 'auto') o.unlock?.()
      } catch {
        // Ordinary tabs may reject lock(). Avoid an old Auto request unlocking a newer choice.
        if (pref === 'auto' && !cancelled) {
          try { o.unlock?.() } catch { /* orientation control is optional */ }
        }
      }
    }
    void apply()
    return () => { cancelled = true }
  }, [pref])

  const layout = pref === 'portrait' || !deviceLandscape ? 'portrait' : 'landscape'

  useEffect(() => {
    document.documentElement.dataset.layout = layout
  }, [layout])

  return [pref, setPref] as const
}
