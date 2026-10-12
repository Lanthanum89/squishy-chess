import { useEffect, useState } from 'react'
import { useStored } from './useStored'

export type ThemePref = 'auto' | 'light' | 'dark'
export const THEME_KEY = 'squishy-theme'
export const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const THEME_COLOURS = { light: '#ffd6e8', dark: '#241a3a' }
const DARK_QUERY = '(prefers-color-scheme: dark)'

// The same resolution runs inline in index.html before first paint, to avoid a light flash
export function useTheme() {
  const [pref, setPref] = useStored<ThemePref>(THEME_KEY, 'auto', ['auto', 'light', 'dark'])
  const [systemDark, setSystemDark] = useState(() => matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const mq = matchMedia(DARK_QUERY)
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = pref === 'auto' ? (systemDark ? 'dark' : 'light') : pref

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOURS[resolved])
  }, [resolved])

  return [pref, setPref] as const
}
