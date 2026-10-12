import { useEffect, useRef, useState } from 'react'
import type { Color, Move, PieceSymbol, Square } from 'chess.js'
import Piece from './Piece'
import type { useGame } from '../hooks/useGame'

type Game = ReturnType<typeof useGame>

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const PROMOTIONS: PieceSymbol[] = ['q', 'r', 'b', 'n']

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}
const SIDE_NAMES: Record<Color, string> = { w: 'Blush', b: 'Blueberry' }

type Ui = {
  fen: string
  selected: Square | null
  promo: { from: Square; to: Square } | null
}

export default function Board({
  game,
  flipped,
  locked,
}: {
  game: Game
  flipped: boolean
  locked: boolean
}) {
  const [stored, setStored] = useState<Ui>({ fen: game.fen, selected: null, promo: null })
  // Interaction state belongs to one position. Reset it whenever the FEN changes (a move, Undo, a new
  // game). Merely ignoring a mismatch is not enough: Undo returns to an earlier FEN and would revive
  // a stale selection or promotion dialog.
  if (stored.fen !== game.fen) setStored({ fen: game.fen, selected: null, promo: null })
  const { selected, promo } = stored.fen === game.fen ? stored : { selected: null, promo: null }
  const setUi = (patch: Partial<Omit<Ui, 'fen'>>) =>
    setStored({ fen: game.fen, selected, promo, ...patch })

  const triggerRef = useRef<HTMLElement | null>(null)
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const promoOpen = promo !== null

  useEffect(() => {
    if (promoOpen) {
      firstChoiceRef.current?.focus()
    } else if (triggerRef.current) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [promoOpen])

  const over = game.status.kind !== 'playing'
  const targets: Move[] = selected ? game.legalFrom(selected) : []
  const targetSquares = new Set(targets.map((m) => m.to))
  const checkedKing = game.status.kind === 'playing' && game.status.check ? game.kingSquare(game.turn) : null

  const winningKing = game.status.kind === 'checkmate' ? game.kingSquare(game.status.winner) : null

  const rows = flipped ? [...game.board].reverse() : game.board

  function onSquare(sq: Square, pieceColor: Color | undefined, el: HTMLElement) {
    if (over || locked || promo) return
    if (selected && targetSquares.has(sq)) {
      const move = targets.find((m) => m.to === sq)!
      if (move.promotion) {
        triggerRef.current = el
        setUi({ promo: { from: selected, to: sq } })
      } else {
        game.play({ from: selected, to: sq })
      }
      return
    }
    setUi({ selected: pieceColor === game.turn && sq !== selected ? sq : null })
  }

  function choosePromotion(p: PieceSymbol) {
    if (!promo) return
    game.play({ ...promo, promotion: p })
  }

  function onDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setUi({ promo: null })
      return
    }
    if (e.key !== 'Tab') return
    const buttons = dialogRef.current?.querySelectorAll('button')
    if (!buttons?.length) return
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="relative aspect-square w-full rounded-[2.2rem] bg-panel/60 p-[1.6%] shadow-[0_12px_40px_-10px_rgba(224,112,159,0.45)]">
      <div
        inert={promoOpen}
        className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-[1.6rem]"
      >
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
            const label = cell
              ? `${sq}, ${SIDE_NAMES[cell.color]} ${PIECE_NAMES[cell.type]}`
              : `${sq}, empty`
            return (
              <button
                key={sq}
                type="button"
                aria-label={label}
                onClick={(e) => onSquare(sq, cell?.color, e.currentTarget)}
                className={`relative flex items-center justify-center p-0 ${dark ? 'bg-square-dark' : 'bg-square-light'}`}
              >
                {isLast && <span className="absolute inset-0 bg-lastmove/60" />}
                {selected === sq && <span className="absolute inset-0 bg-blush-deep/50" />}
                {checkedKing === sq && <span className="absolute inset-0 bg-red-300/70" />}
                {cell && (
                  <Piece
                    type={cell.type}
                    color={cell.color}
                    className={`relative z-10 h-[94%] w-[94%] ${selected === sq ? 'piece-selected' : ''} ${justLanded ? 'piece-landed' : ''} ${winningKing === sq ? 'piece-win' : ''}`}
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

      {promo && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[2.2rem] bg-panel/70 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose a piece to promote to"
            onKeyDown={onDialogKeyDown}
            className="flex gap-3 rounded-3xl bg-cream p-4 shadow-xl"
          >
            {PROMOTIONS.map((p, i) => (
              <button
                key={p}
                ref={i === 0 ? firstChoiceRef : undefined}
                type="button"
                onClick={() => choosePromotion(p)}
                className="h-24 w-24 rounded-2xl bg-blush active:scale-95"
                aria-label={`Promote to ${PIECE_NAMES[p]}`}
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
