import assert from 'node:assert/strict'
import test from 'node:test'
import { Chess } from 'chess.js'
import { emptyGame, GAME_KEY, readSavedGame, writeSavedGame } from '../src/gameSave.ts'

function memory(value = null) {
  return {
    value,
    getItem(key) { assert.equal(key, GAME_KEY); return this.value },
    setItem(key, data) { assert.equal(key, GAME_KEY); this.value = data },
  }
}
const move = (from, to, promotion) => promotion ? { from, to, promotion } : { from, to }

test('a missing save starts a new game', () => {
  assert.deepEqual(readSavedGame(memory()), emptyGame())
})

test('restores the chosen side, castling, captures and complete undo history', () => {
  const moves = [move('e2','e4'),move('e7','e5'),move('g1','f3'),move('b8','c6'),move('f1','c4'),move('g8','f6'),move('e1','g1'),move('f6','e4')]
  const game = { version: 1, player: 'b', mode: 'computer', moves }
  const storage = memory()
  assert(writeSavedGame(storage, game))
  const restored = readSavedGame(storage)
  assert.deepEqual(restored, game)
  const chess = new Chess()
  for (const input of restored.moves) chess.move(input)
  assert.equal(chess.history({ verbose: true }).at(-1).captured, 'p')
  assert.equal(chess.get('g1').type, 'k')
  assert.equal(chess.get('f1').type, 'r')
  chess.undo()
  assert.equal(chess.get('e4').type, 'p')
})

test('preserves en passant and underpromotion', () => {
  const histories = [
    [move('e2','e4'),move('a7','a6'),move('e4','e5'),move('d7','d5'),move('e5','d6')],
    [move('a2','a4'),move('h7','h5'),move('a4','a5'),move('h5','h4'),move('a5','a6'),move('h4','h3'),move('a6','b7'),move('h3','g2'),move('b7','a8','n')],
  ]
  for (const moves of histories) {
    const game = { version: 1, player: 'w', mode: 'computer', moves }
    assert.deepEqual(readSavedGame(memory(JSON.stringify(game))), game)
  }
})

test('restored history still detects threefold repetition', () => {
  const cycle = [move('g1','f3'),move('g8','f6'),move('f3','g1'),move('f6','g8')]
  const saved = { version: 1, player: 'w', mode: 'computer', moves: [...cycle, ...cycle] }
  const chess = new Chess()
  for (const input of readSavedGame(memory(JSON.stringify(saved))).moves) chess.move(input)
  assert(chess.isThreefoldRepetition())
})

test('undo and a new game replace the previous save', () => {
  const storage = memory()
  writeSavedGame(storage, { version: 1, player: 'b', mode: 'computer', moves: [move('e2','e4'),move('e7','e5')] })
  const restored = readSavedGame(storage)
  writeSavedGame(storage, { ...restored, moves: restored.moves.slice(0,1) })
  assert.equal(readSavedGame(storage).moves.length, 1)
  writeSavedGame(storage, { version: 1, player: 'b', mode: 'computer', moves: [] })
  assert.deepEqual(readSavedGame(storage), { version: 1, player: 'b', mode: 'computer', moves: [] })
})

test('corrupt, unsupported, oversized and illegal saves safely start over', () => {
  const invalid = ['{', 'null', JSON.stringify({ version: 2, player: 'w', mode: 'computer', moves: [] }), JSON.stringify({ version: 1, player: 'x', moves: [] }), JSON.stringify({ version: 1, player: 'w', mode: 'computer', moves: Array(2001).fill(move('e2','e4')) }), JSON.stringify({ version: 1, player: 'w', mode: 'computer', moves: [move('e2','e5')] }), JSON.stringify({ version: 1, player: 'w', mode: 'computer', moves: [move('e2','e4','k')] })]
  for (const raw of invalid) assert.deepEqual(readSavedGame(memory(raw)), emptyGame())
})

test('blocked storage cannot prevent playing', () => {
  assert.deepEqual(readSavedGame({ getItem() { throw new Error('blocked') } }), emptyGame())
  assert.equal(writeSavedGame({ setItem() { throw new Error('quota') } }, emptyGame()), false)
})


test('legacy saves retain their moves and migrate to computer mode', () => {
  const moves = [move('e2','e4')]
  assert.deepEqual(readSavedGame(memory(JSON.stringify({version:1,player:'w',moves}))), {version:1,player:'w',mode:'computer',moves})
})

test('pass-and-play saves retain both turns and reject unknown modes', () => {
  const game = {version:1,player:'w',mode:'pass-play',moves:[move('e2','e4'),move('e7','e5')]}
  const storage = memory()
  assert(writeSavedGame(storage, game))
  assert.deepEqual(readSavedGame(storage), game)
  assert.deepEqual(readSavedGame(memory(JSON.stringify({...game,mode:'online'}))), emptyGame())
})
