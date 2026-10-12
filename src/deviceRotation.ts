export type RotationController = {
  lock?: (orientation: 'any' | 'portrait' | 'landscape') => Promise<void>
  unlock?: () => void
}

export type OrientationPref = 'auto' | 'portrait' | 'landscape'

export async function applyOrientation(
  controller: RotationController | undefined,
  preference: OrientationPref,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  try {
    if (!controller?.lock) {
      if (preference === 'auto' && isCurrent()) controller?.unlock?.()
      return false
    }
    await controller.lock(preference === 'auto' ? 'any' : preference)
    return true
  } catch {
    // A rejected, older Auto request must not unlock a newer explicit choice.
    if (preference === 'auto' && isCurrent()) {
      try { controller?.unlock?.() } catch { /* Rotation APIs are optional. */ }
    }
    return false
  }
}

// Older Android WebAPKs can retain a landscape manifest default. unlock() restores
// that default, so explicitly allow any orientation while leaving rotation to the OS.
export async function allowDeviceRotation(controller?: RotationController): Promise<void> {
  await applyOrientation(controller, 'auto')
}
