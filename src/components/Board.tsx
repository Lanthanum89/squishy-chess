import { useEffect, useId, useRef, useState } from 'react'
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

  const helpId = useId()
  const [focusSquare, setFocusSquare] = useState<Square>(flipped ? 'h1' : 'a8')
  const squareRefs = useRef(new Map<Square, HTMLButtonElement>())
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
  const selectedPiece = selected ? game.board.flat().find((cell) => cell?.square === selected) : null
  const selectionText = selectedPiece
    ? `${SIDE_NAMES[selectedPiece.color]} ${PIECE_NAMES[selectedPiece.type]} selected. ${targetSquares.size ? `Legal destinations: ${[...targetSquares].join(', ')}.` : 'No legal moves.'}`
    : '' 
  const checkedKing = game.status.kind === 'playing' && game.status.check ? game.kingSquare(game.turn) : null

  const winningKing = game.status.kind === 'checkmate' ? game.kingSquare(game.status.winner) : null

  const rows = flipped ? [...game.board].reverse() : game.board

  function onSquare(sq: Square, pieceColor: Color | undefined, el: HTMLElement) {
    setFocusSquare(sq)
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

  function onSquareKeyDown(e: React.KeyboardEvent, sq: Square) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setUi({ selected: null })
      return
    }
    const file = FILES.indexOf(sq[0])
    const rank = Number(sq[1])
    let row = flipped ? rank - 1 : 8 - rank
    let column = flipped ? 7 - file : file
    switch (e.key) {
      case 'ArrowLeft': column = Math.max(0, column - 1); break
      case 'ArrowRight': column = Math.min(7, column + 1); break
      case 'ArrowUp': row = Math.max(0, row - 1); break
      case 'ArrowDown': row = Math.min(7, row + 1); break
      case 'Home': column = 0; if (e.ctrlKey) row = 0; break
      case 'End': column = 7; if (e.ctrlKey) row = 7; break
      default: return
    }
    e.preventDefault()
    const next = `${FILES[flipped ? 7 - column : column]}${flipped ? row + 1 : 8 - row}` as Square
    setFocusSquare(next)
    squareRefs.current.get(next)?.focus()
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
    <div className="board-frame relative aspect-square w-full rounded-[2.2rem] bg-panel p-[1%] shadow-[0_18px_50px_-14px_var(--board-shadow)]">
      <p id={helpId} className="sr-only">Use arrow keys to move between squares. Enter or Space selects a piece or plays a legal move. Escape clears selection. Home and End move to the row edges. Tab leaves the board.</p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{selectionText}</p>
      <div
        role="group"
        aria-label="Chessboard"
        aria-describedby={helpId}
        inert={promoOpen}
        className="board-grid grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-[1.6rem]"
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
                aria-label={`${label}${selected === sq ? ', selected' : ''}${isTarget ? (cell ? ', legal capture' : ', legal move') : ''}${checkedKing === sq ? ', in check' : ''}`}
                aria-pressed={selected === sq}
                title={cell ? `${SIDE_NAMES[cell.color]} ${PIECE_NAMES[cell.type]}` : undefined}
                data-square={sq}
                tabIndex={focusSquare === sq ? 0 : -1}
                ref={(node) => { if (node) squareRefs.current.set(sq, node); else squareRefs.current.delete(sq) }}
                onFocus={() => setFocusSquare(sq)}
                onKeyDown={(e) => onSquareKeyDown(e, sq)}
                onClick={(e) => onSquare(sq, cell?.color, e.currentTarget)}
                className={`board-square relative flex items-center justify-center p-0 ${dark ? 'bg-square-dark' : 'bg-square-light'}`}
              >
                {c === 0 && (
                  <span aria-hidden="true" className={`pointer-events-none absolute left-[7%] ${r === 0 ? 'top-[16%]' : 'top-[5%]'} z-20 text-xs font-extrabold leading-none ${dark ? 'text-coord-dark' : 'text-coord-light'}`}>
                    {rank}
                  </span>
                )}
                {r === 7 && (
                  <span aria-hidden="true" className={`pointer-events-none absolute bottom-[5%] ${c === 7 ? 'right-[16%]' : 'right-[7%]'} z-20 text-xs font-extrabold leading-none ${dark ? 'text-coord-dark' : 'text-coord-light'}`}>
                    {FILES[file]}
                  </span>
                )}
                {isLast && <span className="absolute inset-0 bg-lastmove/55" />}
                {selected === sq && <span className="absolute inset-0 bg-berry/30" />}
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
                    className={`${cell ? 'capture-target' : 'move-target'} absolute z-20 rounded-full ${cell ? 'inset-[6%] border-[5px] border-berry/85' : 'h-[28%] w-[28%] bg-berry/75'}`}
                  />
                )}
              </button>
            )
          })
        })}
      </div>

      {promo && (
        <div className="promotion-overlay">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose a piece to promote to"
            onKeyDown={onDialogKeyDown}
            className="promotion-dialog"
          >
            <p>Choose your new piece</p>
            <div className="promotion-choices">
            {PROMOTIONS.map((p, i) => (
              <button
                key={p}
                ref={i === 0 ? firstChoiceRef : undefined}
                type="button"
                onClick={() => choosePromotion(p)}
                className="promotion-choice"
                aria-label={`Promote to ${PIECE_NAMES[p]}`}
              >
                <Piece type={p} color={game.turn} />
                <span>{PIECE_NAMES[p]}</span>
              </button>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
