import { useEffect, useState } from 'react'

const LANDSCAPE_QUERY = '(orientation: landscape)'

// Layout follows the available window, independently of old saved screen preferences.
// The manifest allows either orientation; the app never locks the device's screen.
export function useOrientation() {
  const [landscape, setLandscape] = useState(() => matchMedia(LANDSCAPE_QUERY).matches)
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
