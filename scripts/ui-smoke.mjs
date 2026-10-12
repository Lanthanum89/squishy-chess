import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const profile = await mkdtemp(join(tmpdir(), 'squishy-chess-'))
const server = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' })
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=9222', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
let socket
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function available(url, options) {
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(url, options); if (response.ok) return response } catch {}
    await pause(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}
try {
  await available('http://127.0.0.1:4173')
  const target = await (await available('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json()
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0
  const pending = new Map()
  const errors = []
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.id) {
      const task = pending.get(message.id)
      if (!task) return
      pending.delete(message.id)
      clearTimeout(task.timer)
      if (message.error) task.reject(new Error(JSON.stringify(message.error)))
      else task.resolve(message.result)
    }
  })
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)) }, 10000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const waitFor = async (expression) => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(50) }
    throw new Error(`Condition failed: ${expression}`)
  }
  const clickSquare = (label) => evaluate(`document.querySelector('.board-square[aria-label="${label}"]').click()`)
  await call('Page.enable')
  await call('Runtime.enable')
  await call('Page.navigate', { url: 'http://127.0.0.1:4173' })
  await waitFor("document.querySelectorAll('.board-square').length === 64")
  await waitFor("[...document.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0)")
  await clickSquare('e2, Blush pawn')
  assert.equal(await evaluate("document.querySelectorAll('.move-target').length"), 2)
  await clickSquare('e4, empty')
  await waitFor("document.querySelector('.board-square[aria-label=\"e4, Blush pawn\"]') && !document.querySelector('.status-card h1').textContent.includes('thinking')")
  await evaluate("document.querySelector('.game-actions button').click()")
  await waitFor("!!document.querySelector('.board-square[aria-label=\"e2, Blush pawn\"]')")
  assert.equal(await evaluate("document.querySelector('.game-actions button').disabled"), true)
  await evaluate("document.querySelectorAll('input[name=play-as]')[1].click()")
  await waitFor("document.querySelectorAll('input[name=play-as]')[1].checked && !document.querySelector('.status-card h1').textContent.includes('thinking')")
  assert.equal(await evaluate("document.querySelector('.board-square').getAttribute('aria-label')"), 'h1, Blush rook')
  assert.equal(await evaluate("document.querySelector('.game-actions button').disabled"), true)
  await evaluate("document.querySelectorAll('input[name=play-as]')[0].click()")
  await waitFor("!!document.querySelector('.new-game-dialog')")
  assert.equal(await evaluate("document.querySelector('.game-layout').inert"), true)
  await evaluate("document.querySelector('.new-game-dialog button').click()")
  await waitFor("!document.querySelector('.new-game-dialog')")
  assert.equal(await evaluate("document.querySelectorAll('input[name=play-as]')[1].checked"), true)
  await evaluate("document.querySelectorAll('input[name=play-as]')[0].click()")
  await waitFor("!!document.querySelector('.new-game-dialog')")
  await evaluate("document.querySelector('.new-game-dialog button:last-child').click()")
  await waitFor("document.querySelectorAll('input[name=play-as]')[0].checked && !document.querySelector('.new-game-dialog')")
  await evaluate("document.querySelector('.difficulty-options button:last-child').click()")
  assert.equal(await evaluate("document.querySelector('.difficulty-options button:last-child').getAttribute('aria-pressed')"), 'true')
  await evaluate("document.querySelectorAll('.game-actions button')[1].click()")
  assert.equal(await evaluate("document.querySelector('.board-square').getAttribute('aria-label')"), 'h1, Blush rook')
  await evaluate("document.querySelectorAll('.game-actions button')[1].click()")
  await mkdir('ui-screenshots', { recursive: true })
  for (const [name, width, height] of [['phone', 390, 844], ['small-phone', 320, 640], ['tablet', 1024, 768], ['desktop', 1440, 1000]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
    await pause(150)
    assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `${name}: horizontal overflow`)
    const screenshot = await call('Page.captureScreenshot', { format: 'png' })
    await writeFile(`ui-screenshots/${name}.png`, Buffer.from(screenshot.data, 'base64'))
  }
  assert.equal(errors.length, 0, JSON.stringify(errors))
  console.log('UI checks passed: artwork, moves, computer replies, undo, both sides, confirmation, difficulty, flip, and four viewport sizes.')
} finally {
  socket?.close()
  chrome.kill()
  server.kill()
  await pause(300)
  await rm(profile, { recursive: true, force: true, maxRetries: 3 })
}
