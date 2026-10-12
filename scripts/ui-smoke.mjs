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
  let acceptDialog = false
  let dialogCount = 0
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Page.javascriptDialogOpening') { dialogCount++; void call('Page.handleJavaScriptDialog', { accept: acceptDialog }) }
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
  await waitFor("document.querySelectorAll('.move-target').length === 2")
  assert.equal(await evaluate("document.querySelectorAll('.move-target').length"), 2)
  await clickSquare('e4, empty')
  await waitFor("document.querySelector('.board-square[aria-label=\"e4, Blush pawn\"]') && !document.querySelector('.turn-title').textContent.includes('thinking')")
  await evaluate("document.querySelector('.game-actions button').click()")
  await waitFor("!!document.querySelector('.board-square[aria-label=\"e2, Blush pawn\"]')")
  assert.equal(await evaluate("document.querySelector('.game-actions button').disabled"), true)
  // A played position survives reload, including the complete history needed for Undo.
  await clickSquare('e2, Blush pawn')
  await clickSquare('e4, empty')
  await waitFor("JSON.parse(localStorage.getItem('squishy-game-v1')).moves.length === 2")
  const beforeReload = await evaluate("localStorage.getItem('squishy-game-v1')")
  await call('Page.reload')
  await waitFor("document.querySelectorAll('.board-square').length === 64 && !!document.querySelector('.board-square[aria-label=\"e4, Blush pawn\"]')")
  assert.equal(await evaluate("localStorage.getItem('squishy-game-v1')"), beforeReload)
  await evaluate("document.querySelector('.game-actions button').click()")
  await waitFor("JSON.parse(localStorage.getItem('squishy-game-v1')).moves.length === 0")
  await evaluate("document.querySelector('.game-settings').open = true; document.querySelectorAll('input[name=play-as]')[1].click()")
  await waitFor("JSON.parse(localStorage.getItem('squishy-game-v1')).player === 'b' && JSON.parse(localStorage.getItem('squishy-game-v1')).moves.length === 1")
  assert.equal(await evaluate("document.querySelector('.board-square').getAttribute('aria-label')"), 'h1, Blush rook')
  assert.equal(await evaluate("document.querySelector('.game-actions button').disabled"), true)
  await call('Page.reload')
  await waitFor("document.querySelectorAll('input[name=play-as]')[1]?.checked")
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('squishy-game-v1')).moves.length"), 1)
  await evaluate("document.querySelector('.game-settings').open = true; document.querySelectorAll('input[name=play-as]')[0].click()")
  assert.equal(await evaluate("document.querySelectorAll('input[name=play-as]')[1].checked"), true)
  acceptDialog = true
  await evaluate("document.querySelectorAll('input[name=play-as]')[0].click()")
  await waitFor("JSON.parse(localStorage.getItem('squishy-game-v1')).player === 'w' && JSON.parse(localStorage.getItem('squishy-game-v1')).moves.length === 0")
  assert(dialogCount >= 2, 'Changing sides must ask before replacing a game')
  await evaluate("document.querySelector('.segmented-control label:last-child input').click()")
  assert.equal(await evaluate("localStorage.getItem('squishy-level')"), 'tricky')
  await evaluate("document.querySelectorAll('.game-actions button')[1].click()")
  assert.equal(await evaluate("document.querySelector('.board-square').getAttribute('aria-label')"), 'h1, Blush rook')
  await evaluate("document.querySelectorAll('.game-actions button')[1].click(); document.querySelector('.game-settings').open = false")
  await mkdir('ui-screenshots', { recursive: true })
  for (const [name, width, height] of [['phone', 390, 844], ['small-phone', 320, 640], ['tablet', 1024, 768], ['desktop', 1440, 1000]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
    await pause(150)
    assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `${name}: horizontal overflow`)
    const screenshot = await call('Page.captureScreenshot', { format: 'png' })
    await writeFile(`ui-screenshots/${name}.png`, Buffer.from(screenshot.data, 'base64'))
  }
  // Reach a legal promotion position and check that the picker stays inside a small phone board.
  const moves = [ ['a2','a4'], ['h7','h5'], ['a4','a5'], ['h5','h4'], ['a5','a6'], ['h4','h3'], ['a6','b7'], ['h3','g2'] ].map(([from,to]) => ({from,to}))
  const promotionSave = JSON.stringify({version:1,player:'w',moves})
  await evaluate(`localStorage.setItem('squishy-game-v1', ${JSON.stringify(promotionSave)}); localStorage.setItem('squishy-theme','dark')`)
  await call('Emulation.setDeviceMetricsOverride', { width: 320, height: 640, deviceScaleFactor: 1, mobile: true })
  await call('Page.reload')
  await waitFor("!!document.querySelector('.board-square[aria-label=\"b7, Blush pawn\"]')")
  await clickSquare('b7, Blush pawn')
  await clickSquare('a8, Blueberry rook')
  await waitFor("!!document.querySelector('.promotion-dialog')")
  assert(await evaluate("(()=>{const b=document.querySelector('.board-frame').getBoundingClientRect(), d=document.querySelector('.promotion-dialog').getBoundingClientRect(); return d.left>=b.left && d.right<=b.right && d.top>=b.top && d.bottom<=b.bottom})()"), 'Promotion must fit inside the phone board')
  assert.equal(await evaluate("document.querySelectorAll('.promotion-choice').length"), 4)
  const promotionShot = await call('Page.captureScreenshot', { format: 'png' })
  await writeFile('ui-screenshots/phone-promotion-dark.png', Buffer.from(promotionShot.data, 'base64'))
  await evaluate("document.querySelector('.promotion-choice:last-child').click()")
  await waitFor("JSON.parse(localStorage.getItem('squishy-game-v1')).moves.some(move=>move.promotion==='n')")
  assert.equal(errors.length, 0, JSON.stringify(errors))
  console.log('UI checks passed: moves, saved-game reload, undo, both sides, confirmation, difficulty, flip, four viewport sizes, and small-phone promotion in dark mode.')
} finally {
  socket?.close()
  chrome.kill()
  server.kill()
  await pause(300)
  await rm(profile, { recursive: true, force: true, maxRetries: 3 })
}
