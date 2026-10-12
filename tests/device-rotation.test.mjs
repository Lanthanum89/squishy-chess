import assert from 'node:assert/strict'
import test from 'node:test'
import { allowDeviceRotation, applyOrientation, requestOrientation } from '../src/deviceRotation.ts'

test('overrides an older installed landscape default with any orientation', async () => {
  let orientation = 'landscape'
  const requests = []
  await allowDeviceRotation({
    async lock(value) { requests.push(value); orientation = value },
    unlock() { orientation = 'landscape' },
  })
  assert.deepEqual(requests, ['any'])
  assert.equal(orientation, 'any')
})

test('unsupported or rejected lock falls back safely', async () => {
  let unlocks = 0
  await allowDeviceRotation({ unlock() { unlocks++ } })
  await allowDeviceRotation({ async lock() { throw new Error('not standalone') }, unlock() { unlocks++ } })
  assert.equal(unlocks, 2)
  await allowDeviceRotation()
  await allowDeviceRotation({ async lock() { throw new Error('unsupported') }, unlock() { throw new Error('unsupported') } })
})

test('explicit choices request the matching orientation and Auto releases them with any', async () => {
  const requests = []
  const controller = { async lock(value) { requests.push(value) } }
  for (const mode of ['portrait', 'landscape', 'auto']) assert.equal(await applyOrientation(controller, mode), true)
  assert.deepEqual(requests, ['portrait', 'landscape', 'any'])
})

test('unsupported explicit choices report failure without restoring a stale default', async () => {
  let unlocks = 0
  assert.equal(await applyOrientation(undefined, 'portrait'), false)
  assert.equal(await applyOrientation({ async lock() { throw new Error('not supported') }, unlock() { unlocks++ } }, 'landscape'), false)
  assert.equal(unlocks, 0)
})

test('a rejected older Auto request cannot unlock a newer portrait choice', async () => {
  let rejectAuto
  let current = true
  let unlocks = 0
  const controller = {
    lock(value) { return value === 'any' ? new Promise((_, reject) => { rejectAuto = reject }) : Promise.resolve() },
    unlock() { unlocks++ },
  }
  const oldRequest = applyOrientation(controller, 'auto', () => current)
  current = false
  assert.equal(await applyOrientation(controller, 'portrait'), true)
  rejectAuto(new Error('superseded'))
  assert.equal(await oldRequest, false)
  assert.equal(unlocks, 0)
})

test('a fullscreen-only browser retries an explicit lock after entering fullscreen', async () => {
  let fullscreen = false
  const calls = []
  const result = await requestOrientation({ async lock(mode) {
    calls.push(mode)
    if (!fullscreen) throw new DOMException('Fullscreen required', 'SecurityError')
  } }, 'portrait', () => true, { active: () => fullscreen, async enter() { fullscreen = true } })
  assert.deepEqual(calls, ['portrait', 'portrait'])
  assert.deepEqual(result, {allowed:true,enteredFullscreen:true})
})

test('fullscreen and lock errors are preserved without throwing', async () => {
  const result = await requestOrientation({ async lock() { throw new DOMException('Fullscreen required', 'SecurityError') } }, 'landscape', () => true, {
    active: () => false,
    async enter() { throw new DOMException('User activation required', 'NotAllowedError') },
  })
  assert.equal(result.allowed, false)
  assert.match(result.error, /SecurityError: Fullscreen required/)
  assert.match(result.error, /NotAllowedError: User activation required/)
})

test('Auto and superseded explicit requests never enter fullscreen', async () => {
  let enters = 0
  const controller = { async lock() { throw new Error('not supported') } }
  const fullscreen = { active: () => false, async enter() { enters++ } }
  await requestOrientation(controller, 'auto', () => true, fullscreen)
  await requestOrientation(controller, 'portrait', () => false, fullscreen)
  assert.equal(enters, 0)
})

test('a failed fullscreen retry identifies that fullscreen was entered for cleanup', async () => {
  const result = await requestOrientation({ async lock() { throw new Error('unsupported device') } }, 'portrait', () => true, {active: () => false, async enter() {}})
  assert.equal(result.allowed, false)
  assert.equal(result.enteredFullscreen, true)
  assert.match(result.error, /unsupported device/)
})
