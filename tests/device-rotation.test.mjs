import assert from 'node:assert/strict'
import test from 'node:test'
import { allowDeviceRotation } from '../src/deviceRotation.ts'

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
