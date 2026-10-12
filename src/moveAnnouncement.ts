import type { Move } from 'chess.js'

const SIDES = { w: 'Blush', b: 'Blueberry' } as const
const PIECES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const

export function describeMove(move: Pick<Move, 'color' | 'piece' | 'from' | 'to' | 'flags' | 'captured' | 'promotion'>): string {
  if (move.flags.includes('k') || move.flags.includes('q')) {
    const kingSide = move.flags.includes('k')
    const rank = move.from[1]
    return `${SIDES[move.color]} castled ${kingSide ? 'kingside' : 'queenside'}. King from ${move.from} to ${move.to}; rook from ${kingSide ? 'h' : 'a'}${rank} to ${kingSide ? 'f' : 'd'}${rank}.`
  }
  let text = `${SIDES[move.color]} ${PIECES[move.piece]} from ${move.from} to ${move.to}.`
  if (move.captured) text += ` Captured a ${PIECES[move.captured]}${move.flags.includes('e') ? ' en passant' : ''}.`
  if (move.promotion) text += ` Promoted to a ${PIECES[move.promotion]}.`
  return text
}
