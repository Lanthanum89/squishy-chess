import { useState } from 'react'
import type { Color, Move, PieceSymbol, Square } from 'chess.js'
import Piece from './Piece'
import type { useGame } from '../hooks/useGame'

type Game = ReturnType<typeof useGame>

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const PROMOTIONS: PieceSymbol[] = ['q', 'r', 'b', 'n']

export default function Board({ game, flipped }: { game: Game; flipped: boolean }) {
  const [selected, setSelected] = useState<Square | null>(null)
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null)

  const over = game.status.kind !== 'playing'
  const targets: Move[] = selected ? game.legalFrom(selected) : []
  const targetSquares = new Set(targets.map((m) => m.to))
  const checkedKing = game.status.kind === 'playing' && game.status.check ? game.kingSquare(game.turn) : null

  const rows = flipped ? [...game.board].reverse() : game.board

  function onSquare(sq: Square, pieceColor: Color | undefined) {
    if (over || pendingPromo) return
    if (selected && targetSquares.has(sq)) {
      const move = targets.find((m) => m.to === sq)!
      if (move.promotion) {
        setPendingPromo({ from: selected, to: sq })
      } else {
        game.play({ from: selected, to: sq })
        setSelected(null)
      }
      return
    }
    setSelected(pieceColor === game.turn && sq !== selected ? sq : null)
  }

  function choosePromotion(p: PieceSymbol) {
    if (!pendingPromo) return
    game.play({ ...pendingPromo, promotion: p })
    setPendingPromo(null)
    setSelected(null)
  }

  return (
    <div className="relative aspect-square w-full rounded-[2.2rem] bg-white/60 p-[1.6%] shadow-[0_12px_40px_-10px_rgba(224,112,159,0.45)]">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-[1.6rem]">
        {rows.flatMap((row, r) => {
          const cells = flipped ? [...row].reverse() : row
          return cells.map((cell, c) => {
            const file = flipped ? 7 - c : c
            const rank = flipped ? r + 1 : 8 - r
            const sq = `${FILES[file]}${rank}` as Square
            const dark = (file + rank) % 2 === 1
            const isTarget = targetSquares.has(sq)
            const isLast = game.lastMove && (game.lastMove.from === sq || game.lastMove.to === sq)
            const justLanded = game.lastMove?.to === sq
            return (
              <button
                key={sq}
                type="button"
                aria-label={`${sq}${cell ? ` ${cell.color === 'w' ? 'blush' : 'blueberry'} ${cell.type}` : ''}`}
                onClick={() => onSquare(sq, cell?.color)}
                className={`relative flex items-center justify-center p-0 ${dark ? 'bg-lilac-deep/70' : 'bg-cream'}`}
              >
                {isLast && <span className="absolute inset-0 bg-yellow-200/60" />}
                {selected === sq && <span className="absolute inset-0 bg-blush-deep/50" />}
                {checkedKing === sq && <span className="absolute inset-0 bg-red-300/70" />}
                {cell && (
                  <Piece
                    type={cell.type}
                    color={cell.color}
                    className={`relative z-10 h-[88%] w-[88%] ${selected === sq ? 'piece-selected' : ''} ${justLanded ? 'piece-landed' : ''}`}
                  />
                )}
                {isTarget && (
                  <span
                    className={`absolute z-20 rounded-full ${cell ? 'inset-[6%] border-[5px] border-blush-deep/80' : 'h-[28%] w-[28%] bg-blush-deep/70'}`}
                  />
                )}
              </button>
            )
          })
        })}
      </div>

      {pendingPromo && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[2.2rem] bg-white/70 backdrop-blur-sm">
          <div className="flex gap-3 rounded-3xl bg-cream p-4 shadow-xl">
            {PROMOTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => choosePromotion(p)}
                className="h-24 w-24 rounded-2xl bg-blush active:scale-95"
                aria-label={`Promote to ${p}`}
              >
                <Piece type={p} color={game.turn} className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
