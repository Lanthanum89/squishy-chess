import assert from 'node:assert/strict'
import test from 'node:test'
import { Chess } from 'chess.js'
import { describeMove } from '../src/moveAnnouncement.ts'

test('announcements name both sides, squares and captures', () => {
  const chess = new Chess()
  assert.equal(describeMove(chess.move('e4')), 'Blush pawn from e2 to e4.')
  chess.move('d5')
  assert.equal(describeMove(chess.move('exd5')), 'Blush pawn from e4 to d5. Captured a pawn.')
  assert.equal(describeMove(chess.move('Qxd5')), 'Blueberry queen from d8 to d5. Captured a pawn.')
})

test('castling, en passant and promotion are described in full', () => {
  const castle = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
  assert.equal(describeMove(castle.move('O-O')), 'Blush castled kingside. King from e1 to g1; rook from h1 to f1.')
  assert.equal(describeMove(castle.move('O-O-O')), 'Blueberry castled queenside. King from e8 to c8; rook from a8 to d8.')
  const ep = new Chess()
  for (const san of ['e4','a6','e5','d5']) ep.move(san)
  assert.match(describeMove(ep.move('exd6')), /Captured a pawn en passant/)
  const promotion = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1')
  assert.match(describeMove(promotion.move('a8=N')), /Promoted to a knight/)
})
