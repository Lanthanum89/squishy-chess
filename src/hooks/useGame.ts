import { useEffect, useMemo, useState } from 'react'
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { emptyGame, readSavedGame, writeSavedGame, type GameMode, type MoveInput } from '../gameSave'

export type Status =
  | { kind: 'playing'; turn: Color; check: boolean }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'draw'; reason: string }

export function useGame() {
  const [saved, setSaved] = useState(() => {
    try { return readSavedGame(localStorage) } catch { return emptyGame() }
  })
  const [saveAvailable, setSaveAvailable] = useState(true)
  const { moves, player, mode } = saved

  useEffect(() => {
    try { setSaveAvailable(writeSavedGame(localStorage, saved)) } catch { setSaveAvailable(false) }
  }, [saved])

  const chess = useMemo(() => {
    const c = new Chess()
    for (const m of moves) c.move(m)
    return c
  }, [moves])

  const history = useMemo(() => chess.history({ verbose: true }) as Move[], [chess])
  const lastMove = history.at(-1)

  const status: Status = useMemo(() => {
    if (chess.isCheckmate()) return { kind: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' }
    if (chess.isStalemate()) return { kind: 'draw', reason: 'Stalemate' }
    if (chess.isInsufficientMaterial()) return { kind: 'draw', reason: 'Not enough pieces' }
    if (chess.isThreefoldRepetition()) return { kind: 'draw', reason: 'Repetition' }
    if (chess.isDraw()) return { kind: 'draw', reason: 'Fifty-move rule' }
    return { kind: 'playing', turn: chess.turn(), check: chess.inCheck() }
  }, [chess])

  const captured = useMemo(() => {
    const out: Record<Color, PieceSymbol[]> = { w: [], b: [] }
    for (const m of history) if (m.captured) out[m.color].push(m.captured)
    return out
  }, [history])

  const legalFrom = (sq: Square) => chess.moves({ square: sq, verbose: true }) as Move[]

  const kingSquare = (color: Color): Square | null => {
    for (const row of chess.board())
      for (const cell of row) if (cell && cell.type === 'k' && cell.color === color) return cell.square
    return null
  }

  return {
    player,
    mode,
    history,
    saveAvailable,
    board: chess.board(),
    fen: chess.fen(),
    turn: chess.turn(),
    status,
    lastMove,
    captured,
    moveCount: moves.length,
    legalFrom,
    kingSquare,
    play: (m: MoveInput) => setSaved((prev) => ({ ...prev, moves: [...prev.moves, m] })),
    undo: (count = 1) => setSaved((prev) => ({ ...prev, moves: prev.moves.slice(0, Math.max(0, prev.moves.length - count)) })),
    reset: (side: Color = player, nextMode: GameMode = mode) => setSaved({ version: 1, player: side, mode: nextMode, moves: [] }),
  }
}
