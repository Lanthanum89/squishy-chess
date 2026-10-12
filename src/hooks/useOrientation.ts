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
// 1. Ask the device to rotate and stay put via the Screen Orientation API. Chrome allows this in an
//    installed app, and refuses it in a normal tab, on iOS and on desktop, so failure is expected.
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
    const o = screen.orientation as ScreenOrientation & {
      lock?: (type: 'portrait' | 'landscape') => Promise<void>
    }
    if (pref === 'auto') o.unlock?.()
    else o.lock?.(pref)?.catch(() => {})
  }, [pref])

  const layout = pref === 'portrait' || !deviceLandscape ? 'portrait' : 'landscape'

  useEffect(() => {
    document.documentElement.dataset.layout = layout
  }, [layout])

  return [pref, setPref] as const
}
