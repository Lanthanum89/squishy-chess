import { useState } from 'react'

function read<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const value = localStorage.getItem(key)
    return allowed.includes(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

// A string setting that survives reloads. Storage can be blocked or throw, so it only ever
// upgrades the experience and the app works the same without it.
export function useStored<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(() => read(key, fallback, allowed))
  const update = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(key, next)
    } catch {
      /* ignore */
    }
  }
  return [value, update] as const
}
