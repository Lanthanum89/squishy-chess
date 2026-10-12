export type RotationController = {
  lock?: (orientation: 'any') => Promise<void>
  unlock?: () => void
}

// Older Android WebAPKs can retain a landscape manifest default. unlock() restores
// that default, so explicitly allow any orientation while leaving rotation to the OS.
export async function allowDeviceRotation(controller?: RotationController): Promise<void> {
  try {
    if (controller?.lock) await controller.lock('any')
    else controller?.unlock?.()
  } catch {
    // Ordinary tabs may reject lock(); rotation control is optional there.
    try { controller?.unlock?.() } catch { /* Unsupported APIs must not break the game. */ }
  }
}
