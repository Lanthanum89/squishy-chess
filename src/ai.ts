import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js'

export type Level = 'sleepy' | 'easy' | 'tricky'

export const LEVELS: { id: Level; label: string }[] = [
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'easy', label: 'Easy' },
  { id: 'tricky', label: 'Tricky' },
]

// depth: plies looked ahead (1 = my move only, 2 = also their best reply)
// noise: random pawns-worth of fuzz added to each move's score
// blunder: chance of ignoring the evaluation and playing any legal move
const CONFIG: Record<Level, { depth: 1 | 2; noise: number; blunder: number }> = {
  sleepy: { depth: 1, noise: 6, blunder: 0.75 },
  easy: { depth: 1, noise: 2.5, blunder: 0.3 },
  tricky: { depth: 2, noise: 0.8, blunder: 0.08 },
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

function material(chess: Chess, side: Color): number {
  let score = 0
  for (const row of chess.board())
    for (const cell of row) if (cell) score += (cell.color === side ? 1 : -1) * VALUE[cell.type]
  return score
}

function worstReplyScore(chess: Chess, side: Color): number {
  const replies = chess.moves()
  if (replies.length === 0) return chess.isCheckmate() ? 100 : 0
  let worst = Infinity
  for (const san of replies) {
    chess.move(san)
    // Checkmate is a loss for us, any other finished game is level, otherwise count material
    const score = chess.isCheckmate() ? -100 : chess.isGameOver() ? 0 : material(chess, side)
    worst = Math.min(worst, score)
    chess.undo()
  }
  return worst
}

export function pickMove(fen: string, level: Level): Pick<Move, 'from' | 'to' | 'promotion'> | null {
  const chess = new Chess(fen)
  const side = chess.turn()
  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) return null

  const cfg = CONFIG[level]
  let chosen = moves[Math.floor(Math.random() * moves.length)]

  if (Math.random() >= cfg.blunder) {
    let best = -Infinity
    for (const m of moves) {
      chess.move(m.san)
      const base = cfg.depth === 2 ? worstReplyScore(chess, side) : material(chess, side)
      chess.undo()
      const score = base + Math.random() * cfg.noise
      if (score > best) {
        best = score
        chosen = m
      }
    }
  }
  return { from: chosen.from, to: chosen.to, promotion: chosen.promotion }
}
