export type RotationController = {
  lock?: (orientation: 'any' | 'portrait' | 'landscape') => Promise<void>
  unlock?: () => void
}

export type OrientationPref = 'auto' | 'portrait' | 'landscape'
export type RotationResult = { allowed: boolean; error?: string; enteredFullscreen?: boolean }
type FullscreenFallback = { active: () => boolean; enter: () => Promise<void> }

const explain = (error: unknown) => error instanceof Error ? `${error.name}: ${error.message}` : String(error)

export async function requestOrientation(
  controller: RotationController | undefined,
  preference: OrientationPref,
  isCurrent: () => boolean = () => true,
  fullscreen?: FullscreenFallback,
): Promise<RotationResult> {
  if (!controller?.lock) {
    if (preference === 'auto' && isCurrent()) {
      try { controller?.unlock?.() } catch { /* Rotation is optional. */ }
    }
    return { allowed: false, error: 'Screen orientation locking is unavailable in this browser.' }
  }
  try {
    await controller.lock(preference === 'auto' ? 'any' : preference)
    return { allowed: true }
  } catch (error) {
    const originalError = explain(error)
    // Only a user's explicit tap may enter fullscreen. Startup/resume and Auto
    // must never unexpectedly change the browser's display mode.
    if (preference !== 'auto' && fullscreen && isCurrent() && !fullscreen.active()) {
      let enteredFullscreen = false
      try {
        await fullscreen.enter()
        enteredFullscreen = true
        if (!isCurrent()) return { allowed: false, enteredFullscreen, error: 'Rotation request was superseded.' }
        await controller.lock(preference)
        return { allowed: true, enteredFullscreen }
      } catch (retryError) {
        return { allowed: false, enteredFullscreen, error: `${originalError}\nFullscreen retry: ${explain(retryError)}` }
      }
    }
    if (preference === 'auto' && isCurrent()) {
      try { controller.unlock?.() } catch { /* A stale Auto request must not unlock a newer choice. */ }
    }
    return { allowed: false, error: originalError }
  }
}

export async function applyOrientation(
  controller: RotationController | undefined,
  preference: OrientationPref,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  return (await requestOrientation(controller, preference, isCurrent)).allowed
}

// Older Android WebAPKs can retain a landscape manifest default. unlock() restores
// that default, so explicitly allow any orientation while leaving rotation to the OS.
export async function allowDeviceRotation(controller?: RotationController): Promise<void> {
  await applyOrientation(controller, 'auto')
}
