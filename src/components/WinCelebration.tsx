import { useEffect, useMemo, useRef } from 'react'
import type { Color } from 'chess.js'
import Piece from './Piece'

const COLOURS = ['#ff9ec7', '#ffd86b', '#b7c4ff', '#c9b3ff', '#8fe3c0', '#ffb8d6']
const SHAPES = ['heart', 'star', 'dot'] as const

// Small seeded PRNG so the confetti layout is the same on every render
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function Shape({ shape }: { shape: (typeof SHAPES)[number] }) {
  if (shape === 'heart')
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21s-7-4.6-9.5-9C.9 8.9 2.5 5 6 5c2.1 0 3.4 1.2 4 2.2.6-1 1.9-2.2 4-2.2 3.5 0 5.1 3.9 3.5 7-2.5 4.4-9.5 9-9.5 9z" />
      </svg>
    )
  if (shape === 'star')
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
      </svg>
    )
  return <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>
}

export default function WinCelebration({
  winner,
  onPlayAgain,
  onClose,
}: {
  winner: Color
  onPlayAgain: () => void
  onClose: () => void
}) {
  const confetti = useMemo(() => {
    const rand = mulberry32(2024)
    return Array.from({ length: 56 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      delay: rand() * 2.5,
      duration: 3.5 + rand() * 3,
      size: 14 + rand() * 18,
      drift: (rand() - 0.5) * 160,
      colour: COLOURS[Math.floor(rand() * COLOURS.length)],
      shape: SHAPES[Math.floor(rand() * SHAPES.length)],
    }))
  }, [])

  const playAgainRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    playAgainRef.current?.focus()
    return () => previous?.focus()
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Tab') {
      // Two buttons only: keep focus inside the dialog
      const buttons = e.currentTarget.querySelectorAll('button')
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
  }

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" onKeyDown={onKeyDown}>
      <div className="confetti-layer pointer-events-none absolute inset-0" aria-hidden="true">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="confetti-piece absolute top-0"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size,
              color: c.colour,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              ['--drift' as string]: `${c.drift}px`,
            }}
          >
            <Shape shape={c.shape} />
          </span>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-panel/40 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="win-title"
          className="win-card flex w-full max-w-sm flex-col items-center gap-3 rounded-[2rem] bg-cream p-6 text-center shadow-2xl"
        >
          <Piece type="k" color={winner} className="win-bounce h-36 w-36" />
          <h2 id="win-title" className="text-4xl font-extrabold leading-tight">
            You win!
          </h2>
          <p className="text-lg font-semibold">Checkmate. Well played!</p>
          <div className="mt-2 grid w-full grid-cols-2 gap-3">
            <button
              ref={playAgainRef}
              type="button"
              onClick={onPlayAgain}
              className="rounded-2xl bg-blush-deep px-3 py-4 text-lg font-bold active:scale-95"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-blush px-3 py-4 text-lg font-bold active:scale-95"
            >
              See the board
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
